import React, { useState } from "react";

// ── Types ─────────────────────────────────────────────

export type ButtonStyle = "primary" | "secondary" | "positive" | "negative" | "basic" | "info";
export type ButtonState = "default" | "hover" | "disabled" | "loading";
export type ButtonSize  = "mini" | "small" | "medium" | "large" | "big";

export interface ButtonProps {
  /** Visual style */
  buttonStyle?: ButtonStyle;
  /** Size variant */
  size?:        ButtonSize;
  /** Explicit state override — if omitted, hover/loading are handled internally */
  state?:       ButtonState;
  /** Button label */
  label?:       string;
  /** Click handler */
  onClick?:     () => void | Promise<void>;
  /** Whether the button is disabled */
  disabled?:    boolean;
  /** Whether the button is in a loading state */
  loading?:     boolean;
  className?:   string;
  style?:       React.CSSProperties;
}

// ── Size tokens ───────────────────────────────────────

interface SizeCfg {
  paddingX:   number;
  paddingY:   number;
  fontSize:   number;
  lineHeight: number;
  spinnerSz:  number;
  gap:        number;
}

const SIZE_CFG: Record<ButtonSize, SizeCfg> = {
  mini:   { paddingX:  8, paddingY:  4, fontSize: 11, lineHeight: 15, spinnerSz:  9, gap:  6 },
  small:  { paddingX: 12, paddingY:  6, fontSize: 12, lineHeight: 16, spinnerSz: 10, gap:  7 },
  medium: { paddingX: 16, paddingY:  9, fontSize: 14, lineHeight: 20, spinnerSz: 12, gap:  8 },
  large:  { paddingX: 20, paddingY: 11, fontSize: 16, lineHeight: 22, spinnerSz: 14, gap:  9 },
  big:    { paddingX: 24, paddingY: 13, fontSize: 18, lineHeight: 26, spinnerSz: 16, gap: 10 },
};

// ── Style tokens ──────────────────────────────────────

interface StyleCfg {
  /** Default/disabled background */
  bg:         string;
  /** Hover background */
  bgHover:    string;
  /** Label colour */
  color:      string;
  /** Border (undefined = no border) */
  border?:    string;
}

const STYLE_CFG: Record<ButtonStyle, StyleCfg> = {
  primary: {
    bg:      "var(--component\\/btn-primary-bg, #e8a44a)",
    bgHover: "#c4853a",
    color:   "var(--component\\/btn-primary-text, #0f0f13)",
  },
  secondary: {
    bg:      "var(--component\\/btn-secondary-bg, #1e1e28)",
    bgHover: "#2e2e40",
    color:   "var(--component\\/btn-secondary-text, #f0ede6)",
    border:  "#3a3a52",
  },
  positive: {
    bg:      "var(--semantic\\/success, #5bba6f)",
    bgHover: "var(--semantic\\/success, #5bba6f)",
    color:   "#0d2112",
  },
  negative: {
    bg:      "var(--semantic\\/danger, #e85c5c)",
    bgHover: "var(--semantic\\/danger, #e85c5c)",
    color:   "#210d0d",
  },
  basic: {
    bg:      "transparent",
    bgHover: "transparent",
    color:   "var(--text\\/secondary, #9e9bb4)",
    border:  "#3a3a52",
  },
  info: {
    bg:      "var(--semantic\\/info, #5b9ee8)",
    bgHover: "var(--semantic\\/info, #5b9ee8)",
    color:   "#0d1f33",
  },
};

// ── CSS spinner (replaces Figma image asset) ──────────

const SPINNER_KEYFRAMES = `
@keyframes hds-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
`;

let spinnerStyleInjected = false;
function injectSpinnerStyle() {
  if (spinnerStyleInjected || typeof document === "undefined") return;
  const tag = document.createElement("style");
  tag.textContent = SPINNER_KEYFRAMES;
  document.head.appendChild(tag);
  spinnerStyleInjected = true;
}

function Spinner({ size, color }: { size: number; color: string }) {
  injectSpinnerStyle();
  return (
    <span
      aria-hidden
      style={{
        display:     "inline-block",
        flexShrink:  0,
        width:       `${size}px`,
        height:      `${size}px`,
        borderRadius:"50%",
        border:      `2px solid ${color}33`,
        borderTopColor: color,
        animation:   "hds-spin 0.7s linear infinite",
        boxSizing:   "border-box",
      }}
    />
  );
}

// ── Button ────────────────────────────────────────────

export default function Button({
  buttonStyle = "primary",
  size        = "medium",
  state,
  label,
  onClick,
  disabled,
  loading,
  className,
  style,
}: ButtonProps) {
  const [internalHover, setInternalHover] = useState(false);

  const isDisabled = disabled || state === "disabled";
  const isLoading  = loading  || state === "loading";
  const isHovered  = state === "hover" || (!state && internalHover && !isDisabled && !isLoading);

  const sc = STYLE_CFG[buttonStyle];
  const sz = SIZE_CFG[size];

  // Derive background
  const bg = isHovered ? sc.bgHover : sc.bg;

  // Default labels per style
  const defaultLabels: Record<ButtonStyle, string> = {
    primary:   "Primary",
    secondary: "Secondary",
    positive:  "Positive",
    negative:  "Negative",
    basic:     "Basic",
    info:      "Info",
  };
  const displayLabel = isLoading ? "Loading…" : (label ?? defaultLabels[buttonStyle]);

  const btnStyle: React.CSSProperties = {
    display:        "inline-flex",
    alignItems:     "center",
    justifyContent: "center",
    gap:            isLoading ? `${sz.gap}px` : undefined,
    padding:        `${sz.paddingY}px ${sz.paddingX}px`,
    borderRadius:   "6px",
    border:         sc.border ? `1px solid ${sc.border}` : "none",
    background:     bg,
    opacity:        isDisabled ? 0.40 : 1,
    cursor:         isDisabled ? "not-allowed" : isLoading ? "default" : "pointer",
    whiteSpace:     "nowrap",
    position:       "relative",
    flexShrink:     0,
    boxSizing:      "border-box",
    transition:     "background 0.15s ease, opacity 0.15s ease",
    ...style,
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "Inter, sans-serif",
    fontSize:   `${sz.fontSize}px`,
    fontWeight: 600,
    lineHeight: `${sz.lineHeight}px`,
    color:      sc.color,
    whiteSpace: "nowrap",
    flexShrink: 0,
  };

  const handleClick = async () => {
    if (isDisabled || isLoading || !onClick) return;
    await onClick();
  };

  return (
    <button
      className={className}
      style={btnStyle}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={isLoading}
      onClick={handleClick}
      onMouseEnter={() => setInternalHover(true)}
      onMouseLeave={() => setInternalHover(false)}
    >
      {isLoading && <Spinner size={sz.spinnerSz} color={sc.color} />}
      <span style={labelStyle}>{displayLabel}</span>
    </button>
  );
}
