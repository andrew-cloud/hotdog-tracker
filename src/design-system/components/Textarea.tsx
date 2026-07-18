import React, { useState } from "react";

// ── Types ─────────────────────────────────────────────

export type TextareaState = "default" | "focus" | "filled" | "error" | "success" | "disabled";

export interface TextareaProps {
  state?:       TextareaState;
  label?:       string;
  hint?:        string;
  placeholder?: string;
  value?:       string;
  showLabel?:   boolean;
  showHint?:    boolean;
  maxLength?:   number;
  autoFocus?:   boolean;
  onChange?:    (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onFocus?:     (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onBlur?:      (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onKeyDown?:   (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  className?:   string;
  style?:       React.CSSProperties;
}

// ── Token maps (mirrors Input component) ──────────────

const FIELD_BG: Record<TextareaState, string> = {
  default:  "var(--component\\/input-bg, #FFFFFF)",
  focus:    "var(--component\\/input-bg-focus, #FFFFFF)",
  filled:   "var(--component\\/input-bg, #FFFFFF)",
  error:    "var(--component\\/input-bg-error, #FDEAEA)",
  success:  "var(--component\\/input-bg-success, #EAF6EC)",
  disabled: "var(--component\\/input-bg, #FFFFFF)",
};

const FIELD_BORDER: Record<TextareaState, string> = {
  default:  "1px solid var(--component\\/input-border, #E4D6C7)",
  focus:    "2px solid var(--component\\/input-border-focus, #F06705)",
  filled:   "1px solid var(--component\\/input-border, #E4D6C7)",
  error:    "1px solid var(--component\\/input-border-error, #e85c5c)",
  success:  "1px solid var(--component\\/input-border-success, #5bba6f)",
  disabled: "1px solid var(--component\\/input-border, #E4D6C7)",
};

const VALUE_COLOR: Record<TextareaState, string> = {
  default:  "var(--component\\/input-text, #121212)",
  focus:    "var(--component\\/input-text, #121212)",
  filled:   "var(--component\\/input-text, #121212)",
  error:    "var(--component\\/input-text, #121212)",
  success:  "var(--component\\/input-text, #121212)",
  disabled: "var(--text\\/disabled, #515151)",
};

const HINT_COLOR: Record<TextareaState, string> = {
  default:  "var(--text\\/tertiary, #727272)",
  focus:    "var(--text\\/tertiary, #727272)",
  filled:   "var(--text\\/tertiary, #727272)",
  error:    "var(--semantic\\/danger, #e85c5c)",
  success:  "var(--semantic\\/success, #5bba6f)",
  disabled: "var(--text\\/tertiary, #727272)",
};

// 2 lines × 22px line-height = 44px (padding is on the wrapper)
const MIN_TEXTAREA_H = 44;
// 5 lines × 22px line-height = 110px
const MAX_TEXTAREA_H = 110;

// ── Component ─────────────────────────────────────────

export default function Textarea({
  state       = "default",
  label       = "Notes",
  hint,
  placeholder = "Enter notes…",
  value,
  showLabel   = true,
  showHint    = false,
  maxLength,
  autoFocus,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  className,
  style,
}: TextareaProps) {
  const [touched, setTouched] = useState(false);

  const isDisabled = state === "disabled";

  const wrapperStyle: React.CSSProperties = {
    display:       "flex",
    flexDirection: "column",
    gap:           "6px",
    alignItems:    "flex-start",
    position:      "relative",
    width:         "100%",
    opacity:       isDisabled ? 0.45 : 1,
    ...style,
  };

  const fieldStyle: React.CSSProperties = {
    display:      "flex",
    overflow:     "hidden",
    padding:      "var(--spacing\\/3, 12px)",
    borderRadius: "var(--radius\\/md, 6px)",
    flexShrink:   0,
    width:        "100%",
    background:   FIELD_BG[state],
    border:       FIELD_BORDER[state],
    boxSizing:    "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize:   "16px",
    fontWeight: 600,
    lineHeight: "22px",
    color:      "var(--text\\/secondary, #727272)",
    width:      "100%",
    flexShrink: 0,
    margin:     0,
  };

  const textareaStyle: React.CSSProperties = {
    flex:        "1 0 0",
    fontFamily:  "'Space Grotesk', sans-serif",
    fontSize:    "16px",
    fontWeight:  500,
    lineHeight:  "22px",
    minHeight:   `${MIN_TEXTAREA_H}px`,
    maxHeight:   `${MAX_TEXTAREA_H}px`,
    color:       VALUE_COLOR[state],
    background:  "transparent",
    border:      "none",
    outline:     "none",
    resize:      "none",
    overflowY:   "auto",
    padding:     0,
    width:       "100%",
    minWidth:    0,
  };

  const hintStyle: React.CSSProperties = {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize:   "16px",
    fontWeight: 500,
    lineHeight: "22px",
    color:      HINT_COLOR[state],
    width:      "100%",
    flexShrink: 0,
    margin:     0,
  };

  return (
    <div className={className} style={wrapperStyle}>
      {showLabel && <p style={labelStyle}>{label}</p>}

      <div style={fieldStyle}>
        <textarea
          style={textareaStyle}
          placeholder={touched ? "" : placeholder}
          value={value}
          disabled={isDisabled}
          maxLength={maxLength}
          autoFocus={autoFocus}
          onChange={e => { setTouched(true); onChange?.(e); }}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
      </div>

      {showHint && hint && <p style={hintStyle}>{hint}</p>}

      {maxLength != null && (() => {
        const len     = (value ?? "").length;
        const pct     = len / maxLength;
        const color   = pct >= 0.95
          ? "var(--semantic\\/danger, #e85c5c)"
          : pct >= 0.8
          ? "var(--brand\\/orange, #F06705)"
          : "var(--text\\/tertiary, #727272)";
        return (
          <p style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize:   "13px",
            fontWeight: 500,
            lineHeight: "18px",
            color,
            margin:     0,
            width:      "100%",
            textAlign:  "right",
          }}>
            {len} / {maxLength}
          </p>
        );
      })()}
    </div>
  );
}
