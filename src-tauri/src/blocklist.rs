use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

/// 项目屏蔽黑名单，持久化为独立配置文件 blocklist.toml。
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct Blocklist {
    /// 被屏蔽的项目文件夹绝对路径
    pub blocked: Vec<String>,
}

impl Blocklist {
    /// 判断路径是否已被屏蔽（Windows 路径大小写不敏感）。
    pub fn contains(&self, path: &str) -> bool {
        self.blocked.iter().any(|item| item.eq_ignore_ascii_case(path))
    }
}

fn blocklist_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("无法定位配置目录：{e}"))?;
    Ok(dir.join("blocklist.toml"))
}

/// 读取黑名单；文件缺失或解析失败时回退为空列表。
pub fn load(app: &AppHandle) -> Blocklist {
    let Ok(path) = blocklist_file(app) else {
        return Blocklist::default();
    };
    fs::read_to_string(path)
        .ok()
        .and_then(|text| toml::from_str(&text).ok())
        .unwrap_or_default()
}

/// 写入黑名单，必要时创建目录。
pub fn save(app: &AppHandle, blocklist: &Blocklist) -> Result<(), String> {
    let path = blocklist_file(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("无法创建配置目录：{e}"))?;
    }
    let text = toml::to_string_pretty(blocklist).map_err(|e| format!("黑名单序列化失败：{e}"))?;
    fs::write(&path, text).map_err(|e| format!("黑名单写入失败：{e}"))
}

/// 将路径加入黑名单并保存；已存在时不重复添加。
pub fn add(app: &AppHandle, path: &str) -> Result<(), String> {
    let mut blocklist = load(app);
    if !blocklist.contains(path) {
        blocklist.blocked.push(path.to_string());
        save(app, &blocklist)?;
    }
    Ok(())
}

/// 将路径从黑名单移除并保存；不存在时不做任何写入。
pub fn remove(app: &AppHandle, path: &str) -> Result<(), String> {
    let mut blocklist = load(app);
    let before = blocklist.blocked.len();
    blocklist
        .blocked
        .retain(|item| !item.eq_ignore_ascii_case(path));
    if blocklist.blocked.len() != before {
        save(app, &blocklist)?;
    }
    Ok(())
}
