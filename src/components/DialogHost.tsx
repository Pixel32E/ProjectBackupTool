import { useEffect, useRef } from "react";

import Icon from "./Icon";
import { resolveDialog, resolvePrompt, setPromptInput, useDialog, usePrompt } from "../store/uiStore";

export default function DialogHost() {
  const dialog = useDialog();
  const prompt = usePrompt();
  const promptInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!prompt.open) return;
    promptInput.current?.focus();
    promptInput.current?.select();
  }, [prompt.open]);

  function confirmPrompt(): void {
    resolvePrompt(prompt.input);
  }

  return (
    <>
      {dialog.open && (
        <div
          className="overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) resolveDialog(false);
          }}
        >
          <div className="dialog">
            <h2 className="dialog__title">{dialog.options.title}</h2>
            {dialog.options.message && (
              <p className="dialog__message">{dialog.options.message}</p>
            )}

            {Boolean(dialog.options.details?.length) && (
              <div className="dialog__list">
                {dialog.options.details?.map((item) => (
                  <div key={item} title={item}>
                    {item}
                  </div>
                ))}
              </div>
            )}

            <div className="dialog__footer">
              {dialog.options.cancelText && (
                <button className="btn btn--ghost" onClick={() => resolveDialog(false)}>
                  {dialog.options.cancelText}
                </button>
              )}
              <button
                className={`btn ${dialog.options.danger ? "btn--ghost btn--danger" : "btn--accent"}`}
                onClick={() => resolveDialog(true)}
              >
                {dialog.options.danger && <Icon name="alert" size={15} />}
                {dialog.options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {prompt.open && (
        <div
          className="overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) resolvePrompt(null);
          }}
        >
          <div className="dialog">
            <h2 className="dialog__title">{prompt.options.title}</h2>
            {prompt.options.message && (
              <p className="dialog__message">{prompt.options.message}</p>
            )}

            <input
              ref={promptInput}
              className="dialog__input"
              placeholder={prompt.options.placeholder}
              value={prompt.input}
              onChange={(event) => setPromptInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  confirmPrompt();
                } else if (event.key === "Escape") {
                  resolvePrompt(null);
                }
              }}
            />

            <div className="dialog__footer">
              {prompt.options.cancelText && (
                <button className="btn btn--ghost" onClick={() => resolvePrompt(null)}>
                  {prompt.options.cancelText}
                </button>
              )}
              <button className="btn btn--accent" onClick={confirmPrompt}>
                {prompt.options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
