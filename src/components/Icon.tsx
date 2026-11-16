import {
  Archive,
  Ban,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Copy,
  Folder,
  Info,
  Minus,
  PencilLine,
  RotateCcw,
  Send,
  SlidersHorizontal,
  Smartphone,
  Square,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";

/** 界面中可用的图标名（语义化别名，统一映射到 lucide-react 图标） */
export type IconName =
  | "folder"
  | "sliders"
  | "archive"
  | "restore"
  | "trash"
  | "send"
  | "edit"
  | "chevronDown"
  | "chevronRight"
  | "smartphone"
  | "close"
  | "minimize"
  | "maximize"
  | "restoreWindow"
  | "check"
  | "ban"
  | "checkCircle"
  | "alert"
  | "info";

type LucideGlyph = typeof Folder;

/** 图标资源表：全部来自 lucide-react，随库统一升级维护 */
const ICONS: Record<IconName, LucideGlyph> = {
  folder: Folder,
  sliders: SlidersHorizontal,
  archive: Archive,
  restore: RotateCcw,
  trash: Trash2,
  send: Send,
  edit: PencilLine,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  smartphone: Smartphone,
  close: X,
  minimize: Minus,
  maximize: Square,
  /** 窗口还原：两个叠放的方框（配合 CSS 水平镜像贴近 Windows 样式） */
  restoreWindow: Copy,
  check: Check,
  ban: Ban,
  checkCircle: CircleCheck,
  alert: TriangleAlert,
  info: Info,
};

export interface IconProps {
  name: IconName;
  size?: number;
  /** 线宽，对应 lucide 的 strokeWidth */
  stroke?: number;
  className?: string;
}

export default function Icon({ name, size = 18, stroke = 1.7, className }: IconProps) {
  const Glyph = ICONS[name];

  return (
    <span className={className ? `icon ${className}` : "icon"} aria-hidden="true">
      <Glyph size={size} strokeWidth={stroke} />
    </span>
  );
}
