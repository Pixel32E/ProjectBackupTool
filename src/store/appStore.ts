import { useSyncExternalStore } from "react";

import * as api from "../lib/api";
import { buildBackupFileName } from "../lib/format";
import type {
  AppConfig,
  BackupEntry,
  CompressionSettings,
  KdeDevice,
  ProjectEntry,
} from "../lib/types";
import { alertDialog, confirmDialog, notify, openPrompt } from "./uiStore";

export interface JobState {
  active: boolean;
  label: string;
  percent: number;
  detail: string;
  indeterminate: boolean;
}

export interface AppState {
  ready: boolean;
  config: AppConfig | null;
  backupFolder: string;
  projectRootExists: boolean;
  projects: ProjectEntry[];
  backups: BackupEntry[];
  blocked: string[];
  /** 项目列表的类型标签筛选；null 表示显示全部 */
  activeTag: string | null;
  selectedProjectPath: string | null;
  selectedBackupPath: string | null;
  busy: boolean;
  settingsOpen: boolean;
  job: JobState;
}

export interface DevicesState {
  loading: boolean;
  cliFound: boolean;
  error: string;
  items: KdeDevice[];
}

const emptyJob: JobState = {
  active: false,
  label: "",
  percent: 0,
  detail: "",
  indeterminate: true,
};

let state: AppState = {
  ready: false,
  config: null,
  backupFolder: "",
  projectRootExists: false,
  projects: [],
  backups: [],
  blocked: [],
  activeTag: null,
  selectedProjectPath: null,
  selectedBackupPath: null,
  busy: false,
  settingsOpen: false,
  job: emptyJob,
};

let devices: DevicesState = {
  loading: false,
  cliFound: true,
  error: "",
  items: [],
};

const stateListeners = new Set<() => void>();
const deviceListeners = new Set<() => void>();

export function getState(): AppState {
  return state;
}

export function setState(
  patch: Partial<AppState> | ((current: AppState) => Partial<AppState>),
): void {
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  for (const listener of stateListeners) listener();
}

export function getDevicesState(): DevicesState {
  return devices;
}

export function setDevicesState(patch: Partial<DevicesState>): void {
  devices = { ...devices, ...patch };
  for (const listener of deviceListeners) listener();
}

function createSubscribe(listeners: Set<() => void>) {
  return (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
}

const subscribeState = createSubscribe(stateListeners);
const subscribeDevices = createSubscribe(deviceListeners);

/** 订阅全局应用状态；状态对象在每次变更后换新，可安全用于 useSyncExternalStore */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribeState, getState);
}

export function useDevicesState(): DevicesState {
  return useSyncExternalStore(subscribeDevices, getDevicesState);
}

export function selectedProject(current: AppState = state): ProjectEntry | null {
  const path = current.selectedProjectPath;
  if (!path) return null;
  return current.projects.find((project) => project.path === path) ?? null;
}

export function selectedBackup(current: AppState = state): BackupEntry | null {
  const path = current.selectedBackupPath;
  if (!path) return null;
  return current.backups.find((backup) => backup.file_path === path) ?? null;
}

export function canBackup(current: AppState = state): boolean {
  return Boolean(selectedProject(current)) && !current.busy;
}

export function canRestore(current: AppState = state): boolean {
  return Boolean(selectedBackup(current)) && !current.busy;
}

export function canDelete(current: AppState = state): boolean {
  return Boolean(selectedBackup(current)) && !current.busy;
}

/** 当前唯一的项目根目录信息（供工具栏与标题栏展示） */
export function projectRoot(current: AppState = state): {
  path: string | null;
  exists: boolean;
} {
  return { path: current.config?.project_root ?? null, exists: current.projectRootExists };
}

function beginJob(label: string): void {
  setState({
    job: { active: true, label, percent: 0, detail: "", indeterminate: true },
  });
}

function endJob(): void {
  setState((current) => ({ job: { ...current.job, active: false } }));
}

let initPromise: Promise<void> | null = null;

/** 应用初始化；重复调用（如 React 严格模式下重复执行副作用）只生效一次 */
export function init(): Promise<void> {
  if (!initPromise) initPromise = bootstrap();
  return initPromise;
}

async function bootstrap(): Promise<void> {
  try {
    await api.onProgress((payload) => {
      setState((current) => {
        if (!current.job.active) return {};
        return {
          job: {
            ...current.job,
            percent: payload.percent,
            detail: payload.message,
            indeterminate: payload.percent <= 0,
          },
        };
      });
    });

    const [config, backups, blocked] = await Promise.all([
      api.loadConfig(),
      api.listBackups(),
      api.listBlocked(),
    ]);
    setState({
      config,
      backups: backups.items,
      backupFolder: backups.folder,
      blocked,
    });
    await refreshProjects();
    setState({ ready: true });
  } catch (error) {
    notify("error", "初始化失败", String(error));
  }
}

export async function refreshProjects(): Promise<void> {
  const scan = await api.listProjects(getState().config?.project_root ?? null);
  setState({ projects: scan.items, projectRootExists: scan.exists });
}

export async function refreshBackups(): Promise<void> {
  const result = await api.listBackups();
  setState((current) => ({
    backups: result.items,
    backupFolder: result.folder,
    selectedBackupPath:
      current.selectedBackupPath &&
      result.items.some((backup) => backup.file_path === current.selectedBackupPath)
        ? current.selectedBackupPath
        : null,
  }));
}

export async function refreshAll(): Promise<void> {
  try {
    await Promise.all([refreshProjects(), refreshBackups()]);
    notify("info", "列表已刷新", "项目与备份记录已重新扫描");
  } catch (error) {
    notify("error", "刷新失败", String(error));
  }
}

export function selectProject(entry: ProjectEntry): void {
  setState({ selectedProjectPath: entry.path });
}

/** 屏蔽项目文件夹：写入黑名单后刷新列表，该条目不再显示。 */
export async function blockProject(path: string): Promise<void> {
  try {
    await api.blockProject(path);
    setState((current) => ({
      selectedProjectPath: current.selectedProjectPath === path ? null : current.selectedProjectPath,
    }));
    setState({ blocked: await api.listBlocked() });
    await refreshProjects();
    notify("info", "已屏蔽该文件夹", "该条目不再显示于项目列表");
  } catch (error) {
    notify("error", "屏蔽失败", String(error));
  }
}

/** 取消屏蔽：从黑名单移除并刷新列表，该文件夹重新显示。 */
export async function unblockProject(path: string): Promise<void> {
  try {
    await api.unblockProject(path);
    setState({ blocked: await api.listBlocked() });
    await refreshProjects();
    notify("info", "已取消屏蔽", "该文件夹将重新显示于项目列表");
  } catch (error) {
    notify("error", "操作失败", String(error));
  }
}

export function selectBackup(entry: BackupEntry): void {
  setState({ selectedBackupPath: entry.file_path });
}

export async function pickRoot(): Promise<void> {
  try {
    const config = await api.chooseRoot();
    if (!config) return;
    setState({ config, selectedProjectPath: null });
    await refreshProjects();
    notify("info", "根目录已更新", "项目根目录已保存");
  } catch (error) {
    notify("error", "选择目录失败", String(error));
  }
}

/** 设置项目类型标签（单选）；tag 为空字符串时清除标签。 */
export async function setProjectTag(path: string, tag: string): Promise<void> {
  try {
    await api.setProjectTag(path, tag);
    await refreshProjects();
    notify("success", "标签已更新", tag ? "已设置项目类型标签" : "已清除项目标签");
  } catch (error) {
    notify("error", "设置标签失败", String(error));
  }
}

export async function revealPath(path?: string | null): Promise<void> {
  if (!path) {
    notify("warning", "路径未设置", "请先选择对应的项目根目录");
    return;
  }
  try {
    await api.revealPath(path);
  } catch (error) {
    notify("error", "无法打开目录", String(error));
  }
}

export async function backupProject(entry: ProjectEntry): Promise<void> {
  if (getState().busy) {
    notify("info", "请稍候", "当前有操作正在进行");
    return;
  }

  setState({ busy: true });
  beginJob(`正在备份 ${entry.name}`);
  try {
    const outcome = await api.backupProject(entry.path, buildBackupFileName(entry.name));
    await refreshBackups();

    if (outcome.skipped.length > 0) {
      await alertDialog({
        title: "备份完成，部分文件被跳过",
        message: `以下 ${outcome.skipped.length} 个文件被占用或不可读，未写入备份：`,
        details: outcome.skipped.slice(0, 12),
      });
    } else {
      notify("success", "备份完成", `${entry.name} 已写入备份目录`);
    }
  } catch (error) {
    notify("error", "备份失败", String(error));
  } finally {
    endJob();
    setState({ busy: false });
  }
}

export async function backupSelected(): Promise<void> {
  const project = selectedProject();
  if (!project) {
    notify("warning", "未选择项目", "请先在左侧选择一个项目");
    return;
  }
  await backupProject(project);
}

export async function restoreSelected(): Promise<void> {
  const backup = selectedBackup();
  if (!backup) {
    notify("warning", "未选择备份", "请先在右侧选择一条备份记录");
    return;
  }
  if (getState().busy) {
    notify("info", "请稍候", "当前有操作正在进行");
    return;
  }

  setState({ busy: true });
  beginJob(`正在恢复 ${backup.project_name}`);
  try {
    let target = "";
    const first = await api.restoreBackup(backup.file_path, false);

    if (first.status === "conflict") {
      endJob();
      const confirmed = await confirmDialog({
        title: "目标文件夹已存在",
        message: `“${first.target}” 已存在。原文件夹将被移入回收站（可还原），随后恢复该备份。`,
        confirmText: "移入回收站并恢复",
        danger: true,
      });
      if (!confirmed) return;

      beginJob(`正在恢复 ${backup.project_name}`);
      const second = await api.restoreBackup(backup.file_path, true);
      target = second.target;
    } else {
      target = first.target;
    }

    await refreshProjects();
    notify("success", "恢复完成", target);
  } catch (error) {
    notify("error", "恢复失败", String(error));
  } finally {
    endJob();
    setState({ busy: false });
  }
}

export async function deleteSelected(): Promise<void> {
  const backup = selectedBackup();
  if (!backup) {
    notify("warning", "未选择备份", "请先在右侧选择一条备份记录");
    return;
  }
  if (getState().busy) {
    notify("info", "请稍候", "当前有操作正在进行");
    return;
  }

  const confirmed = await confirmDialog({
    title: "删除备份文件",
    message: `确定要删除 “${backup.file_name}” 吗？此操作不可撤销。`,
    confirmText: "删除",
    danger: true,
  });
  if (!confirmed) return;

  setState({ busy: true });
  try {
    await api.deleteBackup(backup.file_path);
    await refreshBackups();
    notify("success", "已删除", backup.file_name);
  } catch (error) {
    notify("error", "删除失败", String(error));
  } finally {
    setState({ busy: false });
  }
}

/** 重命名所选备份记录：弹出输入框设置版本备注，留空则恢复为项目名。 */
export async function renameSelectedBackup(): Promise<void> {
  const backup = selectedBackup();
  if (!backup) {
    notify("warning", "未选择备份", "请先在右侧选择一条备份记录");
    return;
  }
  if (getState().busy) {
    notify("info", "请稍候", "当前有操作正在进行");
    return;
  }

  const value = await openPrompt({
    title: "重命名备份记录",
    message: "给这条备份记录设置一个名称，用于备注各版本变动；留空可恢复为项目名。",
    value: backup.remark ?? backup.project_name,
    placeholder: "例如：v1.2 正式版 / 修复登录崩溃",
    confirmText: "保存",
  });
  if (value === null) return;

  try {
    await api.renameBackup(backup.file_path, value);
    await refreshBackups();
    notify("success", "已重命名", value ? `已备注为“${value}”` : "已恢复为项目名");
  } catch (error) {
    notify("error", "重命名失败", String(error));
  }
}

export async function loadDevices(): Promise<void> {
  if (getDevicesState().loading) return;
  setDevicesState({ loading: true, error: "" });
  try {
    const result = await api.listDevices();
    setDevicesState({ cliFound: result.cli_found, items: result.devices });
  } catch (error) {
    setDevicesState({ error: String(error), items: [] });
  } finally {
    setDevicesState({ loading: false });
  }
}

export async function sendSelected(device: KdeDevice): Promise<void> {
  const backup = selectedBackup();
  if (!backup) {
    notify("warning", "未选择备份", "请先在右侧选择一条备份记录");
    return;
  }
  if (getState().busy) {
    notify("info", "请稍候", "当前有操作正在进行");
    return;
  }

  const confirmed = await confirmDialog({
    title: "发送到设备",
    message: `确定要将 “${backup.file_name}” 发送到 “${device.name}” 吗？`,
    confirmText: "发送",
  });
  if (!confirmed) return;

  setState({ busy: true });
  beginJob(`正在发送到 ${device.name}`);
  try {
    await api.sendToDevice(device.id, device.name, backup.file_path);
    notify("success", "发送完成", `请在 ${device.name} 上确认接收`);
  } catch (error) {
    notify("error", "发送失败", String(error));
  } finally {
    endJob();
    setState({ busy: false });
  }
}

export async function saveSettings(compression: CompressionSettings): Promise<void> {
  const config = getState().config;
  if (!config) return;
  const next: AppConfig = { ...config, compression };
  try {
    await api.saveConfig(next);
    setState({ config: next, settingsOpen: false });
    notify("success", "设置已保存", "新的压缩参数将在下次备份时生效");
  } catch (error) {
    notify("error", "保存失败", String(error));
  }
}

export function openSettings(): void {
  setState({ settingsOpen: true });
}

export function closeSettings(): void {
  setState({ settingsOpen: false });
}

export function setActiveTag(tag: string | null): void {
  setState({ activeTag: tag });
}
