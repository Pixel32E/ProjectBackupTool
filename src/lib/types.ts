/** 压缩设置：对应 LZ4 帧格式支持的参数 */
export interface CompressionSettings {
  /** 块大小："64KB" | "256KB" | "1MB" | "4MB" */
  block_size: string;
  /** 块链接：前序块作为字典参与压缩 */
  block_linked: boolean;
  /** 内容校验和 */
  content_checksum: boolean;
  /** 块校验和 */
  block_checksum: boolean;
}

/** 应用配置（持久化为 TOML） */
export interface AppConfig {
  windows_root: string | null;
  android_root: string | null;
  compression: CompressionSettings;
}

export interface ProjectEntry {
  name: string;
  path: string;
}

export interface ProjectScan {
  root: string;
  exists: boolean;
  items: ProjectEntry[];
}

export interface BackupEntry {
  file_path: string;
  file_name: string;
  project_name: string;
  size: number;
  /** Unix 毫秒 */
  modified: number;
}

export interface BackupList {
  folder: string;
  items: BackupEntry[];
}

export interface CompressOutcome {
  file_path: string;
  skipped: string[];
}

export interface RestoreOutcome {
  status: "conflict" | "restored";
  target: string;
}

export interface KdeDevice {
  id: string;
  name: string;
}

export interface DeviceListResult {
  cli_found: boolean;
  devices: KdeDevice[];
}

export interface ProgressPayload {
  job: string;
  percent: number;
  message: string;
}

export type RootKind = "windows" | "android";