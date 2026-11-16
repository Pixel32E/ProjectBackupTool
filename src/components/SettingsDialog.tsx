import { useState } from "react";

import Icon from "./Icon";
import {
  closeSettings,
  revealPath,
  saveSettings,
  unblockProject,
  useAppState,
} from "../store/appStore";
import type { CompressionSettings } from "../lib/types";

const fallback: CompressionSettings = {
  block_size: "1MB",
  block_linked: true,
  content_checksum: true,
  block_checksum: false,
};

const blockSizes = [
  { value: "64KB", label: "64 KB" },
  { value: "256KB", label: "256 KB" },
  { value: "1MB", label: "1 MB" },
  { value: "4MB", label: "4 MB" },
];

export default function SettingsDialog() {
  const state = useAppState();
  const [draft, setDraft] = useState<CompressionSettings>({
    ...fallback,
    ...(state.config?.compression ?? {}),
  });

  const patch = (values: Partial<CompressionSettings>) =>
    setDraft((current) => ({ ...current, ...values }));

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeSettings();
      }}
    >
      <div className="dialog dialog--wide">
        <h2 className="dialog__title">设置</h2>
        <p className="dialog__message">
          压缩参数决定备份文件的体积与读写速度，保存后在下一次备份时生效。
        </p>

        <div style={{ marginTop: 18 }}>
          <div className="setting">
            <div className="setting__row">
              <div className="setting__label">
                <div className="setting__title">块大小</div>
                <div className="setting__desc">
                  LZ4 帧内单个数据块的容量，越大的块压缩率略高
                </div>
              </div>
              <div className="setting__field" style={{ display: "flex", justifyContent: "flex-end" }}>
                <div className="segment">
                  {blockSizes.map((option) => (
                    <button
                      key={option.value}
                      className={draft.block_size === option.value ? "is-active" : undefined}
                      onClick={() => patch({ block_size: option.value })}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="setting__block divider" />

            <div className="setting__row">
              <div className="setting__label">
                <div className="setting__title">块模式</div>
                <div className="setting__desc">
                  链接块会引用前序块内容，压缩率更高；独立块便于按块随机读取
                </div>
              </div>
              <div className="setting__field" style={{ display: "flex", justifyContent: "flex-end" }}>
                <div className="segment">
                  <button
                    className={draft.block_linked ? "is-active" : undefined}
                    onClick={() => patch({ block_linked: true })}
                  >
                    链接块
                  </button>
                  <button
                    className={!draft.block_linked ? "is-active" : undefined}
                    onClick={() => patch({ block_linked: false })}
                  >
                    独立块
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="setting">
            <div className="setting__row">
              <div className="setting__label">
                <div className="setting__title">内容校验和</div>
                <div className="setting__desc">解压时校验整体数据完整性，推荐开启</div>
              </div>
              <button
                className={`switch${draft.content_checksum ? " is-on" : ""}`}
                aria-pressed={draft.content_checksum}
                onClick={() => patch({ content_checksum: !draft.content_checksum })}
              />
            </div>

            <div className="setting__block divider" />

            <div className="setting__row">
              <div className="setting__label">
                <div className="setting__title">块校验和</div>
                <div className="setting__desc">逐块校验，写入与读取开销更大，默认关闭</div>
              </div>
              <button
                className={`switch${draft.block_checksum ? " is-on" : ""}`}
                aria-pressed={draft.block_checksum}
                onClick={() => patch({ block_checksum: !draft.block_checksum })}
              />
            </div>
          </div>

          <div className="setting">
            <div className="setting__row">
              <div className="setting__label">
                <div className="setting__title">备份目录</div>
                <div className="setting__desc">自动选择：使用「文档\Projects-Backup」</div>
              </div>
            </div>
            <div className="pathbox" style={{ marginTop: 10 }}>
              <Icon name="folder" size={14} />
              <span className="pathbox__value" title={state.backupFolder}>
                {state.backupFolder || "尚未创建"}
              </span>
              <button className="btn btn--plain" onClick={() => void revealPath(state.backupFolder)}>
                打开
              </button>
            </div>
          </div>

          <div className="setting">
            <div className="setting__row">
              <div className="setting__label">
                <div className="setting__title">屏蔽的项目（黑名单）</div>
                <div className="setting__desc">
                  在项目列表右键可屏蔽文件夹；此处取消屏蔽后立即恢复显示
                </div>
              </div>
              <span className="chip">{state.blocked.length} 项</span>
            </div>

            {state.blocked.length ? (
              <div className="blocklist">
                {state.blocked.map((path) => (
                  <div key={path} className="blockrow">
                    <Icon name="ban" size={14} />
                    <span className="blockrow__value" title={path}>
                      {path}
                    </span>
                    <button className="btn btn--plain" onClick={() => void unblockProject(path)}>
                      取消屏蔽
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="setting__desc" style={{ marginTop: 10 }}>
                暂无屏蔽的项目
              </p>
            )}
          </div>
        </div>

        <div className="dialog__footer">
          <button className="btn btn--ghost" onClick={closeSettings}>
            取消
          </button>
          <button className="btn btn--accent" onClick={() => void saveSettings(draft)}>
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}
