import React, { useState } from "react";

// ── Types ─────────────────────────────────────────────

export type TabVariant = "tabular" | "pointing" | "secondary-pointing" | "secondary" | "chip";
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
          state === "active" ? "var(--component\\/tab-bg-active, #181818)" :
          state === "hover"  ? "var(--component\\/tab-bg-hover, #292929)"  :
                               "var(--component\\/tab-bg-default, #212121)",
        border: state === "active"
          ? "1px solid var(--component\\/tab-border, #343434)"
          : "none",
      };

    case "pointing":
    case "secondary-pointing":
      return {
        ...base,
        background: state === "hover" ? "var(--component\\/tab-bg-hover, #292929)" : "transparent",
      };

    case "secondary":
      return {
        ...base,
        borderRadius: "var(--radius\\/md, 6px)",
        background:
          state === "active" ? "var(--component\\/tab-bg-active, #181818)" :
          state === "hover"  ? "var(--component\\/tab-bg-hover, #292929)"  :
                               "transparent",
        border: state === "active"
          ? "1px solid var(--component\\/tab-border, #343434)"
          : "none",
      };

    case "chip":
      return {
        ...base,
        width:        "auto",
        padding:      "8px 16px",
        borderRadius: "var(--radius\\/pill, 9999px)",
        background:
          state === "active" ? "var(--component\\/tab-bg-active, #181818)" :
          state === "hover"  ? "var(--component\\/tab-bg-hover, #292929)"  :
                               "transparent",
        border: state === "active"
          ? "1px solid var(--component\\/tab-border, #343434)"
          : "1px solid transparent",
      };
  }
}

function getLabelColor(variant: TabVariant, state: TabState): string {
  if (state === "disabled") return "var(--component\\/tab-text-disabled, #515151)";
  if (state === "hover")    return "var(--component\\/tab-text-hover, #f0ede6)";
  if (state === "active") {
    return (variant === "pointing" || variant === "secondary-pointing")
      ? "var(--component\\/tab-indicator, #e8a44a)"
      : "var(--component\\/tab-text-active, #f0ede6)";
  }
  return "var(--component\\/tab-text-default, #727272)";
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
        background: "var(--component\\/tab-border, #343434)",
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
        flex:       variant === "chip" ? "0 0 auto" : "1 0 0",
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
          fontFamily:    "'Space Grotesk', sans-serif",
          fontSize:      "14px",
          fontWeight:    800,
          lineHeight:    "22px",
          color:         getLabelColor(variant, effectiveState),
          whiteSpace:    "nowrap",
          flexShrink:    0,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}>
          {label}
        </span>
      </div>

      {showRail && (
        <div style={{
          background: "var(--component\\/tab-border, #343434)",
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

  const showRail    = variant !== "secondary" && variant !== "chip";
  const showPane    = !!children;

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%", ...style }}>
      {/* Tab row */}
      <div style={{
        display:        "flex",
        alignItems:     variant === "chip" ? "center" : "flex-end",
        justifyContent: "flex-start",
        gap:            variant === "chip" ? "var(--spacing\\/2, 8px)" : undefined,
        flexShrink:     0,
        width:          "100%",
        overflowX:      variant === "chip" ? "auto" : undefined,
        overflowY:      variant === "chip" ? "hidden" : undefined,
        WebkitOverflowScrolling: variant === "chip" ? "touch" : undefined,
        maskImage:       variant === "chip" ? "linear-gradient(to right, #000 calc(100% - 32px), transparent 100%)" : undefined,
        WebkitMaskImage: variant === "chip" ? "linear-gradient(to right, #000 calc(100% - 32px), transparent 100%)" : undefined,
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
            ? "var(--surface\\/bg-tertiary, #212121)"
            : "var(--component\\/tab-bg-active, #181818)",
          border:     variant === "secondary"
            ? "none"
            : "1px solid var(--component\\/tab-border, #343434)",
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
