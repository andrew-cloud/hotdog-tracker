import React, { useState, useRef, useEffect } from "react";

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

// ── Token maps ────────────────────────────────────────

const FIELD_BG: Record<SelectState, string> = {
  default:  "var(--component\\/input-bg, #1e1e28)",
  open:     "var(--component\\/input-bg-focus, #16161d)",
  selected: "var(--component\\/input-bg, #1e1e28)",
  error:    "var(--component\\/input-bg-error, #2a0808)",
  disabled: "var(--surface\\/bg-primary, #0f0f13)",
};

const FIELD_BORDER: Record<SelectState, string> = {
  default:  "1px solid var(--component\\/input-border, #3a3a52)",
  open:     "2px solid var(--component\\/input-border-focus, #e8a44a)",
  selected: "1px solid var(--component\\/input-border, #3a3a52)",
  error:    "1px solid var(--component\\/input-border-error, #e85c5c)",
  disabled: "1px solid var(--surface\\/border-default, #2e2e40)",
};

const VALUE_COLOR: Record<SelectState, string> = {
  default:  "var(--text\\/tertiary, #6b6882)",
  open:     "var(--text\\/primary, #f0ede6)",
  selected: "var(--text\\/primary, #f0ede6)",
  error:    "var(--text\\/tertiary, #6b6882)",
  disabled: "var(--text\\/disabled, #4a4860)",
};

const CHEVRON_COLOR: Record<SelectState, string> = {
  default:  "var(--text\\/tertiary, #6b6882)",
  open:     "var(--text\\/tertiary, #6b6882)",
  selected: "var(--text\\/tertiary, #6b6882)",
  error:    "var(--semantic\\/danger, #e85c5c)",
  disabled: "var(--text\\/tertiary, #6b6882)",
};

const FIELD_PADDING: Record<SelectState, string> = {
  default:  "9px 12px",
  open:     "9px 12px",
  selected: "9px 12px",
  error:    "12px",   // matches spacing/3 — aligns with input error
  disabled: "9px 12px",
};

// ── Default options ───────────────────────────────────

const DEFAULT_OPTIONS: SelectOption[] = [
  { label: "Design",      value: "design"      },
  { label: "Engineering", value: "engineering" },
  { label: "Marketing",   value: "marketing"   },
];

// ── SelectOption sub-component ────────────────────────

interface OptionItemProps {
  option:   SelectOption;
  active?:  boolean;
  onSelect: (value: string) => void;
}

function OptionItem({ option, active = false, onSelect }: OptionItemProps) {
  const [hovered, setHovered] = useState(false);

  const style: React.CSSProperties = {
    display:    "flex",
    alignItems: "center",
    padding:    "8px 12px",
    height:     "36px",
    flexShrink: 0,
    width:      "100%",
    background: active
      ? "var(--brand\\/amber-subtle, #2a1e08)"
      : hovered
      ? "var(--surface\\/bg-surface, #242432)"
      : "transparent",
    cursor:     "pointer",
    boxSizing:  "border-box",
  };

  const labelStyle: React.CSSProperties = {
    flex:         "1 0 0",
    fontFamily:   "Inter, sans-serif",
    fontSize:     "14px",
    fontWeight:   400,
    lineHeight:   "20px",
    height:       "20px",
    overflow:     "hidden",
    textOverflow: "ellipsis",
    whiteSpace:   "nowrap",
    minWidth:     0,
    color:        active
      ? "var(--brand\\/amber, #e8a44a)"
      : "var(--text\\/secondary, #9e9bb4)",
  };

  return (
    <div
      style={style}
      role="option"
      aria-selected={active}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(option.value)}
    >
      <span style={labelStyle}>{option.label}</span>
    </div>
  );
}

// ── SelectDropdownPanel sub-component ────────────────

interface DropdownPanelProps {
  options:       SelectOption[];
  selectedValue?: string;
  onSelect:      (value: string) => void;
  width:         number;
}

function DropdownPanel({ options, selectedValue, onSelect, width }: DropdownPanelProps) {
  const style: React.CSSProperties = {
    position:     "absolute",
    top:          "100%",
    left:         0,
    marginTop:    "4px",
    width:        `${width}px`,
    background:   "var(--surface\\/bg-tertiary, #1e1e28)",
    border:       "1px solid var(--component\\/input-border, #3a3a52)",
    borderRadius: "var(--radius\\/md, 6px)",
    overflow:     "hidden",
    paddingTop:   "4px",
    paddingBottom:"4px",
    zIndex:       50,
    boxSizing:    "border-box",
  };

  return (
    <div style={style} role="listbox">
      {options.map(opt => (
        <OptionItem
          key={opt.value}
          option={opt}
          active={opt.value === selectedValue}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

// ── Select ────────────────────────────────────────────

export default function Select({
  state       = "default",
  label       = "Category",
  options     = DEFAULT_OPTIONS,
  value,
  placeholder = "— Choose —",
  errorText   = "This field is required",
  onChange,
  className,
  style,
}: SelectProps) {
  const [isOpen, setIsOpen]         = useState(false);
  const [selected, setSelected]     = useState<string | undefined>(value);
  const wrapperRef                  = useRef<HTMLDivElement>(null);
  const [fieldWidth, setFieldWidth] = useState(220);

  const isDisabled     = state === "disabled";
  const isError        = state === "error";
  const currentValue   = value ?? selected;
  const selectedOption = options.find(o => o.value === currentValue);

  // Derive display state
  const displayState: SelectState = isDisabled ? "disabled"
    : isError        ? "error"
    : isOpen         ? "open"
    : currentValue   ? "selected"
    : "default";

  // Measure field width for dropdown
  useEffect(() => {
    if (wrapperRef.current) setFieldWidth(wrapperRef.current.offsetWidth);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (val: string) => {
    setSelected(val);
    setIsOpen(false);
    onChange?.(val);
  };

  const wrapperStyle: React.CSSProperties = {
    display:    "flex",
    flexDirection: "column",
    gap:        "6px",
    alignItems: "flex-start",
    position:   "relative",
    width:      "100%",
    ...style,
  };

  const fieldStyle: React.CSSProperties = {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "space-between",
    overflow:       "hidden",
    padding:        FIELD_PADDING[displayState],
    borderRadius:   "var(--radius\\/md, 6px)",
    flexShrink:     0,
    width:          "100%",
    background:     FIELD_BG[displayState],
    border:         FIELD_BORDER[displayState],
    opacity:        isDisabled ? 0.5 : 1,
    cursor:         isDisabled ? "not-allowed" : "pointer",
    whiteSpace:     "nowrap",
    boxSizing:      "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "Inter, sans-serif",
    fontSize:   "12px",
    fontWeight: 600,
    lineHeight: "18px",
    color:      "var(--text\\/secondary, #9e9bb4)",
    width:      "100%",
    flexShrink: 0,
    margin:     0,
  };

  const valueStyle: React.CSSProperties = {
    flex:         "1 0 0",
    fontFamily:   "Inter, sans-serif",
    fontSize:     "14px",
    fontWeight:   400,
    lineHeight:   "20px",
    height:       "20px",
    overflow:     "hidden",
    textOverflow: "ellipsis",
    color:        VALUE_COLOR[displayState],
    minWidth:     0,
  };

  const chevronStyle: React.CSSProperties = {
    fontFamily: "Inter, sans-serif",
    fontSize:   "11px",
    lineHeight: "16px",
    color:      CHEVRON_COLOR[displayState],
    flexShrink: 0,
  };

  const hintStyle: React.CSSProperties = {
    fontFamily: "Inter, sans-serif",
    fontSize:   "11px",
    fontWeight: 400,
    lineHeight: "16px",
    color:      "var(--semantic\\/danger, #e85c5c)",
    width:      "100%",
    flexShrink: 0,
    margin:     0,
  };

  return (
    <div ref={wrapperRef} className={className} style={wrapperStyle}>
      <p style={labelStyle}>{label}</p>

      <div
        style={fieldStyle}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={isDisabled}
        onClick={() => !isDisabled && setIsOpen(prev => !prev)}
      >
        <span style={valueStyle}>
          {selectedOption?.label ?? placeholder}
        </span>
        <span style={chevronStyle}>{isOpen ? "▴" : "▾"}</span>
      </div>

      {isError && <p style={hintStyle}>{errorText}</p>}

      {isOpen && !isDisabled && (
        <DropdownPanel
          options={options}
          selectedValue={currentValue}
          onSelect={handleSelect}
          width={fieldWidth}
        />
      )}
    </div>
  );
}
