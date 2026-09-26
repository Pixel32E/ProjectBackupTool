use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

/// 压缩设置：直接对应 LZ4 帧格式支持的参数。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct CompressionSettings {
    /// 块大小："64KB" | "256KB" | "1MB" | "4MB"
    pub block_size: String,
    /// 块链接：前序块作为字典参与压缩，压缩率更高
    pub block_linked: bool,
    /// 内容校验和：整体数据的 xxHash 校验
    pub content_checksum: bool,
    /// 块校验和：逐块校验
    pub block_checksum: bool,
}

impl Default for CompressionSettings {
    fn default() -> Self {
        Self {
            block_size: "1MB".into(),
            block_linked: true,
            content_checksum: true,
            block_checksum: false,
        }
    }
}

/// 应用配置，持久化为 TOML。
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct Config {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub windows_root: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub android_root: Option<String>,
    pub compression: CompressionSettings,
}

fn config_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("无法定位配置目录：{e}"))?;
    Ok(dir.join("config.toml"))
}

/// 读取配置；文件缺失或解析失败时回退到默认值。
pub fn load(app: &AppHandle) -> Config {
    let Ok(path) = config_file(app) else {
        return Config::default();
    };
    fs::read_to_string(path)
        .ok()
        .and_then(|text| toml::from_str(&text).ok())
        .unwrap_or_default()
}

/// 写入配置，必要时创建目录。
pub fn save(app: &AppHandle, config: &Config) -> Result<(), String> {
    let path = config_file(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("无法创建配置目录：{e}"))?;
    }
    let text = toml::to_string_pretty(config).map_err(|e| format!("配置序列化失败：{e}"))?;
    fs::write(&path, text).map_err(|e| format!("配置写入失败：{e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn config_toml_roundtrip() {
        let config = Config {
            windows_root: Some("D:\\Projects".into()),
            android_root: None,
            compression: CompressionSettings::default(),
        };

        let text = toml::to_string_pretty(&config).unwrap();
        assert!(text.contains("windows_root"));
        assert!(!text.contains("android_root"));
        assert!(text.contains("[compression]"));

        let parsed: Config = toml::from_str(&text).unwrap();
        assert_eq!(parsed.windows_root.as_deref(), Some("D:\\Projects"));
        assert_eq!(parsed.android_root, None);
        assert_eq!(parsed.compression.block_size, "1MB");
        assert!(parsed.compression.block_linked);
    }

    #[test]
    fn missing_fields_fall_back_to_defaults() {
        let parsed: Config = toml::from_str("android_root = \"E:\\\\Android\"").unwrap();
        assert_eq!(parsed.android_root.as_deref(), Some("E:\\Android"));
        assert_eq!(parsed.windows_root, None);
        assert_eq!(parsed.compression.block_size, "1MB");
        assert!(parsed.compression.content_checksum);
        assert!(!parsed.compression.block_checksum);
    }
}