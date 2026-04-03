import React from "react";

// ── Types ─────────────────────────────────────────────

export type GifTileState = "default" | "loading";

export interface GifTileProps {
  state?:     GifTileState;
  /** URL of the GIF — autoplays when loaded */
  gifUrl?:    string;
  /** Submitter's display name */
  name?:      string;
  /** Number of hot dogs eaten */
  count?:     number;
  /** Formatted date string, e.g. "Mar 28, 2026 · 2:14 PM" */
  date?:      string;
  /** Upload/processing progress 0–100 (used when state="loading") */
  progress?:  number;
  onClick?:   () => void;
  className?: string;
  style?:     React.CSSProperties;
}

// ── Loading State ─────────────────────────────────────

function LoadingContent({ progress = 0 }: { progress?: number }) {
  return (
    <div style={{
      display:       "flex",
      flexDirection: "column",
      alignItems:    "center",
      gap:           "8px",
    }}>
      <span style={{ fontSize: "24px", lineHeight: "28px" }}>⏳</span>

      <span style={{
        fontFamily: "Inter, sans-serif",
        fontSize:   "12px",
        fontWeight: 600,
        lineHeight: "18px",
        color:      "var(--brand\\/amber, #e8a44a)",
        whiteSpace: "nowrap",
      }}>
        Processing GIF…
      </span>

      <div style={{
        width:        "120px",
        height:       "3px",
        borderRadius: "2px",
        background:   "var(--surface\\/border-default, #2e2e40)",
        overflow:     "hidden",
        flexShrink:   0,
      }}>
        <div style={{
          width:       `${Math.min(Math.max(progress, 0), 100)}%`,
          height:      "100%",
          borderRadius:"2px",
          background:  "var(--brand\\/amber, #e8a44a)",
          transition:  "width 0.3s ease",
        }} />
      </div>
    </div>
  );
}

// ── GifTile ───────────────────────────────────────────

export default function GifTile({
  state    = "default",
  gifUrl,
  name     = "Andrew Cloud",
  count    = 0,
  date,
  progress = 0,
  onClick,
  className,
  style,
}: GifTileProps) {
  const isLoading = state === "loading";

  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        display:      "flex",
        flexDirection:"column",
        alignItems:   "flex-start",
        width:        "240px",
        overflow:     "hidden",
        borderRadius: "var(--radius\\/lg, 10px)",
        border:       "1px solid var(--component\\/card-border, #2e2e40)",
        background:   "var(--component\\/card-bg, #16161d)",
        boxShadow:    "0px 4px 16px 0px rgba(0,0,0,0.20)",
        cursor:       onClick ? "pointer" : "default",
        boxSizing:    "border-box",
        flexShrink:   0,
        ...style,
      }}
    >
      {/* GIF area */}
      <div style={{
        display:        isLoading ? "flex" : "block",
        alignItems:     "center",
        justifyContent: "center",
        flexShrink:     0,
        width:          "100%",
        minHeight:      isLoading ? "180px" : undefined,
        background:     "var(--surface\\/bg-tertiary, #1e1e28)",
        overflow:       "hidden",
      }}>
        {!isLoading && gifUrl && (
          <img
            src={gifUrl}
            alt="Hotdog submission"
            style={{
              display:   "block",
              width:     "100%",
              height:    "auto",
            }}
          />
        )}
        {isLoading && <LoadingContent progress={progress} />}
      </div>

      {/* Divider */}
      <div style={{
        flexShrink: 0,
        width:      "100%",
        height:     "1px",
        background: "var(--component\\/card-border, #2e2e40)",
      }} />

      {/* Metadata */}
      <div style={{
        display:      "flex",
        flexDirection:"column",
        gap:          "4px",
        width:        "100%",
        padding:      "14px",
        boxSizing:    "border-box",
        flexShrink:   0,
      }}>
        {/* Name */}
        <span style={{
          fontFamily:  "Inter, sans-serif",
          fontSize:    "14px",
          fontWeight:  600,
          lineHeight:  "20px",
          color:       "var(--text\\/primary, #f0ede6)",
          overflow:    "hidden",
          textOverflow:"ellipsis",
          whiteSpace:  "nowrap",
          width:       "100%",
        }}>
          {name}
        </span>

        {/* Hot dog count */}
        <div style={{
          display:    "flex",
          alignItems: "center",
          gap:        "4px",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: "12px", lineHeight: "18px" }}>🌭</span>
          <span style={{
            fontFamily: "Inter, sans-serif",
            fontSize:   "13px",
            fontWeight: 600,
            lineHeight: "18px",
            color:      "var(--brand\\/amber, #e8a44a)",
            whiteSpace: "nowrap",
          }}>
            {count} hot dog{count !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Date */}
        {date && (
          <span style={{
            fontFamily:  "Inter, sans-serif",
            fontSize:    "11px",
            fontWeight:  400,
            lineHeight:  "16px",
            color:       "var(--text\\/tertiary, #6b6882)",
            overflow:    "hidden",
            textOverflow:"ellipsis",
            whiteSpace:  "nowrap",
            width:       "100%",
          }}>
            {date}
          </span>
        )}
      </div>
    </div>
  );
}
