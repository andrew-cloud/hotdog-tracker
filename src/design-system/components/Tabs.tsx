import React, { useState } from "react";

// ── Types ─────────────────────────────────────────────

export type TabVariant = "tabular" | "pointing" | "secondary-pointing" | "secondary";
export type TabState   = "default" | "active" | "hover" | "disabled";

export interface Tab {
  label:     string;
  value:     string;
  disabled?: boolean;
}

// ── Token maps ────────────────────────────────────────

function getInnerStyle(variant: TabVariant, state: TabState): React.CSSProperties {
  const base: React.CSSProperties = {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    overflow:       "hidden",
    padding:        "10px 16px",
    flexShrink:     0,
    width:          "100%",
    boxSizing:      "border-box",
  };

  switch (variant) {
    case "tabular":
      return {
        ...base,
        borderRadius:    state === "active" ? "6px 6px 0 0" : "6px 6px 0 0",
        background:
          state === "active" ? "var(--component\\/tab-bg-active, #16161d)" :
          state === "hover"  ? "var(--component\\/tab-bg-hover, #242432)"  :
                               "var(--component\\/tab-bg-default, #1e1e28)",
        border: state === "active"
          ? "1px solid var(--component\\/tab-border, #2e2e40)"
          : "none",
      };

    case "pointing":
    case "secondary-pointing":
      return {
        ...base,
        background: state === "hover" ? "var(--component\\/tab-bg-hover, #242432)" : "transparent",
      };

    case "secondary":
      return {
        ...base,
        borderRadius: "var(--radius\\/md, 6px)",
        background:
          state === "active" ? "var(--component\\/tab-bg-active, #16161d)" :
          state === "hover"  ? "var(--component\\/tab-bg-hover, #242432)"  :
                               "transparent",
        border: state === "active"
          ? "1px solid var(--component\\/tab-border, #2e2e40)"
          : "none",
      };
  }
}

function getLabelColor(variant: TabVariant, state: TabState): string {
  if (state === "disabled") return "var(--component\\/tab-text-disabled, #4a4860)";
  if (state === "hover")    return "var(--component\\/tab-text-hover, #f0ede6)";
  if (state === "active") {
    return (variant === "pointing" || variant === "secondary-pointing")
      ? "var(--component\\/tab-indicator, #e8a44a)"
      : "var(--component\\/tab-text-active, #f0ede6)";
  }
  return "var(--component\\/tab-text-default, #6b6882)";
}

// ── TabRail ───────────────────────────────────────────

export function TabRail({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{
      display:  "flex",
      height:   "1px",
      flexShrink: 0,
      width:    "100%",
      ...style,
    }}>
      <div style={{
        flex:       "1 0 0",
        height:     "1px",
        minHeight:  "1px",
        minWidth:   "1px",
        background: "var(--component\\/tab-border, #2e2e40)",
      }} />
    </div>
  );
}

// ── TabItem ───────────────────────────────────────────

export interface TabItemProps {
  label:    string;
  variant?: TabVariant;
  state?:   TabState;
  onClick?: () => void;
  style?:   React.CSSProperties;
}

export function TabItem({
  label,
  variant = "tabular",
  state   = "default",
  onClick,
  style,
}: TabItemProps) {
  const [hovered, setHovered] = useState(false);
  const isDisabled = state === "disabled";

  const effectiveState: TabState = isDisabled ? "disabled"
    : hovered && state !== "active" ? "hover"
    : state;

  const showRail      = variant === "tabular" && effectiveState !== "active";
  const showIndicator = effectiveState === "active" && (variant === "pointing" || variant === "secondary-pointing");
  const indicatorH    = variant === "pointing" ? "3px" : "2px";
  const indicatorR    = variant === "pointing" ? "2px" : "1px";

  return (
    <div
      style={{
        display:    "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        position:   "relative",
        flex:       "1 0 0",
        minWidth:   "1px",
        minHeight:  "1px",
        opacity:    isDisabled ? 0.4 : 1,
        cursor:     isDisabled ? "not-allowed" : "pointer",
        ...style,
      }}
      onClick={!isDisabled ? onClick : undefined}
      onMouseEnter={() => !isDisabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={getInnerStyle(variant, effectiveState)}>
        <span style={{
          fontFamily: "Inter, sans-serif",
          fontSize:   "16px",
          fontWeight: 500,
          lineHeight: "22px",
          color:      getLabelColor(variant, effectiveState),
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}>
          {label}
        </span>
      </div>

      {showRail && (
        <div style={{
          background: "var(--component\\/tab-border, #2e2e40)",
          height:     "1px",
          flexShrink: 0,
          width:      "100%",
        }} />
      )}

      {showIndicator && (
        <div style={{
          background:   "var(--component\\/tab-indicator, #e8a44a)",
          height:       indicatorH,
          borderRadius: indicatorR,
          flexShrink:   0,
          width:        "100%",
        }} />
      )}
    </div>
  );
}

// ── TabBar ────────────────────────────────────────────

export interface TabBarProps {
  tabs:          Tab[];
  variant?:      TabVariant;
  defaultValue?: string;
  value?:        string;
  onChange?:     (value: string) => void;
  children?:     (activeValue: string) => React.ReactNode;
  className?:    string;
  style?:        React.CSSProperties;
}

export default function TabBar({
  tabs,
  variant      = "tabular",
  defaultValue,
  value,
  onChange,
  children,
  className,
  style,
}: TabBarProps) {
  const [activeValue, setActiveValue] = useState(
    value ?? defaultValue ?? tabs.find(t => !t.disabled)?.value ?? ""
  );

  const currentValue = value ?? activeValue;

  const handleSelect = (val: string) => {
    setActiveValue(val);
    onChange?.(val);
  };

  // Content pane radius — tabular: square top-left to join active tab
  const paneRadius = variant === "tabular"
    ? "0 var(--radius\\/md, 6px) var(--radius\\/md, 6px) var(--radius\\/md, 6px)"
    : "var(--radius\\/md, 6px)";

  const showRail    = variant !== "secondary";
  const showPane    = !!children;

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%", ...style }}>
      {/* Tab row */}
      <div style={{
        display:    "flex",
        alignItems: "flex-end",
        flexShrink: 0,
        width:      "100%",
      }}>
        {tabs.map(tab => (
          <TabItem
            key={tab.value}
            label={tab.label}
            variant={variant}
            state={tab.disabled ? "disabled" : tab.value === currentValue ? "active" : "default"}
            onClick={() => handleSelect(tab.value)}
          />
        ))}
      </div>

      {/* Rail */}
      {showRail && <TabRail />}

      {/* Content pane */}
      {showPane && (
        <div style={{
          width:      "100%",
          background: variant === "secondary"
            ? "var(--surface\\/bg-tertiary, #1e1e28)"
            : "var(--component\\/tab-bg-active, #16161d)",
          border:     variant === "secondary"
            ? "none"
            : "1px solid var(--component\\/tab-border, #2e2e40)",
          borderTop:  showRail ? "none" : undefined,
          borderRadius: paneRadius,
          boxSizing:  "border-box",
        }}>
          {children(currentValue)}
        </div>
      )}
    </div>
  );
}
