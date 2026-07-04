import React from "react";

// ── Types ─────────────────────────────────────────────

export type AvatarSize = "sm" | "md" | "lg" | "xl";

export interface AvatarProps {
  /** Display name — used to generate initials and pick a fallback color */
  name?:      string;
  /** Photo URL — renders a circular image when provided */
  src?:       string;
  size?:      AvatarSize;
  className?: string;
  style?:     React.CSSProperties;
}

// ── Constants ─────────────────────────────────────────

const DIAMETER: Record<AvatarSize, number> = {
  sm: 24,
  md: 32,
  lg: 40,
  xl: 80,
};

// Type/Micro exception for sm; Semi Bold for md/lg/xl
const FONT_SIZE: Record<AvatarSize, number> = {
  sm: 9,   // Type/Micro — documented exception for non-critical decorative copy
  md: 13,
  lg: 16,
  xl: 24,
};

// Emoji font sizes per size (slightly larger than text initials)
const EMOJI_SIZE: Record<AvatarSize, number> = {
  sm: 13,
  md: 18,
  lg: 22,
  xl: 40,
};

// Deterministic 6-color palette — DS-adjacent hues
const PALETTE = [
  "#e8a44a", // amber
  "#5b6ab5", // indigo
  "#4aa8a4", // teal
  "#c45f7a", // rose
  "#5a9e6b", // green
  "#8b6bb5", // lavender
];

// ── Helpers ───────────────────────────────────────────

/** Derive up to 2 initials from a display name. "Andrew Cloud" → "AC" */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Hash a string to a consistent palette index */
function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h % PALETTE.length;
}

// ── Avatar ────────────────────────────────────────────

export default function Avatar({
  name      = "",
  src,
  size      = "md",
  className,
  style,
}: AvatarProps) {
  const dim      = DIAMETER[size];
  const fs       = FONT_SIZE[size];
  const initials = getInitials(name);
  const bgColor  = PALETTE[hashName(name)];

  const baseStyle: React.CSSProperties = {
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    width:           `${dim}px`,
    height:          `${dim}px`,
    borderRadius:    "50%",
    overflow:        "hidden",
    flexShrink:      0,
    ...style,
  };

  // ── Photo variant ──
  if (src && src.startsWith("http")) {
    return (
      <div className={className} style={baseStyle}>
        <img
          src={src}
          alt={name || "Avatar"}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>
    );
  }

  // ── Emoji variant — src is an emoji string, not a URL ──
  if (src) {
    return (
      <div className={className} style={{ ...baseStyle, background: bgColor }}>
        <span style={{
          fontSize:   `${EMOJI_SIZE[size]}px`,
          lineHeight: 1,
          userSelect: "none",
        }}>
          {src}
        </span>
      </div>
    );
  }

  // ── Initials fallback ──
  return (
    <div className={className} style={{ ...baseStyle, background: bgColor }}>
      <span style={{
        fontFamily:  "Inter, sans-serif",
        fontSize:    `${fs}px`,
        fontWeight:  600,
        lineHeight:  1,
        color:       "#ffffff",
        userSelect:  "none",
        letterSpacing: size === "sm" ? "0" : "0.01em",
      }}>
        {initials}
      </span>
    </div>
  );
}
