import Icon from "./Icon";
import { openSettings, pickRoot, projectRoot, revealPath, useAppState } from "../store/appStore";

export default function Toolbar() {
  const state = useAppState();
  const root = projectRoot(state);

  return (
    <div className="card toolbar">
      <button className="btn btn--accent" onClick={() => void pickRoot()}>
        <Icon name="folder" size={16} />
        选择根目录
      </button>
      <button className="btn btn--ghost" onClick={openSettings}>
        <Icon name="sliders" size={16} />
        设置
      </button>

      <div className="toolbar__spacer" />

      <button
        className={`pathchip${!root.path || !root.exists ? " pathchip--empty" : ""}`}
        title={
          root.path
            ? `项目根目录：${root.path}（点击在资源管理器中打开）`
            : "项目根目录尚未选择"
        }
        onClick={() => void revealPath(root.path)}
      >
        <Icon name="folder" size={15} />
        <span className="pathchip__value">{root.path ?? "项目根目录未选择"}</span>
      </button>
    </div>
  );
}
