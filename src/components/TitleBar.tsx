import { getCurrentWindow } from "@tauri-apps/api/window";

import Icon from "./Icon";
import { isDesktop } from "../lib/api";

const appWindow = isDesktop ? getCurrentWindow() : null;

export default function TitleBar() {
  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="titlebar__brand" data-tauri-drag-region>
        <span className="titlebar__mark">
          <Icon name="sparkle" size={13} stroke={2} />
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
          title="最大化"
          onClick={() => void appWindow?.toggleMaximize()}
        >
          <Icon name="maximize" size={13} />
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
