import { computed, reactive } from "vue";

import * as api from "../lib/api";
import { buildBackupFileName } from "../lib/format";
import type {
  AppConfig,
  BackupEntry,
  CompressionSettings,
  KdeDevice,
  ProjectEntry,
  RootKind,
} from "../lib/types";
import { alertDialog, confirmDialog, notify } from "./useUi";

interface JobState {
  active: boolean;
  label: string;
  percent: number;
  detail: string;
  indeterminate: boolean;
}

export const state = reactive({
  ready: false,
  config: null as AppConfig | null,
  backupFolder: "",
  windowsExists: false,
  androidExists: false,
  windowsProjects: [] as ProjectEntry[],
  androidProjects: [] as ProjectEntry[],
  backups: [] as BackupEntry[],
  selectedProjectPath: null as string | null,
  selectedBackupPath: null as string | null,
  busy: false,
  settingsOpen: false,
  job: {
    active: false,
    label: "",
    percent: 0,
    detail: "",
    indeterminate: true,
  } as JobState,
});

export const devices = reactive({
  loading: false,
  cliFound: true,
  error: "",
  items: [] as KdeDevice[],
});

export const selectedProject = computed(() => {
  const path = state.selectedProjectPath;
  if (!path) return null;
  return (
    [...state.windowsProjects, ...state.androidProjects].find(
      (project) => project.path === path,
    ) ?? null
  );
});

export const selectedBackup = computed(() => {
  const path = state.selectedBackupPath;
  if (!path) return null;
  return state.backups.find((backup) => backup.file_path === path) ?? null;
});

export const canBackup = computed(() => Boolean(selectedProject.value) && !state.busy);
export const canRestore = computed(() => Boolean(selectedBackup.value) && !state.busy);
export const canDelete = computed(() => Boolean(selectedBackup.value) && !state.busy);

function beginJob(label: string): void {
  state.job = { active: true, label, percent: 0, detail: "", indeterminate: true };
}

function endJob(): void {
  state.job.active = false;
}

export async function init(): Promise<void> {
  if (state.ready) return;

  try {
    await api.onProgress((payload) => {
      if (!state.job.active) return;
      state.job.percent = payload.percent;
      state.job.detail = payload.message;
      state.job.indeterminate = payload.percent <= 0;
    });

    const [config, backups] = await Promise.all([api.loadConfig(), api.listBackups()]);
    state.config = config;
    state.backups = backups.items;
    state.backupFolder = backups.folder;
    await Promise.all([refreshProjects("windows"), refreshProjects("android")]);
    state.ready = true;
  } catch (error) {
    notify("error", "初始化失败", String(error));
  }
}

export async function refreshProjects(kind: RootKind): Promise<void> {
  const root =
    kind === "windows"
      ? (state.config?.windows_root ?? null)
      : (state.config?.android_root ?? null);

  const scan = await api.listProjects(root);
  if (kind === "windows") {
    state.windowsProjects = scan.items;
    state.windowsExists = scan.exists;
  } else {
    state.androidProjects = scan.items;
    state.androidExists = scan.exists;
  }
}

export async function refreshBackups(): Promise<void> {
  const result = await api.listBackups();
  state.backups = result.items;
  state.backupFolder = result.folder;
  if (state.selectedBackupPath && !state.backups.some((b) => b.file_path === state.selectedBackupPath)) {
    state.selectedBackupPath = null;
  }
}

export async function refreshAll(): Promise<void> {
  try {
    await Promise.all([
      refreshProjects("windows"),
      refreshProjects("android"),
      refreshBackups(),
    ]);
    notify("info", "列表已刷新", "项目与备份记录已重新扫描");
  } catch (error) {
    notify("error", "刷新失败", String(error));
  }
}

export function selectProject(entry: ProjectEntry): void {
  state.selectedProjectPath = entry.path;
}

export function selectBackup(entry: BackupEntry): void {
  state.selectedBackupPath = entry.file_path;
}

export async function pickRoot(kind: RootKind): Promise<void> {
  try {
    const config = await api.chooseRoot(kind);
    if (!config) return;
    state.config = config;
    await refreshProjects(kind);
    notify(
      "info",
      "根目录已更新",
      kind === "windows" ? "Windows 项目目录已保存" : "Android 项目目录已保存",
    );
  } catch (error) {
    notify("error", "选择目录失败", String(error));
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
  if (state.busy) {
    notify("info", "请稍候", "当前有操作正在进行");
    return;
  }

  state.busy = true;
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
    state.busy = false;
  }
}

export async function backupSelected(): Promise<void> {
  const project = selectedProject.value;
  if (!project) {
    notify("warning", "未选择项目", "请先在左侧选择一个项目");
    return;
  }
  await backupProject(project);
}

export async function restoreSelected(): Promise<void> {
  const backup = selectedBackup.value;
  if (!backup) {
    notify("warning", "未选择备份", "请先在右侧选择一条备份记录");
    return;
  }
  if (state.busy) {
    notify("info", "请稍候", "当前有操作正在进行");
    return;
  }

  state.busy = true;
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

    await Promise.all([refreshProjects("windows"), refreshProjects("android")]);
    notify("success", "恢复完成", target);
  } catch (error) {
    notify("error", "恢复失败", String(error));
  } finally {
    endJob();
    state.busy = false;
  }
}

export async function deleteSelected(): Promise<void> {
  const backup = selectedBackup.value;
  if (!backup) {
    notify("warning", "未选择备份", "请先在右侧选择一条备份记录");
    return;
  }
  if (state.busy) {
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

  state.busy = true;
  try {
    await api.deleteBackup(backup.file_path);
    await refreshBackups();
    notify("success", "已删除", backup.file_name);
  } catch (error) {
    notify("error", "删除失败", String(error));
  } finally {
    state.busy = false;
  }
}

export async function loadDevices(): Promise<void> {
  if (devices.loading) return;
  devices.loading = true;
  devices.error = "";
  try {
    const result = await api.listDevices();
    devices.cliFound = result.cli_found;
    devices.items = result.devices;
  } catch (error) {
    devices.error = String(error);
    devices.items = [];
  } finally {
    devices.loading = false;
  }
}

export async function sendSelected(device: KdeDevice): Promise<void> {
  const backup = selectedBackup.value;
  if (!backup) {
    notify("warning", "未选择备份", "请先在右侧选择一条备份记录");
    return;
  }
  if (state.busy) {
    notify("info", "请稍候", "当前有操作正在进行");
    return;
  }

  const confirmed = await confirmDialog({
    title: "发送到设备",
    message: `确定要将 “${backup.file_name}” 发送到 “${device.name}” 吗？`,
    confirmText: "发送",
  });
  if (!confirmed) return;

  state.busy = true;
  beginJob(`正在发送到 ${device.name}`);
  try {
    await api.sendToDevice(device.id, device.name, backup.file_path);
    notify("success", "发送完成", `请在 ${device.name} 上确认接收`);
  } catch (error) {
    notify("error", "发送失败", String(error));
  } finally {
    endJob();
    state.busy = false;
  }
}

export async function saveSettings(compression: CompressionSettings): Promise<void> {
  if (!state.config) return;
  const next: AppConfig = { ...state.config, compression };
  try {
    await api.saveConfig(next);
    state.config = next;
    state.settingsOpen = false;
    notify("success", "设置已保存", "新的压缩参数将在下次备份时生效");
  } catch (error) {
    notify("error", "保存失败", String(error));
  }
}