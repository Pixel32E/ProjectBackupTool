import { createPortal } from "react-dom";

import Icon from "./Icon";
import { dismissToast, useToasts } from "../store/uiStore";

const icons: Record<string, string> = {
  success: "checkCircle",
  error: "alert",
  warning: "alert",
  info: "info",
};

export default function ToastHost() {
  const toasts = useToasts();

  if (!toasts.length) return null;

  return createPortal(
    <div className="toasts">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.kind}`}
          onClick={() => dismissToast(toast.id)}
        >
          <span className="toast__icon">
            <Icon name={icons[toast.kind] ?? "info"} size={15} />
          </span>
          <div className="toast__body">
            <div className="toast__title">{toast.title}</div>
            {toast.message && <div className="toast__message">{toast.message}</div>}
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}
