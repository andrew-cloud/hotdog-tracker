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
    background:     "transparent",
    border:         isSelected
      ? "2px solid var(--brand\\/orange, #F06705)"
      : isDisabled
      ? "1px solid var(--component\\/input-border, #E4D6C7)"
      : "1px solid var(--component\\/input-border, #E4D6C7)",
    boxSizing: "border-box",
  };

  const dotStyle: React.CSSProperties = {
    width:        "8px",
    height:       "8px",
    borderRadius: "50%",
    background:   "var(--brand\\/orange, #F06705)",
    flexShrink:   0,
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize:   "16px",
    fontWeight: 500,
    lineHeight: "22px",
    color:      isDisabled
      ? "var(--text\\/disabled, #515151)"
      : isSelected
      ? "var(--component\\/input-text, #121212)"
      : "var(--text\\/secondary, #727272)",
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
