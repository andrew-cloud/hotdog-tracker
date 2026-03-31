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

const BG: Record<ToastType, string> = {
  info:    "var(--component\\/toast-bg-info, #0a1828)",
  success: "var(--component\\/toast-bg-success, #0a1f0d)",
  warning: "var(--component\\/toast-bg-warning, #2a1e08)",
  error:   "var(--component\\/toast-bg-error, #2a0808)",
};

const BAR: Record<ToastType, string> = {
  info:    "var(--component\\/toast-bar-info, #5b9ee8)",
  success: "var(--component\\/toast-bar-success, #5bba6f)",
  warning: "var(--component\\/toast-bar-warning, #e8a44a)",
  error:   "var(--component\\/toast-bar-error, #e85c5c)",
};

const ICON_COLOR: Record<ToastType, string> = {
  info:    "var(--semantic\\/info, #5b9ee8)",
  success: "var(--semantic\\/success, #5bba6f)",
  warning: "var(--semantic\\/warning, #e8a44a)",
  error:   "var(--semantic\\/danger, #e85c5c)",
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
        borderRadius: "var(--radius\\/md, 6px)",
        border:       "1px solid var(--component\\/toast-border, #2e2e40)",
        width:        "360px",
        background:   BG[type],
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
              fontFamily: "Inter, sans-serif",
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
                fontFamily: "Inter, sans-serif",
                fontSize:   "14px",
                fontWeight: 400,
                lineHeight: "20px",
                color:      "var(--text\\/primary, #f0ede6)",
                width:      "100%",
                margin:     0,
                flexShrink: 0,
              }}>
                {TITLE[type]}
              </p>
            )}
            <p style={{
              fontFamily: "Inter, sans-serif",
              fontSize:   "13px",
              fontWeight: 400,
              lineHeight: "19px",
              color:      "var(--text\\/secondary, #9e9bb4)",
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
                fontFamily: "Inter, sans-serif",
                fontSize:   "18px",
                fontWeight: 400,
                lineHeight: "20px",
                color:      "var(--component\\/toast-close, #6b6882)",
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
