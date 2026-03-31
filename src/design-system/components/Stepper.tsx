import React, { useState } from "react";

// ── Types ─────────────────────────────────────────────

export interface StepperProps {
  /** Controlled value */
  value?:        number;
  /** Default value when uncontrolled */
  defaultValue?: number;
  /** Minimum allowed value */
  min?:          number;
  /** Maximum allowed value */
  max?:          number;
  /** Amount to increment/decrement per click */
  step?:         number;
  /** Label displayed above the control */
  label?:        string;
  /** Whether to show the label */
  showLabel?:    boolean;
  /** Disable the entire component */
  disabled?:     boolean;
  /** Called when the value changes */
  onChange?:     (value: number) => void;
  className?:    string;
  style?:        React.CSSProperties;
}

// ── StepperButton (internal) ──────────────────────────

interface StepperButtonProps {
  char:      string;
  disabled?: boolean;
  onClick?:  () => void;
  ariaLabel: string;
}

function StepperButton({ char, disabled = false, onClick, ariaLabel }: StepperButtonProps) {
  const [hovered, setHovered] = useState(false);

  const bg = (!disabled && hovered)
    ? "var(--component\\/btn-primary-bg-hover, #c4853a)"
    : "var(--component\\/btn-primary-bg, #e8a44a)";

  return (
    <button
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        flexShrink:     0,
        width:          "40px",
        height:         "40px",
        borderRadius:   "8px",
        border:         "none",
        background:     bg,
        opacity:        disabled ? 0.40 : 1,
        cursor:         disabled ? "not-allowed" : "pointer",
        padding:        0,
        transition:     "background 0.15s ease, opacity 0.15s ease",
      }}
    >
      <span style={{
        fontFamily:    "Inter, sans-serif",
        fontSize:      "18px",
        fontWeight:    700,
        lineHeight:    "20px",
        color:         "var(--surface\\/bg-primary, #0f0f13)",
        userSelect:    "none",
        pointerEvents: "none",
      }}>
        {char}
      </span>
    </button>
  );
}

// ── Divider (internal) ────────────────────────────────

function Divider() {
  return (
    <div style={{
      width:      "1px",
      alignSelf:  "stretch",
      background: "var(--component\\/input-border, #3a3a52)",
      flexShrink: 0,
    }} />
  );
}

// ── Stepper ───────────────────────────────────────────

export default function Stepper({
  value: controlledValue,
  defaultValue = 0,
  min,
  max,
  step      = 1,
  label,
  showLabel = true,
  disabled  = false,
  onChange,
  className,
  style,
}: StepperProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value        = isControlled ? controlledValue : internalValue;

  const atMin = min !== undefined && value <= min;
  const atMax = max !== undefined && value >= max;

  const decrement = () => {
    if (disabled || atMin) return;
    const next = min !== undefined ? Math.max(value - step, min) : value - step;
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
  };

  const increment = () => {
    if (disabled || atMax) return;
    const next = max !== undefined ? Math.min(value + step, max) : value + step;
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
  };

  return (
    <div
      className={className}
      style={{
        display:       "flex",
        flexDirection: "column",
        gap:           "8px",
        alignItems:    "flex-start",
        position:      "relative",
        opacity:       disabled ? 0.45 : 1,
        ...style,
      }}
    >
      {/* Label */}
      {showLabel && label && (
        <span style={{
          fontFamily: "Inter, sans-serif",
          fontSize:   "12px",
          fontWeight: 600,
          lineHeight: "18px",
          color:      "var(--text\\/secondary, #6b6882)",
          whiteSpace: "nowrap",
          userSelect: "none",
        }}>
          {label}
        </span>
      )}

      {/* Control row */}
      <div
        role="group"
        aria-label={label ?? "Stepper"}
        style={{
          display:      "flex",
          alignItems:   "center",
          overflow:     "hidden",
          borderRadius: "8px",
          border:       "1px solid var(--component\\/input-border, #3a3a52)",
          flexShrink:   0,
          boxSizing:    "border-box",
        }}
      >
        <StepperButton
          char="−"
          disabled={disabled || atMin}
          onClick={decrement}
          ariaLabel="Decrease value"
        />

        <Divider />

        {/* Value display */}
        <div
          aria-live="polite"
          aria-atomic="true"
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            width:          "72px",
            height:         "40px",
            background:     "var(--component\\/input-bg, #1e1e28)",
            flexShrink:     0,
          }}
        >
          <span style={{
            fontFamily: "Inter, sans-serif",
            fontSize:   "16px",
            fontWeight: 700,
            lineHeight: "20px",
            color:      "var(--text\\/primary, #f0ede6)",
            textAlign:  "center",
            userSelect: "none",
          }}>
            {value}
          </span>
        </div>

        <Divider />

        <StepperButton
          char="+"
          disabled={disabled || atMax}
          onClick={increment}
          ariaLabel="Increase value"
        />
      </div>
    </div>
  );
}
