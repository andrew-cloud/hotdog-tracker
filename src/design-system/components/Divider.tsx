import React from "react";

// ── Types ─────────────────────────────────────────────

export interface DividerProps {
  orientation?: "horizontal" | "vertical";
  /** Override the line colour — defaults to border/default */
  color?:       string;
  className?:   string;
  style?:       React.CSSProperties;
}

// ── Divider ───────────────────────────────────────────

export default function Divider({
  orientation = "horizontal",
  color       = "var(--border\\/default, #2e2e40)",
  className,
  style,
}: DividerProps) {
  const isVertical = orientation === "vertical";

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={className}
      style={{
        display:    "flex",
        flexShrink: 0,
        // Horizontal: full width, 1px tall — Vertical: 1px wide, full height
        width:      isVertical ? "1px" : "100%",
        height:     isVertical ? "100%" : "1px",
        minWidth:   isVertical ? "1px"  : undefined,
        minHeight:  isVertical ? undefined : "1px",
        background: color,
        ...style,
      }}
    />
  );
}
