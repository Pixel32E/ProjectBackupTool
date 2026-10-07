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
  /** 唯一可选择的项目根目录 */
  project_root: string | null;
  compression: CompressionSettings;
}

/** 标准化的项目类型标签 */
export interface ProjectTag {
  /** 持久化存储的标签 id */
  id: string;
  label: string;
}

/** 标准化的项目类型标签集：每个项目仅可标记其中一种 */
export const PROJECT_TAGS: ProjectTag[] = [
  { id: "android", label: "Android" },
  { id: "web", label: "Web" },
  { id: "linux", label: "Linux" },
  { id: "windows", label: "Windows" },
];

/** 将标签 id 转为展示文案；未知 id 原样返回，空值返回 null。 */
export function tagLabelOf(id: string | null): string | null {
  if (!id) return null;
  return PROJECT_TAGS.find((tag) => tag.id === id)?.label ?? id;
}

export interface ProjectEntry {
  name: string;
  path: string;
  /** 项目类型标签 id；未标记时为 null */
  tag: string | null;
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
  /** 用户备注的名称/版本说明；无备注时为 null，界面回退显示项目名 */
  remark: string | null;
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