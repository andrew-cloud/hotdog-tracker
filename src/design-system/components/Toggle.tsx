import React from "react";

// ── Types ─────────────────────────────────────────────

export type ToggleState = "off" | "on" | "disabled-off" | "disabled-on";

export interface ToggleProps {
  state?:    ToggleState;
  label?:    string;
  onChange?: (on: boolean) => void;
  className?: string;
  style?:    React.CSSProperties;
}

// ── Component ─────────────────────────────────────────

export default function Toggle({
  state     = "off",
  label,
  onChange,
  className,
  style,
}: ToggleProps) {
  const isOn       = state === "on" || state === "disabled-on";
  const isDisabled = state === "disabled-off" || state === "disabled-on";

  const defaultLabel = isOn ? "Enabled" : "Disabled";

  const wrapperStyle: React.CSSProperties = {
    display:    "flex",
    gap:        "10px",
    alignItems: "center",
    position:   "relative",
    opacity:    isDisabled ? 0.40 : 1,
    cursor:     isDisabled ? "not-allowed" : "pointer",
    ...style,
  };

  const trackStyle: React.CSSProperties = {
    position:     "relative",
    flexShrink:   0,
    width:        "40px",
    height:       "22px",
    borderRadius: "11px",
    background:   isOn
      ? "var(--brand\\/amber, #e8a44a)"
      : "var(--surface\\/bg-tertiary, #1e1e28)",
    border:       isOn
      ? "none"
      : "1px solid var(--component\\/input-border, #3a3a52)",
    boxSizing:    "border-box",
    transition:   "background 0.2s ease",
  };

  const thumbStyle: React.CSSProperties = {
    position:     "absolute",
    top:          "3px",
    left:         isOn ? "20px" : "3px",
    width:        "16px",
    height:       "16px",
    borderRadius: "50%",
    background:   "#ffffff",
    transition:   "left 0.2s ease",
    boxShadow:    "0 1px 3px rgba(0,0,0,0.3)",
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
    if (!isDisabled && onChange) onChange(!isOn);
  };

  return (
    <div
      className={className}
      style={wrapperStyle}
      role="switch"
      aria-checked={isOn}
      aria-disabled={isDisabled}
      onClick={handleClick}
    >
      <div style={trackStyle}>
        <div style={thumbStyle} />
      </div>

      <span style={labelStyle}>{label ?? defaultLabel}</span>
    </div>
  );
}
