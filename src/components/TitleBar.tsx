import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

import Icon from "./Icon";
import { isDesktop } from "../lib/api";

const appWindow = isDesktop ? getCurrentWindow() : null;

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const win = appWindow;
    if (!win) return;

    let disposed = false;
    let unlisten: (() => void) | null = null;

    void (async () => {
      try {
        const current = await win.isMaximized();
        if (disposed) return;
        setMaximized(current);

        const off = await win.onResized(async () => {
          if (disposed) return;
          setMaximized(await win.isMaximized());
        });
        if (disposed) off();
        else unlisten = off;
      } catch {
        // 浏览器预览或权限缺失时保持默认图标
      }
    })();

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="titlebar__brand" data-tauri-drag-region>
        <span className="titlebar__mark">
          <Icon name="folder" size={14} stroke={2} />
        </span>
        <span>ProjectBackupTool</span>
      </div>
      <div className="titlebar__controls">
        <button
          className="winbtn"
          title="最小化"
          onClick={() => void appWindow?.minimize()}
        >
          <Icon name="minimize" size={15} />
        </button>
        <button
          className="winbtn"
          title={maximized ? "向下还原" : "最大化"}
          onClick={() => void appWindow?.toggleMaximize()}
        >
          <Icon
            name={maximized ? "restoreWindow" : "maximize"}
            size={13}
            className={maximized ? "winbtn-restore" : undefined}
          />
        </button>
        <button
          className="winbtn winbtn--close"
          title="关闭"
          onClick={() => void appWindow?.close()}
        >
          <Icon name="close" size={14} />
        </button>
      </div>
    </header>
  );
}
