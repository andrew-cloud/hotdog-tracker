import React from "react";

// ── Types ─────────────────────────────────────────────

export type RadioState = "unselected" | "selected" | "disabled";

export interface RadioProps {
  state?:    RadioState;
  label?:    string;
  onChange?: () => void;
  className?: string;
  style?:    React.CSSProperties;
}

// ── Component ─────────────────────────────────────────

export default function Radio({
  state     = "unselected",
  label     = "Option label",
  onChange,
  className,
  style,
}: RadioProps) {
  const isSelected = state === "selected";
  const isDisabled = state === "disabled";

  const wrapperStyle: React.CSSProperties = {
    display:    "flex",
    gap:        "10px",
    alignItems: "center",
    position:   "relative",
    opacity:    isDisabled ? 0.45 : 1,
    cursor:     isDisabled ? "not-allowed" : "pointer",
    ...style,
  };

  const circleStyle: React.CSSProperties = {
    flexShrink:     0,
    width:          "18px",
    height:         "18px",
    borderRadius:   "50%",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    background:     "var(--surface\\/bg-tertiary, #1e1e28)",
    border:         isSelected
      ? "2px solid var(--brand\\/amber, #e8a44a)"
      : isDisabled
      ? "1px solid var(--surface\\/border-default, #2e2e40)"
      : "1px solid var(--component\\/input-border, #3a3a52)",
    boxSizing: "border-box",
  };

  const dotStyle: React.CSSProperties = {
    width:        "8px",
    height:       "8px",
    borderRadius: "50%",
    background:   "var(--brand\\/amber, #e8a44a)",
    flexShrink:   0,
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
    if (!isDisabled && onChange) onChange();
  };

  return (
    <div
      className={className}
      style={wrapperStyle}
      role="radio"
      aria-checked={isSelected}
      aria-disabled={isDisabled}
      onClick={handleClick}
    >
      <div style={circleStyle}>
        {isSelected && <div style={dotStyle} />}
      </div>

      <span style={labelStyle}>{label}</span>
    </div>
  );
}
