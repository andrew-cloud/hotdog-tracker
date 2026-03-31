import React from "react";

// ── Types ─────────────────────────────────────────────

export type CheckboxState = "unchecked" | "checked" | "indeterminate" | "disabled";

export interface CheckboxProps {
  state?:    CheckboxState;
  label?:    string;
  onChange?: (checked: boolean) => void;
  className?: string;
  style?:    React.CSSProperties;
}

// ── Component ─────────────────────────────────────────

export default function Checkbox({
  state     = "unchecked",
  label     = "Enable notifications",
  onChange,
  className,
  style,
}: CheckboxProps) {
  const isChecked       = state === "checked";
  const isIndeterminate = state === "indeterminate";
  const isDisabled      = state === "disabled";
  const isFilled        = isChecked || isIndeterminate;

  const wrapperStyle: React.CSSProperties = {
    display:    "flex",
    gap:        "10px",
    alignItems: "center",
    position:   "relative",
    opacity:    isDisabled ? 0.45 : 1,
    cursor:     isDisabled ? "not-allowed" : "pointer",
    ...style,
  };

  const boxStyle: React.CSSProperties = {
    flexShrink:     0,
    width:          "18px",
    height:         "18px",
    borderRadius:   "var(--radius\\/sm, 4px)",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    overflow:       "hidden",
    background:     isFilled
      ? "var(--brand\\/amber, #e8a44a)"
      : isDisabled
      ? "var(--surface\\/bg-primary, #0f0f13)"
      : "var(--surface\\/bg-tertiary, #1e1e28)",
    border: isFilled
      ? "none"
      : isDisabled
      ? "1px solid var(--surface\\/border-default, #2e2e40)"
      : "1px solid var(--component\\/input-border, #3a3a52)",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "Inter, sans-serif",
    fontSize:   "14px",
    fontWeight: 400,
    lineHeight: "20px",
    color:      isDisabled
      ? "var(--text\\/disabled, #4a4860)"
      : "var(--text\\/secondary, #9e9bb4)",
    whiteSpace: "nowrap",
    userSelect: "none",
  };

  const handleClick = () => {
    if (!isDisabled && onChange) onChange(!isChecked);
  };

  return (
    <div
      className={className}
      style={wrapperStyle}
      role="checkbox"
      aria-checked={isIndeterminate ? "mixed" : isChecked}
      aria-disabled={isDisabled}
      onClick={handleClick}
    >
      <div style={boxStyle}>
        {isChecked && (
          <span style={{
            fontFamily: "Inter, sans-serif",
            fontSize:   "11px",
            fontWeight: 700,
            lineHeight: "14px",
            color:      "var(--surface\\/bg-inverse, #ffffff)",
          }}>
            ✓
          </span>
        )}
        {isIndeterminate && (
          <div style={{
            width:        "10px",
            height:       "2px",
            borderRadius: "1px",
            background:   "var(--text\\/inverse, #0f0f13)",
          }} />
        )}
      </div>

      <span style={labelStyle}>{label}</span>
    </div>
  );
}
