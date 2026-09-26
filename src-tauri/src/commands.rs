use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tauri_plugin_dialog::DialogExt;

use crate::archive::{self, BackupList, CompressOutcome};
use crate::config::{self, Config};
use crate::kdeconnect::{self, DeviceListResult};

/// 进度事件载荷，通过 `job-progress` 事件推送到前端。
#[derive(Clone, Serialize)]
struct ProgressPayload {
    job: &'static str,
    percent: u32,
    message: String,
}

fn emit_progress(app: &AppHandle, job: &'static str, percent: u32, message: String) {
    let _ = app.emit("job-progress", ProgressPayload {
        job,
        percent,
        message,
    });
}

#[derive(Debug, Clone, Serialize)]
pub struct ProjectEntry {
    pub name: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProjectScan {
    pub root: String,
    pub exists: bool,
    pub items: Vec<ProjectEntry>,
}

#[derive(Debug, Clone, Serialize)]
pub struct RestoreOutcome {
    /// "conflict"：目标已存在且未确认覆盖；"restored"：恢复完成
    pub status: &'static str,
    pub target: String,
}

#[tauri::command]
pub fn load_config(app: AppHandle) -> Config {
    config::load(&app)
}

#[tauri::command]
pub fn save_config(app: AppHandle, config: Config) -> Result<(), String> {
    config::save(&app, &config)
}

/// 弹出系统文件夹选择框并把结果写入配置；取消时返回 None。
#[tauri::command]
pub async fn choose_root(app: AppHandle, kind: String) -> Result<Option<Config>, String> {
    let is_android = kind == "android";
    let title = if is_android {
        "选择 Android 项目根目录"
    } else {
        "选择 Windows 项目根目录"
    };

    let dialog_app = app.clone();
    let picked = tauri::async_runtime::spawn_blocking(move || {
        dialog_app
            .dialog()
            .file()
            .set_title(title)
            .blocking_pick_folder()
            .and_then(|folder| folder.into_path().ok())
            .map(|path| path.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| format!("文件夹选择失败：{e}"))?;

    let Some(path) = picked else {
        return Ok(None);
    };

    let mut config = config::load(&app);
    if is_android {
        config.android_root = Some(path);
    } else {
        config.windows_root = Some(path);
    }
    config::save(&app, &config)?;
    Ok(Some(config))
}

/// 扫描根目录下的一级子目录作为待备份项目。
#[tauri::command]
pub async fn list_projects(root: Option<String>) -> Result<ProjectScan, String> {
    tauri::async_runtime::spawn_blocking(move || scan_projects(root))
        .await
        .map_err(|e| format!("扫描项目目录失败：{e}"))
}

fn scan_projects(root: Option<String>) -> ProjectScan {
    let Some(root) = root.filter(|r| !r.trim().is_empty()) else {
        return ProjectScan {
            root: String::new(),
            exists: false,
            items: Vec::new(),
        };
    };

    let path = Path::new(&root);
    if !path.is_dir() {
        return ProjectScan {
            root,
            exists: false,
            items: Vec::new(),
        };
    }

    let mut items = Vec::new();
    if let Ok(dir) = std::fs::read_dir(path) {
        for entry in dir.flatten() {
            if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                items.push(ProjectEntry {
                    name: entry.file_name().to_string_lossy().to_string(),
                    path: entry.path().to_string_lossy().to_string(),
                });
            }
        }
    }
    items.sort_by_key(|item| item.name.to_lowercase());

    ProjectScan {
        root,
        exists: true,
        items,
    }
}

#[tauri::command]
pub async fn list_backups(app: AppHandle) -> Result<BackupList, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let folder = archive::resolve_backup_folder(&app)?;
        archive::list_backups(&folder)
    })
    .await
    .map_err(|e| format!("读取备份列表失败：{e}"))?
}

/// 压缩项目目录并写入备份文件；返回被跳过的文件列表。
#[tauri::command]
pub async fn backup_project(
    app: AppHandle,
    project_path: String,
    file_name: String,
) -> Result<CompressOutcome, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let folder = archive::resolve_backup_folder(&app)?;
        let destination = folder.join(&file_name);
        let settings = config::load(&app).compression;
        let progress_app = app.clone();

        archive::compress_folder(
            Path::new(&project_path),
            &destination,
            &settings,
            move |percent, message| emit_progress(&progress_app, "backup", percent, message),
        )
    })
    .await
    .map_err(|e| format!("备份任务异常：{e}"))?
}

/// 恢复备份：目标已存在时先返回 conflict，由前端确认后带 overwrite 再次调用。
#[tauri::command]
pub async fn restore_backup(
    app: AppHandle,
    file_path: String,
    overwrite: bool,
) -> Result<RestoreOutcome, String> {
    let archive_path = PathBuf::from(&file_path);
    if !archive_path.is_file() {
        return Err("备份文件不存在".into());
    }

    let config = config::load(&app);
    let project_name = archive::project_name_of(
        archive_path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default()
            .as_str(),
    );

    let windows_root = config
        .windows_root
        .as_deref()
        .filter(|path| Path::new(path).is_dir());
    let android_root = config
        .android_root
        .as_deref()
        .filter(|path| Path::new(path).is_dir());

    if windows_root.is_none() && android_root.is_none() {
        return Err("请先设置有效的项目根目录".into());
    }

    // Android 根目录下存在同名项目时恢复到 Android，否则优先 Windows 根目录
    let target_root = match (android_root, windows_root) {
        (Some(android), Some(windows)) => {
            if Path::new(android).join(&project_name).exists() {
                PathBuf::from(android)
            } else {
                PathBuf::from(windows)
            }
        }
        (Some(android), None) => PathBuf::from(android),
        (None, Some(windows)) => PathBuf::from(windows),
        (None, None) => unreachable!(),
    };
    let target = target_root.join(&project_name);

    if target.exists() {
        if !overwrite {
            return Ok(RestoreOutcome {
                status: "conflict",
                target: target.to_string_lossy().to_string(),
            });
        }
        // 原文件夹移入回收站，可还原
        trash::delete(&target).map_err(|e| format!("移动原文件夹到回收站失败：{e}"))?;
    }

    let target_text = target.to_string_lossy().to_string();
    tauri::async_runtime::spawn_blocking(move || {
        let progress_app = app.clone();
        archive::extract_folder(&archive_path, &target, move |percent, message| {
            emit_progress(&progress_app, "restore", percent, message)
        })
    })
    .await
    .map_err(|e| format!("恢复任务异常：{e}"))??;

    Ok(RestoreOutcome {
        status: "restored",
        target: target_text,
    })
}

#[tauri::command]
pub async fn delete_backup(file_path: String) -> Result<(), String> {
    let path = PathBuf::from(&file_path);
    if !path.is_file() {
        return Err("备份文件不存在".into());
    }
    std::fs::remove_file(&path).map_err(|e| format!("删除失败：{e}"))
}

/// 在资源管理器中定位并选中文件或文件夹。
#[tauri::command]
pub async fn reveal_path(path: String) -> Result<(), String> {
    if path.trim().is_empty() {
        return Err("路径未设置".into());
    }
    // explorer 初始化可能阻塞，放到后台线程执行
    tauri::async_runtime::spawn_blocking(move || {
        tauri_plugin_opener::reveal_item_in_dir(&path)
            .map_err(|e| format!("无法打开资源管理器：{e}"))
    })
    .await
    .map_err(|e| format!("打开资源管理器失败：{e}"))?
}

#[tauri::command]
pub async fn list_devices() -> Result<DeviceListResult, String> {
    tauri::async_runtime::spawn_blocking(kdeconnect::list_devices)
        .await
        .map_err(|e| format!("设备检测异常：{e}"))?
}

#[tauri::command]
pub async fn send_to_device(
    app: AppHandle,
    device_id: String,
    device_name: String,
    file_path: String,
) -> Result<(), String> {
    if !Path::new(&file_path).is_file() {
        return Err("备份文件不存在".into());
    }

    emit_progress(
        &app,
        "send",
        0,
        format!("正在发送到 {device_name}，请在设备上确认接收"),
    );

    let id = device_id.clone();
    let file = file_path.clone();
    let sent = tauri::async_runtime::spawn_blocking(move || kdeconnect::send_file(&id, &file))
        .await
        .map_err(|e| format!("发送任务异常：{e}"))??;

    if sent {
        emit_progress(&app, "send", 100, format!("已发送到 {device_name}"));
        Ok(())
    } else {
        Err("发送失败，请确认 KDE Connect 正在运行且设备处于连接状态".into())
    }
}