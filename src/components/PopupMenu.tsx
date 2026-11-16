import type { CSSProperties, ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface PopupMenuProps {
  /** 相对锚点元素定位 */
  anchor?: HTMLElement | null;
  /** 相对屏幕坐标定位（右键菜单） */
  point?: { x: number; y: number } | null;
  placement?: "below" | "right";
  width?: number;
  onClose: () => void;
  children: ReactNode;
}

export default function PopupMenu({
  anchor,
  point,
  placement = "below",
  width = 220,
  onClose,
  children,
}: PopupMenuProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });

  // 每次渲染后重新测量：内容变化（如设备列表加载完成）时自动修正位置
  useLayoutEffect(() => {
    const element = rootRef.current;
    if (!element) return;

    const boxWidth = element.offsetWidth || width;
    const boxHeight = element.offsetHeight || 160;

    let x = 12;
    let y = 12;

    if (point) {
      x = point.x;
      y = point.y;
    } else if (anchor) {
      const rect = anchor.getBoundingClientRect();
      if (placement === "right") {
        x = rect.right + 6;
        y = rect.top - 6;
      } else {
        x = rect.left;
        y = rect.bottom + 8;
      }
    }

    const left = `${Math.max(10, Math.min(x, window.innerWidth - boxWidth - 10))}px`;
    const top = `${Math.max(10, Math.min(y, window.innerHeight - boxHeight - 10))}px`;

    setStyle((previous) =>
      previous.left === left && previous.top === top && previous.visibility === "visible"
        ? previous
        : { left, top, minWidth: `${width}px`, visibility: "visible" },
    );
  });

  return createPortal(
    <>
      <div
        className="scrim"
        onMouseDown={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <div ref={rootRef} className="menu" style={style} onMouseDown={(event) => event.stopPropagation()}>
        {children}
      </div>
    </>,
    document.body,
  );
}
