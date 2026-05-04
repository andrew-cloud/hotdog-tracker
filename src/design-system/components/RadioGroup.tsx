import React from "react";
import Radio from "./Radio";

// ── Types ─────────────────────────────────────────────

export interface RadioOption {
  value:     string | number;
  label:     string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  options:   RadioOption[];
  value?:    string | number;
  onChange?: (value: string | number) => void;
  /** Passed to the underlying radio inputs for accessibility */
  name?:     string;
  gap?:      number | string;
  className?: string;
  style?:    React.CSSProperties;
}

// ── RadioGroup ────────────────────────────────────────

export default function RadioGroup({
  options,
  value,
  onChange,
  name,
  gap    = 12,
  className,
  style,
}: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      className={className}
      style={{
        display:       "flex",
        flexDirection: "column",
        gap:           typeof gap === "number" ? `${gap}px` : gap,
        ...style,
      }}
    >
      {options.map(opt => (
        <Radio
          key={opt.value}
          label={opt.label}
          state={
            opt.disabled        ? "disabled"
            : value === opt.value ? "selected"
            : "unselected"
          }
          onChange={() => {
            if (!opt.disabled) onChange?.(opt.value);
          }}
          // Hidden native input for form semantics
          style={{ position: "relative" }}
        />
      ))}
    </div>
  );
}
