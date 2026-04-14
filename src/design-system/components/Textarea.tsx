import React from "react";

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
  default:  "var(--component\\/input-bg, #1e1e28)",
  focus:    "var(--component\\/input-bg-focus, #16161d)",
  filled:   "var(--component\\/input-bg, #1e1e28)",
  error:    "var(--component\\/input-bg-error, #2a0808)",
  success:  "var(--component\\/input-bg-success, #0a1f0d)",
  disabled: "var(--surface\\/bg-primary, #0f0f13)",
};

const FIELD_BORDER: Record<TextareaState, string> = {
  default:  "1px solid var(--component\\/input-border, #3a3a52)",
  focus:    "2px solid var(--component\\/input-border-focus, #e8a44a)",
  filled:   "1px solid var(--component\\/input-border, #3a3a52)",
  error:    "1px solid var(--component\\/input-border-error, #e85c5c)",
  success:  "1px solid var(--component\\/input-border-success, #5bba6f)",
  disabled: "1px solid var(--surface\\/border-default, #2e2e40)",
};

const VALUE_COLOR: Record<TextareaState, string> = {
  default:  "var(--text\\/tertiary, #6b6882)",
  focus:    "var(--text\\/primary, #f0ede6)",
  filled:   "var(--text\\/primary, #f0ede6)",
  error:    "var(--text\\/primary, #f0ede6)",
  success:  "var(--text\\/primary, #f0ede6)",
  disabled: "var(--text\\/disabled, #4a4860)",
};

const HINT_COLOR: Record<TextareaState, string> = {
  default:  "var(--text\\/tertiary, #6b6882)",
  focus:    "var(--text\\/tertiary, #6b6882)",
  filled:   "var(--text\\/tertiary, #6b6882)",
  error:    "var(--semantic\\/danger, #e85c5c)",
  success:  "var(--semantic\\/success, #5bba6f)",
  disabled: "var(--text\\/tertiary, #6b6882)",
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
    fontFamily: "Inter, sans-serif",
    fontSize:   "16px",
    fontWeight: 600,
    lineHeight: "22px",
    color:      "var(--text\\/secondary, #9e9bb4)",
    width:      "100%",
    flexShrink: 0,
    margin:     0,
  };

  const textareaStyle: React.CSSProperties = {
    flex:        "1 0 0",
    fontFamily:  "Inter, sans-serif",
    fontSize:    "16px",
    fontWeight:  400,
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
    fontFamily: "Inter, sans-serif",
    fontSize:   "16px",
    fontWeight: 400,
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
          placeholder={placeholder}
          value={value}
          disabled={isDisabled}
          maxLength={maxLength}
          autoFocus={autoFocus}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
      </div>

      {showHint && hint && <p style={hintStyle}>{hint}</p>}
    </div>
  );
}
