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
  /** Override the subtitle's text color (defaults to text/secondary) */
  descriptionColor?: string;
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

// Vertical rhythm stays smaller than the body, but horizontal padding
// matches PADDING[size] so header and content align on the same edges.
const HEADER_PADDING: Record<CardSize, string> = {
  sm: `12px ${PADDING.sm}`,
  md: `16px ${PADDING.md}`,
  lg: `20px ${PADDING.lg}`,
};

const RADIUS: Record<CardSize, string> = {
  sm: "var(--component\\/card-radius, 24px)",
  md: "var(--component\\/card-radius, 24px)",
  lg: "var(--component\\/card-radius, 24px)",
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
        background:  "rgba(250, 249, 246, 0.95)", // raw — 95%-opacity fill, no border (matches .ds-card / GifTile)
        border:      "none",
        boxShadow:   "0px 4px 16px 0px rgba(0,0,0,0.20)",
      };
    case "elevated":
      return {
        ...base,
        background: "rgba(250, 249, 246, 0.95)", // raw — same treatment as default; kept as a distinct variant name for future flexibility
        border:     "none",
        boxShadow:  "0px 4px 16px 0px rgba(0,0,0,0.20)",
      };
    case "outlined":
      return {
        ...base,
        border: "1px solid var(--component\\/card-border, #343434)",
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
    borderBottom:  "1px solid var(--component\\/card-header-border, #EEE4DF)",
  };

  switch (variant) {
    case "default":
    case "elevated":
      return {
        ...base,
        background: "var(--component\\/card-header-bg, transparent)",
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
        border:         "1px solid #424242",
        borderRadius:   "4px",
      }}
    >
      <span
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize:   "12px",
          fontWeight: 400,
          color:      "#727272",
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
  descriptionColor,
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
              fontFamily:    "'Space Grotesk', sans-serif",
              fontSize:      "14px",
              fontWeight:    800,
              lineHeight:    TITLE_LINE_HEIGHT[size],
              color:         "#121212",
              width:         "100%",
              margin:        0,
              flexShrink:    0,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {title}
          </p>

          {subtitle && (
            <p
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize:   SUBTITLE_SIZE[size],
                fontWeight: 500, // lighter than the 800-weight title, lightest weight available for Space Grotesk
                lineHeight: SUBTITLE_LINE_HEIGHT[size],
                color:      descriptionColor ?? "var(--text\\/secondary, #727272)",
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
          alignItems:    "stretch", // stretch children to full card width (matches old .ds-card-body block behavior) — flex-start let percentage-width children (e.g. full-width buttons) collapse to content size
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
