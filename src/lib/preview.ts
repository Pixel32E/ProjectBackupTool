/**
 * 浏览器预览用的模拟数据源：仅在 `npm run dev` 的浏览器环境中启用，
 * 生产构建中该模块不会被引用。
 */
import { buildBackupFileName } from "./format";
import { emitPreviewProgress } from "./api";
import type { AppConfig, BackupEntry } from "./types";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let config: AppConfig = {
  windows_root: "D:\\Projects",
  android_root: "E:\\AndroidProjects",
  web_root: "F:\\WebProjects",
  compression: {
    block_size: "1MB",
    block_linked: true,
    content_checksum: true,
    block_checksum: false,
  },
};

const windowsProjects = [
  "Aurora Desk",
  "Backup Core",
  "Flux Notes",
  "Kanban Lite",
  "Lunar Player",
  "Nimbus Sync",
  "Orbit Auth",
  "Pixel Studio",
  "Quartz Board",
  "Relay Chat",
];

const androidProjects = ["Aurora Mobile", "Flux Reader", "Nimbus Wear"];

const webProjects = ["Docs Portal", "Marketing Site", "Admin Console", "Status Page"];

const backupFolder = "D:\\Projects-Backup";

let backups: BackupEntry[] = [
  { name: "Aurora Desk", minutes: 8, size: 41_822_208 },
  { name: "Flux Notes", minutes: 96, size: 12_582_912 },
  { name: "Aurora Mobile", minutes: 1_460, size: 8_912_896 },
  { name: "Nimbus Sync", minutes: 2_880, size: 64_241_664 },
  { name: "Quartz Board", minutes: 4_320, size: 3_355_443 },
  { name: "Orbit Auth", minutes: 10_080, size: 26_214_400 },
].map(({ name, minutes, size }, index) => {
  const time = new Date(Date.now() - minutes * 60_000);
  const file = buildBackupFileName(name, time);
  return {
    file_path: `${backupFolder}\\${file}`,
    file_name: file,
    project_name: name,
    size,
    modified: time.getTime() - index,
  };
});

async function simulateBackup(fileName: string, projectName: string): Promise<unknown> {
  const total = 42;
  for (let step = 1; step <= total; step += 1) {
    await wait(28);
    if (step % 6 === 0 || step === total) {
      emitPreviewProgress({
        job: "backup",
        percent: Math.min(99, Math.round((step / total) * 100)),
        message: `已处理 ${step}/${total} 个文件`,
      });
    }
  }
  emitPreviewProgress({ job: "backup", percent: 100, message: `已处理 ${total} 个文件` });

  const viewer = {
    file_path: `${backupFolder}\\${fileName}`,
    file_name: fileName,
    project_name: projectName,
    size: 18_452_480,
    modified: Date.now(),
  };
  backups = [viewer, ...backups];
  return { file_path: viewer.file_path, skipped: [] };
}

export async function invokePreview(
  command: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  await wait(120);

  switch (command) {
    case "load_config":
      return config;

    case "save_config":
      config = args.config as AppConfig;
      return null;

    case "choose_root": {
      const kind = args.kind as "windows" | "android" | "web";
      const picks = {
        windows: { key: "windows_root", path: "D:\\Projects" },
        android: { key: "android_root", path: "E:\\AndroidProjects" },
        web: { key: "web_root", path: "F:\\WebProjects" },
      } as const;
      config = { ...config, [picks[kind].key]: picks[kind].path };
      return config;
    }

    case "list_projects": {
      const root = (args.root as string | null) ?? null;
      const names =
        root === config.android_root
          ? androidProjects
          : root === config.web_root
            ? webProjects
            : windowsProjects;
      return {
        root: root ?? "",
        exists: Boolean(root),
        items: names.map((name) => ({ name, path: `${root}\\${name}` })),
      };
    }

    case "list_backups":
      return { folder: backupFolder, items: backups };

    case "backup_project": {
      const fileName = args.fileName as string;
      const projectName = fileName.split("_")[0];
      return simulateBackup(fileName, projectName);
    }

    case "restore_backup":
      emitPreviewProgress({ job: "restore", percent: 0, message: "正在解压" });
      await wait(700);
      emitPreviewProgress({ job: "restore", percent: 100, message: "已还原 42 个条目" });
      return { status: "restored", target: `D:\\Projects\\Restored` };

    case "delete_backup": {
      const filePath = args.filePath as string;
      backups = backups.filter((item) => item.file_path !== filePath);
      return null;
    }

    case "reveal_path":
      return null;

    case "list_devices":
      return {
        cli_found: true,
        devices: [
          { id: "b1f8a0c2", name: "Pixel 9 Pro" },
          { id: "7d3c9e11", name: "ThinkPad Tablet" },
        ],
      };

    case "send_to_device": {
      emitPreviewProgress({ job: "send", percent: 0, message: "等待设备确认接收" });
      await wait(1_200);
      emitPreviewProgress({ job: "send", percent: 100, message: "已发送" });
      return null;
    }

    default:
      throw new Error(`未实现的预览命令：${command}`);
  }
}