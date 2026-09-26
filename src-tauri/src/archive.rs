use std::fs::{self, File};
use std::io::{BufReader, BufWriter, Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::UNIX_EPOCH;

use lz4_flex::frame::{BlockMode, BlockSize, FrameDecoder, FrameEncoder, FrameInfo};
use serde::Serialize;
use tauri::{AppHandle, Manager};
use walkdir::WalkDir;

use crate::config::CompressionSettings;

/// LZ4 帧格式魔数（小端 0x184D2204）。
const LZ4_FRAME_MAGIC: [u8; 4] = [0x04, 0x22, 0x4D, 0x18];

/// 备份列表中的一条记录。
#[derive(Debug, Clone, Serialize)]
pub struct BackupEntry {
    pub file_path: String,
    pub file_name: String,
    pub project_name: String,
    pub size: u64,
    /// 修改时间（Unix 毫秒）
    pub modified: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct BackupList {
    pub folder: String,
    pub items: Vec<BackupEntry>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CompressOutcome {
    pub file_path: String,
    /// 被占用或不可读而跳过的文件（相对路径）
    pub skipped: Vec<String>,
}

/// 备份目录：存在 D 盘时使用 `D:\Projects-Backup`，否则使用「文档\Projects-Backup」。
pub fn resolve_backup_folder(app: &AppHandle) -> Result<PathBuf, String> {
    let folder = if Path::new("D:\\").is_dir() {
        PathBuf::from("D:\\Projects-Backup")
    } else {
        app.path()
            .document_dir()
            .map_err(|e| format!("无法定位文档目录：{e}"))?
            .join("Projects-Backup")
    };
    fs::create_dir_all(&folder).map_err(|e| format!("无法创建备份目录：{e}"))?;
    Ok(folder)
}

/// 扫描备份目录中的 .lz4 文件，按修改时间倒序返回。
pub fn list_backups(folder: &Path) -> Result<BackupList, String> {
    let mut items = Vec::new();

    if folder.is_dir() {
        let dir = fs::read_dir(folder).map_err(|e| format!("无法读取备份目录：{e}"))?;
        for entry in dir.flatten() {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            let is_lz4 = path
                .extension()
                .is_some_and(|ext| ext.eq_ignore_ascii_case("lz4"));
            if !is_lz4 {
                continue;
            }

            let Ok(meta) = entry.metadata() else { continue };
            let modified = meta
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0);
            let file_name = entry.file_name().to_string_lossy().to_string();

            items.push(BackupEntry {
                project_name: project_name_of(&file_name),
                file_path: path.to_string_lossy().to_string(),
                file_name,
                size: meta.len(),
                modified,
            });
        }
    }

    items.sort_by(|a, b| b.modified.cmp(&a.modified));
    Ok(BackupList {
        folder: folder.to_string_lossy().to_string(),
        items,
    })
}

/// 从备份文件名解析项目名：`项目名_yyMMddHHmm.lz4`；后缀不符合规则时回退为整个文件名。
pub fn project_name_of(file_name: &str) -> String {
    let stem = file_name
        .strip_suffix(".lz4")
        .or_else(|| file_name.strip_suffix(".LZ4"))
        .unwrap_or(file_name);

    if let Some((head, tail)) = stem.rsplit_once('_') {
        let numeric = !tail.is_empty()
            && tail.chars().all(|c| c.is_ascii_digit())
            && (tail.len() == 10 || tail.len() == 14);
        if numeric {
            return head.to_string();
        }
    }
    stem.to_string()
}

/// 将压缩设置映射为 LZ4 帧参数。
fn frame_info(settings: &CompressionSettings) -> FrameInfo {
    let block_size = match settings.block_size.as_str() {
        "64KB" => BlockSize::Max64KB,
        "256KB" => BlockSize::Max256KB,
        "4MB" => BlockSize::Max4MB,
        _ => BlockSize::Max1MB,
    };
    FrameInfo::new()
        .block_size(block_size)
        .block_mode(if settings.block_linked {
            BlockMode::Linked
        } else {
            BlockMode::Independent
        })
        .content_checksum(settings.content_checksum)
        .block_checksums(settings.block_checksum)
}

/// 将整个目录打包为 tar 并整体经 LZ4 帧流压缩，输出 `dest_file`。
///
/// - 被占用或不可读的文件会被跳过并记录，不影响其余文件；
/// - 不可访问的子目录与符号链接被忽略；
/// - `on_progress` 按已处理文件数报告进度（0-100）。
pub fn compress_folder<F>(
    source_dir: &Path,
    dest_file: &Path,
    settings: &CompressionSettings,
    mut on_progress: F,
) -> Result<CompressOutcome, String>
where
    F: FnMut(u32, String),
{
    if !source_dir.is_dir() {
        return Err("项目文件夹不存在".into());
    }

    let result = compress_inner(source_dir, dest_file, settings, &mut on_progress);
    if result.is_err() {
        let _ = fs::remove_file(dest_file);
    }
    result
}

fn compress_inner<F>(
    source_dir: &Path,
    dest_file: &Path,
    settings: &CompressionSettings,
    on_progress: &mut F,
) -> Result<CompressOutcome, String>
where
    F: FnMut(u32, String),
{
    let mut entries: Vec<(PathBuf, bool)> = Vec::new();
    for entry in WalkDir::new(source_dir)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|e| e.path() != source_dir)
    {
        entries.push((entry.path().to_path_buf(), entry.file_type().is_dir()));
    }

    let total_files = entries.iter().filter(|(_, is_dir)| !is_dir).count().max(1);
    let mut processed = 0usize;
    let mut last_percent = 0u32;
    let mut skipped = Vec::new();

    let file = File::create(dest_file).map_err(|e| format!("无法创建备份文件：{e}"))?;
    let encoder = FrameEncoder::with_frame_info(frame_info(settings), BufWriter::new(file));
    let mut builder = tar::Builder::new(encoder);
    builder.follow_symlinks(false);

    for (path, is_dir) in &entries {
        let Ok(relative) = path.strip_prefix(source_dir) else {
            continue;
        };

        if *is_dir {
            // 保留空目录结构
            if builder.append_dir(relative, path).is_err() {
                continue;
            }
        } else {
            let mut source = match File::open(path) {
                Ok(f) => f,
                Err(_) => {
                    skipped.push(relative.to_string_lossy().replace('\\', "/"));
                    continue;
                }
            };
            if let Err(e) = builder.append_file(relative, &mut source) {
                return Err(format!("写入 {relative:?} 失败：{e}"));
            }
        }

        if !is_dir {
            processed += 1;
            let percent = ((processed * 100 / total_files).min(99)) as u32;
            if percent > last_percent {
                last_percent = percent;
                on_progress(percent, format!("已处理 {processed}/{total_files} 个文件"));
            }
        }
    }

    builder
        .finish()
        .map_err(|e| format!("写入归档数据失败：{e}"))?;
    let encoder = builder
        .into_inner()
        .map_err(|e| format!("写入归档数据失败：{e}"))?;
    encoder
        .finish()
        .map_err(|e| format!("完成压缩流失败：{e}"))?;

    on_progress(100, format!("已处理 {processed} 个文件"));

    Ok(CompressOutcome {
        file_path: dest_file.to_string_lossy().to_string(),
        skipped,
    })
}

/// 解压备份文件到目标目录，按已读取的压缩字节报告进度（0-100）。
pub fn extract_folder<F>(
    archive_path: &Path,
    destination: &Path,
    mut on_progress: F,
) -> Result<(), String>
where
    F: FnMut(u32, String),
{
    if !archive_path.is_file() {
        return Err("备份文件不存在".into());
    }

    let mut file = File::open(archive_path).map_err(|e| format!("无法打开备份文件：{e}"))?;

    let mut magic = [0u8; 4];
    if file.read_exact(&mut magic).is_err() || magic != LZ4_FRAME_MAGIC {
        return Err("不是有效的备份文件（LZ4 帧头无效）".into());
    }
    // 校验后回到流起始位置，帧解码器需要从魔数开始读取
    file.seek(SeekFrom::Start(0))
        .map_err(|e| format!("无法读取备份文件：{e}"))?;
    let total_bytes = file.metadata().map(|m| m.len()).unwrap_or(0).max(1);

    let counter = Arc::new(AtomicU64::new(0));
    let reader = CountingReader {
        inner: BufReader::new(file),
        counter: Arc::clone(&counter),
    };

    fs::create_dir_all(destination).map_err(|e| format!("无法创建目标目录：{e}"))?;

    let mut archive = tar::Archive::new(FrameDecoder::new(reader));
    archive.set_preserve_mtime(true);
    archive.set_preserve_permissions(false);
    archive.set_overwrite(true);

    let entries = archive
        .entries()
        .map_err(|e| format!("读取归档失败：{e}"))?;

    let mut restored = 0usize;
    let mut last_percent = 0u32;
    for entry in entries {
        let mut entry = entry.map_err(|e| format!("读取归档条目失败：{e}"))?;
        entry
            .unpack_in(destination)
            .map_err(|e| format!("写入目标目录失败：{e}"))?;
        restored += 1;

        let read = counter.load(Ordering::Relaxed);
        let percent = (((read * 100) / total_bytes).min(99)) as u32;
        if percent > last_percent {
            last_percent = percent;
            on_progress(percent, format!("已还原 {restored} 个条目"));
        }
    }

    on_progress(100, format!("已还原 {restored} 个条目"));
    Ok(())
}

/// 统计底层文件已读取字节数的包装读取器。
struct CountingReader<R> {
    inner: R,
    counter: Arc<AtomicU64>,
}

impl<R: Read> Read for CountingReader<R> {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let read = self.inner.read(buf)?;
        self.counter.fetch_add(read as u64, Ordering::Relaxed);
        Ok(read)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compress_and_extract_roundtrip() {
        let base = std::env::temp_dir().join(format!("project-backup-test-{}", std::process::id()));
        let source = base.join("source");
        let restored = base.join("restored");
        let _ = fs::remove_dir_all(&base);

        fs::create_dir_all(source.join("nested/deep")).unwrap();
        fs::create_dir_all(source.join("empty")).unwrap();
        fs::write(source.join("readme.txt"), b"hello backup").unwrap();
        fs::write(source.join("nested/deep/payload.bin"), vec![42u8; 200_000]).unwrap();

        let archive = base.join("sample_2609261430.lz4");
        let settings = CompressionSettings::default();

        let outcome = compress_folder(&source, &archive, &settings, |_, _| {}).unwrap();
        assert!(outcome.skipped.is_empty());
        assert!(archive.is_file());

        extract_folder(&archive, &restored, |_, _| {}).unwrap();
        assert_eq!(
            fs::read_to_string(restored.join("readme.txt")).unwrap(),
            "hello backup"
        );
        assert_eq!(
            fs::read(restored.join("nested/deep/payload.bin")).unwrap().len(),
            200_000
        );
        assert!(restored.join("empty").is_dir());

        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn rejects_invalid_archive() {
        let base = std::env::temp_dir().join(format!("project-backup-bad-{}", std::process::id()));
        let _ = fs::remove_dir_all(&base);
        fs::create_dir_all(&base).unwrap();

        let fake = base.join("fake.lz4");
        fs::write(&fake, b"not an lz4 frame at all").unwrap();
        assert!(extract_folder(&fake, &base.join("out"), |_, _| {}).is_err());

        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn parses_project_name_from_file_name() {
        assert_eq!(project_name_of("Aurora_2609261430.lz4"), "Aurora");
        assert_eq!(project_name_of("My_App_20260926143000.lz4"), "My_App");
        assert_eq!(project_name_of("plain-name.lz4"), "plain-name");
        assert_eq!(project_name_of("draft_notes.lz4"), "draft_notes");
    }
}