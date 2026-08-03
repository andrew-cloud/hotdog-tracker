import React from "react";

// ── Types ─────────────────────────────────────────────

export type ToastType = "info" | "success" | "warning" | "error";

export interface ToastProps {
  type?:       ToastType;
  title?:      boolean;
  closeable?:  boolean;
  message?:    string;
  onClose?:    () => void;
  className?:  string;
  style?:      React.CSSProperties;
}

// ── Token maps ────────────────────────────────────────
// Toast now sits on the same light-card system as Card/GifTile/StatTile
// (cream/tinted fill, no border, card shadow, 24px radius) instead of the
// old dark navy/green/amber/red panels left over from the dark-mode-only
// era. Per-type tinting uses the same light tints already established by
// Input's success/error fields, plus matching blue/crimson tints for
// info/warning so all four types stay visually distinct on the light fill.

const BG: Record<ToastType, string> = {
  info:    "#EAF2FD", // raw — light blue tint, mirrors input-bg-success/error pattern
  success: "#EAF6EC", // raw — matches --component/input-bg-success
  warning: "#FBE9EA", // raw — light warm-red tint (warning now shares the crimson ramp)
  error:   "#FDEAEA", // raw — matches --component/input-bg-error
};

const BAR: Record<ToastType, string> = {
  info:    "#2266C4", // raw — prim-blue-500, darker/more saturated for contrast on light fill
  success: "#2E8B3F", // raw — prim-green-500
  warning: "#770305", // raw — prim-amber-500 (crimson ramp)
  error:   "#C43030", // raw — prim-red-500
};

const ICON_COLOR: Record<ToastType, string> = {
  info:    BAR.info,
  success: BAR.success,
  warning: BAR.warning,
  error:   BAR.error,
};

const ICON: Record<ToastType, string> = {
  info:    "ℹ",
  success: "✓",
  warning: "⚠",
  error:   "✕",
};

const TITLE: Record<ToastType, string> = {
  info:    "Info",
  success: "Success",
  warning: "Warning",
  error:   "Error",
};

// ── Component ─────────────────────────────────────────

export default function Toast({
  type      = "info",
  title     = true,
  closeable = true,
  message   = "This is a notification message from the system.",
  onClose,
  className,
  style,
}: ToastProps) {
  return (
    <div
      className={className}
      style={{
        display:      "flex",
        flexDirection:"column",
        alignItems:   "flex-start",
        overflow:     "hidden",
        borderRadius: "var(--component\\/card-radius, 24px)", // matches Card/GifTile/StatTile radius
        border:       "none", // light-card family uses shadow, not a border, to separate from the page
        width:        "360px",
        background:   BG[type],
        boxShadow:    "0px 4px 16px 0px rgba(0,0,0,0.20)", // same elevation as Card/GifTile/StatTile
        boxSizing:    "border-box",
        ...style,
      }}
    >
      {/* Body row */}
      <div style={{
        display:    "flex",
        alignItems: "flex-start",
        overflow:   "hidden",
        flexShrink: 0,
        width:      "100%",
      }}>
        {/* Left accent bar */}
        <div style={{
          alignSelf:  "stretch",
          flexShrink: 0,
          width:      "4px",
          background: BAR[type],
        }} />

        {/* Inner content */}
        <div style={{
          display:    "flex",
          flex:       "1 0 0",
          gap:        "10px",
          alignItems: "flex-start",
          overflow:   "hidden",
          padding:    "14px 12px 14px 16px",
          alignSelf:  "stretch",
          minWidth:   0,
          minHeight:  0,
        }}>
          {/* Icon */}
          <div style={{
            display:    "flex",
            alignItems: "flex-start",
            overflow:   "hidden",
            flexShrink: 0,
            paddingTop: "2px",
          }}>
            <span style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize:   "14px",
              fontWeight: 700,
              lineHeight: "20px",
              color:      ICON_COLOR[type],
              whiteSpace: "nowrap",
            }}>
              {ICON[type]}
            </span>
          </div>

          {/* Content column */}
          <div style={{
            display:       "flex",
            flex:          "1 0 0",
            flexDirection: "column",
            gap:           "2px",
            alignItems:    "flex-start",
            overflow:      "hidden",
            minWidth:      0,
            minHeight:     0,
          }}>
            {title && (
              <p style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize:   "14px",
                fontWeight: 600,
                lineHeight: "20px",
                color:      "#121212", // dark ink — matches Card title / StatTile value / input-text on the light fill
                width:      "100%",
                margin:     0,
                flexShrink: 0,
              }}>
                {TITLE[type]}
              </p>
            )}
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize:   "13px",
              fontWeight: 500,
              lineHeight: "19px",
              color:      "var(--text\\/secondary, #727272)",
              width:      "100%",
              margin:     0,
              flexShrink: 0,
            }}>
              {message}
            </p>
          </div>

          {/* Close button */}
          {closeable && (
            <div
              style={{
                display:    "flex",
                alignItems: "flex-start",
                overflow:   "hidden",
                flexShrink: 0,
                paddingTop: "2px",
                cursor:     "pointer",
              }}
              onClick={onClose}
              role="button"
              aria-label="Dismiss notification"
            >
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize:   "18px",
                fontWeight: 500,
                lineHeight: "20px",
                color:      "var(--text\\/tertiary, #727272)",
                whiteSpace: "nowrap",
              }}>
                ×
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
