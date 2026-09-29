import { reactive } from "vue";

export type ToastKind = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

export interface DialogOptions {
  title: string;
  message?: string;
  /** 需要逐条展示的明细（如被跳过的文件） */
  details?: string[];
  confirmText?: string;
  /** 传 null 时只保留确认按钮 */
  cancelText?: string | null;
  danger?: boolean;
}

export const toasts = reactive<ToastItem[]>([]);
export const dialogState = reactive<{ open: boolean; options: DialogOptions }>({
  open: false,
  options: { title: "" },
});

export interface PromptOptions {
  title: string;
  message?: string;
  /** 输入框初始值 */
  value?: string;
  placeholder?: string;
  confirmText?: string;
  /** 传 null 时只保留确认按钮 */
  cancelText?: string | null;
}

export const promptState = reactive<{ open: boolean; options: PromptOptions; input: string }>({
  open: false,
  options: { title: "" },
  input: "",
});

let toastId = 0;
let dialogResolver: ((value: boolean) => void) | null = null;
let promptResolver: ((value: string | null) => void) | null = null;

/** 弹出右下角提示 */
export function notify(kind: ToastKind, title: string, message?: string, duration = 4200): void {
  const item: ToastItem = { id: (toastId += 1), kind, title, message };
  toasts.push(item);
  window.setTimeout(() => dismissToast(item.id), duration);
}

export function dismissToast(id: number): void {
  const index = toasts.findIndex((toast) => toast.id === id);
  if (index >= 0) {
    toasts.splice(index, 1);
  }
}

/** 打开确认/提示对话框 */
export function openDialog(options: DialogOptions): Promise<boolean> {
  dialogState.options = {
    confirmText: "确定",
    cancelText: "取消",
    danger: false,
    details: [],
    ...options,
  };
  dialogState.open = true;
  return new Promise((resolve) => {
    dialogResolver = resolve;
  });
}

export function resolveDialog(value: boolean): void {
  dialogState.open = false;
  dialogResolver?.(value);
  dialogResolver = null;
}

export const confirmDialog = openDialog;

/** 仅告知用户，无取消分支 */
export const alertDialog = (options: DialogOptions) =>
  openDialog({ ...options, cancelText: null });

/** 打开文本输入对话框；确认返回输入内容，取消返回 null。 */
export function openPrompt(options: PromptOptions): Promise<string | null> {
  promptState.options = {
    confirmText: "确定",
    cancelText: "取消",
    placeholder: "",
    ...options,
  };
  promptState.input = options.value ?? "";
  promptState.open = true;
  return new Promise((resolve) => {
    promptResolver = resolve;
  });
}

export function resolvePrompt(value: string | null): void {
  promptState.open = false;
  promptResolver?.(value);
  promptResolver = null;
}