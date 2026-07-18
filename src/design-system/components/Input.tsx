import React, { useState } from "react";

// ── Types ─────────────────────────────────────────────

export type InputState = "default" | "focus" | "filled" | "error" | "success" | "disabled";

export interface InputProps {
  state?:        InputState;
  label?:        string;
  hint?:         string;
  placeholder?:  string;
  value?:        string;
  showLabel?:    boolean;
  showHint?:     boolean;
  onChange?:     (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?:      (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?:       (e: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?:    (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Forwarded to native <input> */
  type?:         string;
  inputMode?:    React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?:    number;
  autoFocus?:    boolean;
  autoComplete?: string;
  pattern?:      string;
  className?:    string;
  style?:        React.CSSProperties;
}

// ── Token maps ────────────────────────────────────────

const FIELD_BG: Record<InputState, string> = {
  default:  "var(--component\\/input-bg, #FFFFFF)",
  focus:    "var(--component\\/input-bg-focus, #FFFFFF)",
  filled:   "var(--component\\/input-bg, #FFFFFF)",
  error:    "var(--component\\/input-bg-error, #FDEAEA)",
  success:  "var(--component\\/input-bg-success, #EAF6EC)",
  disabled: "var(--component\\/input-bg, #FFFFFF)",
};

const FIELD_BORDER: Record<InputState, string> = {
  default:  "1px solid var(--component\\/input-border, #E4D6C7)",
  focus:    "2px solid var(--component\\/input-border-focus, #A30003)",
  filled:   "1px solid var(--component\\/input-border, #E4D6C7)",
  error:    "1px solid var(--component\\/input-border-error, #e85c5c)",
  success:  "1px solid var(--component\\/input-border-success, #5bba6f)",
  disabled: "1px solid var(--component\\/input-border, #E4D6C7)",
};

const VALUE_COLOR: Record<InputState, string> = {
  default:  "var(--component\\/input-text, #121212)",
  focus:    "var(--component\\/input-text, #121212)",
  filled:   "var(--component\\/input-text, #121212)",
  error:    "var(--component\\/input-text, #121212)",
  success:  "var(--component\\/input-text, #121212)",
  disabled: "var(--text\\/disabled, #515151)",
};

const HINT_COLOR: Record<InputState, string> = {
  default:  "var(--text\\/tertiary, #727272)",
  focus:    "var(--text\\/tertiary, #727272)",
  filled:   "var(--text\\/tertiary, #727272)",
  error:    "var(--semantic\\/danger, #e85c5c)",
  success:  "var(--semantic\\/success, #5bba6f)",
  disabled: "var(--text\\/tertiary, #727272)",
};

const DEFAULT_HINTS: Record<InputState, string> = {
  default:  "Helper text appears here",
  focus:    "Helper text appears here",
  filled:   "Helper text appears here",
  error:    "Please enter a valid email",
  success:  "Looks good!",
  disabled: "Helper text appears here",
};

// ── Component ─────────────────────────────────────────

export default function Input({
  state        = "default",
  label        = "Email Address",
  hint,
  placeholder  = "Enter value…",
  value,
  showLabel    = true,
  showHint     = true,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  type,
  inputMode,
  maxLength,
  autoFocus,
  autoComplete,
  pattern,
  className,
  style,
}: InputProps) {
  const [touched, setTouched] = useState(false);

  const isDisabled = state === "disabled";
  const hintText   = hint ?? DEFAULT_HINTS[state];

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
    alignItems:   "center",
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
    fontFamily:  "'Space Grotesk', sans-serif",
    fontSize:    "16px",
    fontWeight:  600,
    lineHeight:  "22px",
    color:       "var(--text\\/secondary, #727272)",
    width:       "100%",
    flexShrink:  0,
    margin:      0,
  };

  const inputStyle: React.CSSProperties = {
    flex:          "1 0 0",
    fontFamily:    "'Space Grotesk', sans-serif",
    fontSize:      "16px",
    fontWeight:    500,
    lineHeight:    "22px",
    height:        "22px",
    color:         VALUE_COLOR[state],
    background:    "transparent",
    border:        "none",
    outline:       "none",
    overflow:      "hidden",
    textOverflow:  "ellipsis",
    whiteSpace:    "nowrap",
    minWidth:      0,
    minHeight:     0,
    padding:       0,
    width:         "100%",
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
        <input
          style={inputStyle}
          placeholder={touched ? "" : placeholder}
          value={value}
          disabled={isDisabled}
          type={type}
          inputMode={inputMode}
          maxLength={maxLength}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          pattern={pattern}
          onChange={e => { setTouched(true); onChange?.(e); }}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
      </div>

      {showHint && <p style={hintStyle}>{hintText}</p>}
    </div>
  );
}
