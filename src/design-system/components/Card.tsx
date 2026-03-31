import React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CardVariant = "default" | "elevated" | "outlined" | "ghost";
export type CardSize    = "sm" | "md" | "lg";

export interface CardProps {
  variant?:   CardVariant;
  size?:      CardSize;
  /** Show the header block (title + optional subtitle) */
  header?:    boolean;
  /** Show the subtitle line inside the header */
  subtitle?:  boolean;
  /** Header title text */
  title?:     string;
  /** Header subtitle text */
  description?: string;
  /** Content slot — accepts any React node */
  children?:  React.ReactNode;
  className?: string;
  style?:     React.CSSProperties;
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const PADDING: Record<CardSize, string> = {
  sm: "12px",
  md: "20px",
  lg: "28px",
};

const HEADER_PADDING: Record<CardSize, string> = {
  sm: "12px",
  md: "16px",
  lg: "20px",
};

const RADIUS: Record<CardSize, string> = {
  sm: "var(--radius\\/md, 6px)",
  md: "var(--radius\\/lg, 10px)",
  lg: "var(--radius\\/xl, 16px)",
};

const TITLE_SIZE: Record<CardSize, string> = {
  sm: "14px",
  md: "16px",
  lg: "18px",
};

const TITLE_LINE_HEIGHT: Record<CardSize, string> = {
  sm: "20px",
  md: "22px",
  lg: "26px",
};

const SUBTITLE_SIZE: Record<CardSize, string> = {
  sm: "12px",
  md: "13px",
  lg: "14px",
};

const SUBTITLE_LINE_HEIGHT: Record<CardSize, string> = {
  sm: "18px",
  md: "18px",
  lg: "20px",
};

// ── Card root styles per variant ──────────────────────────────────────────────

function getCardStyle(variant: CardVariant, size: CardSize): React.CSSProperties {
  const base: React.CSSProperties = {
    display:       "flex",
    flexDirection: "column",
    alignItems:    "flex-start",
    overflow:      "hidden",
    position:      "relative",
    width:         "100%",
    borderRadius:  RADIUS[size],
  };

  switch (variant) {
    case "default":
      return {
        ...base,
        background:  "var(--component\\/card-bg, #16161d)",
        border:      "1px solid var(--component\\/card-border, #2e2e40)",
        boxShadow:   "0px 4px 16px 0px rgba(0,0,0,0.20)",
      };
    case "elevated":
      return {
        ...base,
        background: "var(--component\\/card-bg-elevated, #1e1e28)",
        boxShadow:  "0px 4px 16px 0px rgba(0,0,0,0.20)",
      };
    case "outlined":
      return {
        ...base,
        border: "1px solid var(--component\\/card-border, #2e2e40)",
      };
    case "ghost":
      return base;
  }
}

// ── Header styles per variant ─────────────────────────────────────────────────

function getHeaderStyle(variant: CardVariant, size: CardSize): React.CSSProperties {
  const base: React.CSSProperties = {
    display:       "flex",
    flexDirection: "column",
    gap:           "4px",
    alignItems:    "flex-start",
    overflow:      "hidden",
    position:      "relative",
    flexShrink:    0,
    width:         "100%",
    padding:       HEADER_PADDING[size],
    borderBottom:  "1px solid var(--component\\/card-header-border, #2e2e40)",
  };

  switch (variant) {
    case "default":
    case "elevated":
      return {
        ...base,
        background: "var(--component\\/card-header-bg, #1e1e28)",
      };
    case "outlined":
    case "ghost":
      return base;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CardSlotPlaceholder() {
  return (
    <div
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        width:          "100%",
        height:         "48px",
        flexShrink:     0,
        border:         "1px solid #3a3a52",
        borderRadius:   "4px",
      }}
    >
      <span
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize:   "12px",
          fontWeight: 400,
          color:      "#6b6882",
          whiteSpace: "nowrap",
        }}
      >
        Content slot
      </span>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export default function Card({
  variant     = "default",
  size        = "sm",
  header      = true,
  subtitle    = true,
  title       = "Card title",
  description = "Supporting text or description",
  children,
  className,
  style,
}: CardProps) {
  return (
    <div
      className={className}
      style={{ ...getCardStyle(variant, size), ...style }}
    >
      {/* Header */}
      {header && (
        <div style={getHeaderStyle(variant, size)}>
          <p
            style={{
              fontFamily:  "Inter, sans-serif",
              fontSize:    TITLE_SIZE[size],
              fontWeight:  600,
              lineHeight:  TITLE_LINE_HEIGHT[size],
              color:       "var(--text\\/primary, #f0ede6)",
              width:       "100%",
              margin:      0,
              flexShrink:  0,
            }}
          >
            {title}
          </p>

          {subtitle && (
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize:   SUBTITLE_SIZE[size],
                fontWeight: 400,
                lineHeight: SUBTITLE_LINE_HEIGHT[size],
                color:      "var(--text\\/secondary, #9e9bb4)",
                width:      "100%",
                margin:     0,
                flexShrink: 0,
              }}
            >
              {description}
            </p>
          )}
        </div>
      )}

      {/* Content slot */}
      <div
        style={{
          display:       "flex",
          flexDirection: "column",
          alignItems:    "flex-start",
          minHeight:     "48px",
          overflow:      "hidden",
          position:      "relative",
          flexShrink:    0,
          width:         "100%",
          padding:       PADDING[size],
        }}
      >
        {children ?? <CardSlotPlaceholder />}
      </div>
    </div>
  );
}
