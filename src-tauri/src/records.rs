use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;

use tauri::{AppHandle, Manager};

/// 备份记录备注元数据：以备份文件名（如 `项目名_yyMMddHHmm.lz4`）为键，
/// 值为该条记录的备注/名称。持久化为 JSON，不影响真正的 .lz4 文件，
/// 因此备份文件本身及其名称保持稳定（恢复时依赖名称反推项目名）。
///
/// 同一项目可存在多条备份记录，用户通过「重命名」为每条记录打上
/// 版本说明备注，便于区分各版本变动。
fn records_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("无法定位配置目录：{e}"))?;
    Ok(dir.join("backup_records.json"))
}

/// 读取全部备注；文件缺失或解析失败时返回空映射。
pub fn load(app: &AppHandle) -> BTreeMap<String, String> {
    let Ok(path) = records_file(app) else {
        return BTreeMap::new();
    };
    fs::read_to_string(path)
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default()
}

fn save(app: &AppHandle, records: &BTreeMap<String, String>) -> Result<(), String> {
    let path = records_file(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("无法创建配置目录：{e}"))?;
    }
    let text =
        serde_json::to_string_pretty(records).map_err(|e| format!("备注序列化失败：{e}"))?;
    fs::write(&path, text).map_err(|e| format!("备注写入失败：{e}"))
}

/// 设置某条备份记录的备注；备注为空（去空白后）则移除该记录，恢复为项目名。
pub fn rename(app: &AppHandle, file_name: &str, remark: &str) -> Result<(), String> {
    let mut records = load(app);
    let trimmed = remark.trim();
    if trimmed.is_empty() {
        records.remove(file_name);
    } else {
        records.insert(file_name.to_string(), trimmed.to_string());
    }
    save(app, &records)
}