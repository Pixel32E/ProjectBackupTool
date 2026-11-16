import { createPortal } from "react-dom";

import Icon, { type IconName } from "./Icon";
import { dismissToast, useToasts, type ToastKind } from "../store/uiStore";

const toastIcons: Record<ToastKind, IconName> = {
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
            <Icon name={toastIcons[toast.kind]} size={15} />
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
