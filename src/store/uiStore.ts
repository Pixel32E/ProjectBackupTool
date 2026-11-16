import { useSyncExternalStore } from "react";

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

export interface DialogState {
  open: boolean;
  options: DialogOptions;
}

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

export interface PromptState {
  open: boolean;
  options: PromptOptions;
  input: string;
}

let toasts: ToastItem[] = [];
let dialog: DialogState = { open: false, options: { title: "" } };
let prompt: PromptState = { open: false, options: { title: "" }, input: "" };

const toastListeners = new Set<() => void>();
const dialogListeners = new Set<() => void>();
const promptListeners = new Set<() => void>();

function createSubscribe(listeners: Set<() => void>) {
  return (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
}

function emit(listeners: Set<() => void>): void {
  for (const listener of listeners) listener();
}

export function getToasts(): ToastItem[] {
  return toasts;
}

export function getDialog(): DialogState {
  return dialog;
}

export function getPrompt(): PromptState {
  return prompt;
}

const subscribeToasts = createSubscribe(toastListeners);
const subscribeDialog = createSubscribe(dialogListeners);
const subscribePrompt = createSubscribe(promptListeners);

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(subscribeToasts, getToasts);
}

export function useDialog(): DialogState {
  return useSyncExternalStore(subscribeDialog, getDialog);
}

export function usePrompt(): PromptState {
  return useSyncExternalStore(subscribePrompt, getPrompt);
}

let toastId = 0;
let dialogResolver: ((value: boolean) => void) | null = null;
let promptResolver: ((value: string | null) => void) | null = null;

/** 弹出右下角提示 */
export function notify(kind: ToastKind, title: string, message?: string, duration = 4200): void {
  const item: ToastItem = { id: (toastId += 1), kind, title, message };
  toasts = [...toasts, item];
  emit(toastListeners);
  window.setTimeout(() => dismissToast(item.id), duration);
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit(toastListeners);
}

/** 打开确认/提示对话框 */
export function openDialog(options: DialogOptions): Promise<boolean> {
  dialog = {
    open: true,
    options: {
      confirmText: "确定",
      cancelText: "取消",
      danger: false,
      details: [],
      ...options,
    },
  };
  emit(dialogListeners);
  return new Promise((resolve) => {
    dialogResolver = resolve;
  });
}

export function resolveDialog(value: boolean): void {
  dialog = { ...dialog, open: false };
  emit(dialogListeners);
  dialogResolver?.(value);
  dialogResolver = null;
}

export const confirmDialog = openDialog;

/** 仅告知用户，无取消分支 */
export const alertDialog = (options: DialogOptions) =>
  openDialog({ ...options, cancelText: null });

/** 打开文本输入对话框；确认返回输入内容，取消返回 null。 */
export function openPrompt(options: PromptOptions): Promise<string | null> {
  prompt = {
    open: true,
    options: { confirmText: "确定", cancelText: "取消", placeholder: "", ...options },
    input: options.value ?? "",
  };
  emit(promptListeners);
  return new Promise((resolve) => {
    promptResolver = resolve;
  });
}

export function setPromptInput(value: string): void {
  prompt = { ...prompt, input: value };
  emit(promptListeners);
}

export function resolvePrompt(value: string | null): void {
  prompt = { ...prompt, open: false };
  emit(promptListeners);
  promptResolver?.(value);
  promptResolver = null;
}
