import React from "react";

// ── Types ─────────────────────────────────────────────

export interface StatTileProps {
  /** Emoji or short glyph shown next to the value */
  icon?:      string;
  /** Big headline number/string, e.g. "247" */
  value?:     string | number;
  /** Caption below the value, e.g. "Total dogs eaten" — rendered uppercase */
  label?:     string;
  className?: string;
  style?:     React.CSSProperties;
}

// ── StatTile ──────────────────────────────────────────
// Non-interactive stat display, styled to match the Card/GifTile family
// (95%-opacity cream fill, no border, same shadow + radius). Mirrors the
// "stat-tile" component in Figma (node 613:13): value + icon share a row
// on top, wrapped caption label below.

export default function StatTile({
  icon,
  value,
  label,
  className,
  style,
}: StatTileProps) {
  return (
    <div
      className={className}
      style={{
        display:       "flex",
        flexDirection: "column",
        alignItems:    "flex-start",
        gap:           "6px",
        width:         "100%",
        boxSizing:     "border-box",
        padding:       "16px",
        borderRadius:  "var(--component\\/card-radius, 24px)",
        background:    "rgba(250, 249, 246, 0.95)", // raw — matches Card/GifTile's fill, unlike the translucent card-bg/card-bg-elevated tokens
        boxShadow:     "0px 4px 16px 0px rgba(0,0,0,0.20)",
        overflow:      "hidden",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {value !== undefined && (
          <span style={{
            fontFamily: "'Martian Mono', monospace",
            fontWeight: 700,
            fontSize:   "30px",
            lineHeight: "1.1",
            color:      "#121212",
          }}>
            {value}
          </span>
        )}

        {icon && (
          <span style={{ fontSize: "26px", lineHeight: "1", userSelect: "none" }}>
            {icon}
          </span>
        )}
      </div>

      {label && (
        <span style={{
          fontFamily:    "'Space Grotesk', sans-serif",
          fontWeight:    700,
          fontSize:      "11px",
          lineHeight:    "1.4",
          letterSpacing: "0.03em",
          textTransform: "uppercase",
          color:         "var(--text\\/secondary, #727272)",
          width:         "100%",
        }}>
          {label}
        </span>
      )}
    </div>
  );
}
