import Icon from "./Icon";
import {
  backupSelected,
  canBackup,
  canDelete,
  canRestore,
  deleteSelected,
  restoreSelected,
  useAppState,
} from "../store/appStore";

export default function ActionBar() {
  const state = useAppState();

  return (
    <div className="card actionbar">
      <div className="actionbar__info">
        {state.job.active ? (
          <div className="progress">
            <div className="progress__head">
              <span className="progress__label">{state.job.label}</span>
              {!state.job.indeterminate && (
                <span className="progress__percent">{state.job.percent}%</span>
              )}
            </div>
            <div className="progress__track">
              <div
                className={`progress__fill${state.job.indeterminate ? " is-indeterminate" : ""}`}
                style={state.job.indeterminate ? {} : { width: `${state.job.percent}%` }}
              />
            </div>
            <p className="progress__detail">{state.job.detail || "准备中…"}</p>
          </div>
        ) : (
          <p className="actionbar__tip">
            <Icon name="info" size={15} />
            选择一个项目后点击「备份项目」；右键备份记录可发送到设备
          </p>
        )}
      </div>

      <div className="actionbar__buttons">
        <button
          className="btn btn--accent"
          disabled={!canBackup(state)}
          onClick={() => void backupSelected()}
        >
          <Icon name="archive" size={16} />
          备份项目
        </button>
        <button
          className="btn btn--ghost"
          disabled={!canRestore(state)}
          onClick={() => void restoreSelected()}
        >
          <Icon name="restore" size={16} />
          恢复备份
        </button>
        <button
          className="btn btn--ghost btn--danger"
          disabled={!canDelete(state)}
          onClick={() => void deleteSelected()}
        >
          <Icon name="trash" size={16} />
          删除备份
        </button>
      </div>
    </div>
  );
}
