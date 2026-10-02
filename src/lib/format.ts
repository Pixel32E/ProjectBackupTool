/** 格式化文件大小：1536 → "1.5 KB" */
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 100 || unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

/** 格式化时间戳（Unix 毫秒）："2026/09/26 14:30:05" */
export function formatDateTime(ms: number): string {
  if (!ms) return "—";
  const date = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/** 压缩展示长路径：`D:\A\B\C` → `D:\…\B\C`（仅用于窄容器，完整路径放 title） */
export function compactPath(path: string, tail = 2): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  if (parts.length <= tail + 1) return path;
  return `${parts[0]}\\…\\${parts.slice(-tail).join("\\")}`;
}

/** 生成备份文件名：`{项目名}_{yyMMddHHmm}.tar.lz4` */
export function buildBackupFileName(projectName: string, date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${String(date.getFullYear()).slice(2)}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `${projectName}_${stamp}.tar.lz4`;
}