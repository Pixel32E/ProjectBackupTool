import { useState, type MouseEvent as ReactMouseEvent } from "react";

import Icon from "./Icon";
import PopupMenu from "./PopupMenu";
import { compactPath, formatDateTime, formatFileSize } from "../lib/format";
import {
  loadDevices,
  renameSelectedBackup,
  revealPath,
  selectBackup,
  sendSelected,
  useAppState,
  useDevicesState,
} from "../store/appStore";
import type { BackupEntry, KdeDevice } from "../lib/types";

export default function BackupPanel() {
  const state = useAppState();
  const devices = useDevicesState();
  const [menuPoint, setMenuPoint] = useState<{ x: number; y: number } | null>(null);
  const [submenuAnchor, setSubmenuAnchor] = useState<HTMLElement | null>(null);
  const [submenuOpen, setSubmenuOpen] = useState(false);

  function openMenu(event: ReactMouseEvent, entry: BackupEntry): void {
    selectBackup(entry);
    setSubmenuOpen(false);
    setMenuPoint({ x: event.clientX, y: event.clientY });
  }

  function closeMenu(): void {
    setMenuPoint(null);
    setSubmenuOpen(false);
  }

  async function openSubmenu(anchor: HTMLElement): Promise<void> {
    setSubmenuAnchor(anchor);
    setSubmenuOpen(true);
    await loadDevices();
  }

  async function pickDevice(device: KdeDevice): Promise<void> {
    closeMenu();
    await sendSelected(device);
  }

  async function renameBackup(): Promise<void> {
    closeMenu();
    await renameSelectedBackup();
  }

  return (
    <div className="card panel">
      <div className="panel__head">
        <h2 className="panel__title">备份记录</h2>
        <span className="chip">{state.backups.length} 个</span>
        {state.backupFolder && (
          <button
            className="panel__sub"
            title={state.backupFolder}
            onClick={() => void revealPath(state.backupFolder)}
          >
            <Icon name="folder" size={13} />
            <span>{compactPath(state.backupFolder, 1)}</span>
          </button>
        )}
      </div>

      {state.backups.length ? (
        <ul className="list backup-list">
          {state.backups.map((entry) => (
            <li
              key={entry.file_path}
              className={`backup${state.selectedBackupPath === entry.file_path ? " is-active" : ""}`}
              onClick={() => selectBackup(entry)}
              onContextMenu={(event) => {
                event.preventDefault();
                openMenu(event, entry);
              }}
            >
              <span className="backup__icon">
                <Icon name="archive" size={17} />
              </span>
              <div className="backup__body">
                <div className="backup__title">
                  <span className="backup__name">{entry.remark || entry.project_name}</span>
                  <span className="backup__size">{formatFileSize(entry.size)}</span>
                </div>
                <div className="backup__time">{formatDateTime(entry.modified)}</div>
                <div className="backup__file" title={entry.file_name}>
                  {entry.file_name}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">暂无备份记录，选择左侧项目即可开始备份</p>
      )}

      {menuPoint && (
        <PopupMenu point={menuPoint} width={196} onClose={closeMenu}>
          <button
            className="menu__item"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void renameBackup()}
          >
            <Icon name="edit" size={16} />
            <span className="menu__text">
              <span className="menu__title">重命名</span>
            </span>
          </button>
          <div className="menu__sep" />
          <button
            className="menu__item"
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={(event) => void openSubmenu(event.currentTarget)}
          >
            <Icon name="send" size={16} />
            <span className="menu__text">
              <span className="menu__title">发送到</span>
            </span>
            <Icon name="chevronRight" size={15} />
          </button>
        </PopupMenu>
      )}

      {submenuOpen && submenuAnchor && (
        <PopupMenu
          anchor={submenuAnchor}
          placement="right"
          width={248}
          onClose={closeMenu}
        >
          {devices.loading ? (
            <div className="menu__note">正在检测设备…</div>
          ) : devices.error ? (
            <div className="menu__note">检测设备失败，请确认 KDE Connect 正在运行</div>
          ) : !devices.cliFound ? (
            <div className="menu__note">未找到 KDE Connect，请先安装并运行</div>
          ) : !devices.items.length ? (
            <div className="menu__note">没有可用设备（需已配对且在线）</div>
          ) : (
            devices.items.map((device) => (
              <button
                key={device.id}
                className="menu__item"
                onClick={() => void pickDevice(device)}
              >
                <Icon name="smartphone" size={16} />
                <span className="menu__text">
                  <span className="menu__title">{device.name}</span>
                  <span className="menu__sub">{device.id}</span>
                </span>
              </button>
            ))
          )}
        </PopupMenu>
      )}
    </div>
  );
}
