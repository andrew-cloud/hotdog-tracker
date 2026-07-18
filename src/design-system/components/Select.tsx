import React, { useState } from "react";

// ── Types ─────────────────────────────────────────────

export type SelectState = "default" | "open" | "selected" | "error" | "disabled";

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  state?:       SelectState;
  label?:       string;
  options?:     SelectOption[];
  value?:       string;
  placeholder?: string;
  errorText?:   string;
  onChange?:    (value: string) => void;
  className?:   string;
  style?:       React.CSSProperties;
}

// ── Select ────────────────────────────────────────────
// Uses the native OS <select> for the dropdown panel.
// The field wrapper matches DS token styling; the picker
// itself is rendered by the operating system.

export default function Select({
  state       = "default",
  label       = "Category",
  options     = [],
  value,
  placeholder = "— Choose —",
  errorText   = "This field is required",
  onChange,
  className,
  style,
}: SelectProps) {
  const [internalValue, setInternalValue] = useState<string>("");

  const isDisabled   = state === "disabled";
  const isError      = state === "error";
  const currentValue = value ?? internalValue;
  const hasValue     = !!currentValue;

  // Derive display state for token lookups
  const stateKey = isDisabled ? "disabled"
    : isError    ? "error"
    : hasValue   ? "selected"
    : "default";

  const FIELD_BG: Record<string, string> = {
    default:  "var(--component\\/input-bg, #FFFFFF)",
    selected: "var(--component\\/input-bg, #FFFFFF)",
    error:    "var(--component\\/input-bg-error, #FDEAEA)",
    disabled: "var(--component\\/input-bg, #FFFFFF)",
  };

  const FIELD_BORDER: Record<string, string> = {
    default:  "1px solid var(--component\\/input-border, #E4D6C7)",
    selected: "1px solid var(--component\\/input-border, #E4D6C7)",
    error:    "1px solid var(--component\\/input-border-error, #e85c5c)",
    disabled: "1px solid var(--component\\/input-border, #E4D6C7)",
  };

  const VALUE_COLOR: Record<string, string> = {
    default:  "var(--text\\/tertiary, #727272)",
    selected: "var(--component\\/input-text, #121212)",
    error:    "var(--text\\/tertiary, #727272)",
    disabled: "var(--text\\/disabled, #515151)",
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setInternalValue(val);
    onChange?.(val);
  };

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", ...style }}>

      {/* Label */}
      <p style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize:   "16px",
        fontWeight: 600,
        lineHeight: "22px",
        color:      "var(--text\\/secondary, #727272)",
        margin:     0,
      }}>
        {label}
      </p>

      {/* Field wrapper — positions the custom chevron over the native select */}
      <div style={{ position: "relative", width: "100%", flexShrink: 0 }}>

        <select
          value={currentValue}
          disabled={isDisabled}
          onChange={handleChange}
          aria-invalid={isError}
          style={{
            display:          "block",
            width:            "100%",
            padding:          "12px 36px 12px 12px", // matches Input's 12px field padding so the two controls share the same overall height
            boxSizing:        "border-box",
            background:       FIELD_BG[stateKey],
            border:           FIELD_BORDER[stateKey],
            borderRadius:     "var(--radius\\/md, 6px)",
            color:            VALUE_COLOR[stateKey],
            fontFamily:       "'Space Grotesk', sans-serif",
            // iOS Safari zooms on inputs < 16px — 16px prevents zoom
            fontSize:         "16px",
            fontWeight:       500,
            lineHeight:       "22px", // matches Input's line-height
            // Hide the browser's native arrow — we render our own
            appearance:       "none",
            WebkitAppearance: "none",
            MozAppearance:    "none",
            cursor:           isDisabled ? "not-allowed" : "pointer",
            opacity:          isDisabled ? 0.5 : 1,
            outline:          "none",
            transition:       "border-color 0.15s ease, background 0.15s ease",
          }}
        >
          {/* Disabled hidden placeholder so the field shows placeholder text
              when nothing is selected, but it can't be re-selected */}
          <option value="" disabled hidden>{placeholder}</option>

          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom chevron — pointer-events: none so clicks pass through to the select */}
        <span aria-hidden style={{
          position:      "absolute",
          right:         "12px",
          top:           "50%",
          transform:     "translateY(-50%)",
          pointerEvents: "none",
          fontFamily:    "'Space Grotesk', sans-serif",
          fontSize:      "11px",
          fontWeight:    500,
          lineHeight:    "16px",
          color:         isError
            ? "var(--semantic\\/danger, #e85c5c)"
            : "var(--text\\/tertiary, #727272)",
          userSelect:    "none",
        }}>
          ▾
        </span>
      </div>

      {/* Error hint */}
      {isError && (
        <p style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize:   "16px",
          fontWeight: 500,
          lineHeight: "22px",
          color:      "var(--semantic\\/danger, #e85c5c)",
          margin:     0,
        }}>
          {errorText}
        </p>
      )}

    </div>
  );
}
