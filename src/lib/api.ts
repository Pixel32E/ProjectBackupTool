import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import type {
  AppConfig,
  BackupList,
  CompressOutcome,
  DeviceListResult,
  ProgressPayload,
  ProjectScan,
  RestoreOutcome,
  RootKind,
} from "./types";

/** 是否运行在 Tauri 宿主中（浏览器预览时为 false，走本地模拟数据） */
export const isDesktop =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

type ProgressHandler = (payload: ProgressPayload) => void;
let previewHandler: ProgressHandler | null = null;

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (isDesktop) {
    return invoke<T>(command, args);
  }
  if (!import.meta.env.DEV) {
    throw new Error("当前环境无法调用本地命令");
  }
  const preview = await import("./preview");
  return preview.invokePreview(command, args) as Promise<T>;
}

/** 订阅后端进度事件（浏览器预览时由本地模拟回传） */
export async function onProgress(handler: ProgressHandler): Promise<void> {
  if (isDesktop) {
    await listen<ProgressPayload>("job-progress", (event) => handler(event.payload));
    return;
  }
  previewHandler = handler;
}

/** 浏览器预览模式下回传模拟进度 */
export function emitPreviewProgress(payload: ProgressPayload): void {
  previewHandler?.(payload);
}

export const loadConfig = () => call<AppConfig>("load_config");

export const saveConfig = (config: AppConfig) => call<void>("save_config", { config });

export const chooseRoot = (kind: RootKind) =>
  call<AppConfig | null>("choose_root", { kind });

export const listProjects = (root: string | null) =>
  call<ProjectScan>("list_projects", { root });

export const blockProject = (path: string) => call<void>("block_project", { path });

export const listBlocked = () => call<string[]>("list_blocked");

export const unblockProject = (path: string) => call<void>("unblock_project", { path });

export const listBackups = () => call<BackupList>("list_backups");

export const backupProject = (projectPath: string, fileName: string) =>
  call<CompressOutcome>("backup_project", { projectPath, fileName });

export const restoreBackup = (filePath: string, overwrite: boolean) =>
  call<RestoreOutcome>("restore_backup", { filePath, overwrite });

export const deleteBackup = (filePath: string) => call<void>("delete_backup", { filePath });

export const revealPath = (path: string) => call<void>("reveal_path", { path });

export const listDevices = () => call<DeviceListResult>("list_devices");

export const sendToDevice = (deviceId: string, deviceName: string, filePath: string) =>
  call<void>("send_to_device", { deviceId, deviceName, filePath });