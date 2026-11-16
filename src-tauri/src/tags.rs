use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;

use tauri::{AppHandle, Manager};

/// 项目类型标签元数据：以项目文件夹绝对路径为键，值为标准化的标签 id
/// （如 `android` / `web` / `linux`）。持久化为 JSON，独立于项目本身，
/// 应用重启后仍按路径还原每个项目的标签。
fn tags_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("无法定位配置目录：{e}"))?;
    Ok(dir.join("project_tags.json"))
}

/// 读取全部标签；文件缺失或解析失败时返回空映射。
pub fn load(app: &AppHandle) -> BTreeMap<String, String> {
    let Ok(path) = tags_file(app) else {
        return BTreeMap::new();
    };
    fs::read_to_string(path)
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default()
}

/// 查询某项目路径的标签（Windows 路径大小写不敏感）。
pub fn tag_of(tags: &BTreeMap<String, String>, path: &str) -> Option<String> {
    tags.iter()
        .find(|(key, _)| key.eq_ignore_ascii_case(path))
        .map(|(_, value)| value.clone())
}

fn save(app: &AppHandle, tags: &BTreeMap<String, String>) -> Result<(), String> {
    let path = tags_file(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("无法创建配置目录：{e}"))?;
    }
    let text = serde_json::to_string_pretty(tags).map_err(|e| format!("标签序列化失败：{e}"))?;
    fs::write(&path, text).map_err(|e| format!("标签写入失败：{e}"))
}

/// 设置某项目的类型标签；标签 id 为空则清除该项目的标签。
/// 先移除该路径的旧键再写入，确保每个项目只保留一个标签。
pub fn set(app: &AppHandle, path: &str, tag: &str) -> Result<(), String> {
    let mut tags = load(app);
    tags.retain(|key, _| !key.eq_ignore_ascii_case(path));

    let trimmed = tag.trim();
    if !trimmed.is_empty() {
        tags.insert(path.to_string(), trimmed.to_string());
    }
    save(app, &tags)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tag_lookup_is_case_insensitive() {
        let mut tags = BTreeMap::new();
        tags.insert("D:\\Projects\\App".to_string(), "android".to_string());
        assert_eq!(tag_of(&tags, "d:\\projects\\app").as_deref(), Some("android"));
        assert_eq!(tag_of(&tags, "D:\\Projects\\Other"), None);
    }
}
