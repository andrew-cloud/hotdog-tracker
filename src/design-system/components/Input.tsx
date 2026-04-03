import React from "react";

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
  default:  "var(--component\\/input-bg, #1e1e28)",
  focus:    "var(--component\\/input-bg-focus, #16161d)",
  filled:   "var(--component\\/input-bg, #1e1e28)",
  error:    "var(--component\\/input-bg-error, #2a0808)",
  success:  "var(--component\\/input-bg-success, #0a1f0d)",
  disabled: "var(--surface\\/bg-primary, #0f0f13)",
};

const FIELD_BORDER: Record<InputState, string> = {
  default:  "1px solid var(--component\\/input-border, #3a3a52)",
  focus:    "2px solid var(--component\\/input-border-focus, #e8a44a)",
  filled:   "1px solid var(--component\\/input-border, #3a3a52)",
  error:    "1px solid var(--component\\/input-border-error, #e85c5c)",
  success:  "1px solid var(--component\\/input-border-success, #5bba6f)",
  disabled: "1px solid var(--surface\\/border-default, #2e2e40)",
};

const VALUE_COLOR: Record<InputState, string> = {
  default:  "var(--text\\/tertiary, #6b6882)",
  focus:    "var(--text\\/primary, #f0ede6)",
  filled:   "var(--text\\/primary, #f0ede6)",
  error:    "var(--text\\/primary, #f0ede6)",
  success:  "var(--text\\/primary, #f0ede6)",
  disabled: "var(--text\\/disabled, #4a4860)",
};

const HINT_COLOR: Record<InputState, string> = {
  default:  "var(--text\\/tertiary, #6b6882)",
  focus:    "var(--text\\/tertiary, #6b6882)",
  filled:   "var(--text\\/tertiary, #6b6882)",
  error:    "var(--semantic\\/danger, #e85c5c)",
  success:  "var(--semantic\\/success, #5bba6f)",
  disabled: "var(--text\\/tertiary, #6b6882)",
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
    fontFamily:  "Inter, sans-serif",
    fontSize:    "16px",
    fontWeight:  600,
    lineHeight:  "22px",
    color:       "var(--text\\/secondary, #9e9bb4)",
    width:       "100%",
    flexShrink:  0,
    margin:      0,
  };

  const inputStyle: React.CSSProperties = {
    flex:          "1 0 0",
    fontFamily:    "Inter, sans-serif",
    fontSize:      "16px",
    fontWeight:    400,
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
        <input
          style={inputStyle}
          placeholder={placeholder}
          value={value}
          disabled={isDisabled}
          type={type}
          inputMode={inputMode}
          maxLength={maxLength}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          pattern={pattern}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
      </div>

      {showHint && <p style={hintStyle}>{hintText}</p>}
    </div>
  );
}
