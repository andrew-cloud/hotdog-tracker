import React from "react";
import Avatar from "./Avatar";

// ── Types ─────────────────────────────────────────────

export type GifTileState = "default" | "loading";

export interface GifTileProps {
  state?:     GifTileState;
  /** URL of the GIF — autoplays when loaded */
  gifUrl?:    string;
  /** Submitter's display name */
  name?:      string;
  /** Avatar photo URL or emoji — falls back to initials when omitted */
  avatarUrl?: string;
  /** Number of hot dogs eaten */
  count?:     number;
  /** Formatted date string, e.g. "Mar 28, 2026 · 2:14 PM" */
  date?:      string;
  /** Optional caption appended to the GIF */
  notes?:     string;
  /** Mood rating 1–5 */
  mood?:      number | null;
  /** Upload/processing progress 0–100 (used when state="loading") */
  progress?:  number;
  /** Called when the user taps "Retry" on a stuck loading tile */
  onRetry?:    () => void;
  /** Called when the user taps "Resubmit" to re-upload a lost video */
  onResubmit?: () => void;
  onClick?:   () => void;
  className?: string;
  style?:     React.CSSProperties;
}

const MOOD_EMOJI: Record<number, string> = {
  1: "🤢",
  2: "😕",
  3: "😐",
  4: "🙂",
  5: "🤩",
};

// ── Loading State ─────────────────────────────────────

function LoadingContent({ progress = 0, onRetry, onResubmit }: { progress?: number; onRetry?: () => void; onResubmit?: () => void }) {
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
        fontSize:   "16px",
        fontWeight: 600,
        lineHeight: "22px",
        color:      "var(--brand\\/amber, #e8a44a)",
        whiteSpace: "nowrap",
      }}>
        Processing GIF…
      </span>

      <div style={{
        width:        "128px",
        height:       "3px",
        borderRadius: "2px",
        background:   "var(--surface\\/border-default, #2e2e40)",
        overflow:     "hidden",
        flexShrink:   0,
      }}>
        <div style={{
          width:        `${Math.min(Math.max(progress, 0), 100)}%`,
          height:       "100%",
          borderRadius: "2px",
          background:   "var(--brand\\/amber, #e8a44a)",
          transition:   "width 0.3s ease",
        }} />
      </div>

      {(onRetry || onResubmit) && (
        <div style={{ display: "flex", gap: "12px", marginTop: "2px" }}>
          {onRetry && (
            <button
              onClick={(e) => { e.stopPropagation(); onRetry(); }}
              style={{
                background:  "none",
                border:      "none",
                padding:     "0",
                fontFamily:  "Inter, sans-serif",
                fontSize:    "12px",
                fontWeight:  500,
                lineHeight:  "16px",
                color:       "var(--text\\/tertiary, #6b6882)",
                cursor:      "pointer",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
              }}
            >
              Retry
            </button>
          )}
          {onResubmit && (
            <button
              onClick={(e) => { e.stopPropagation(); onResubmit(); }}
              style={{
                background:  "none",
                border:      "none",
                padding:     "0",
                fontFamily:  "Inter, sans-serif",
                fontSize:    "12px",
                fontWeight:  500,
                lineHeight:  "16px",
                color:       "var(--text\\/tertiary, #6b6882)",
                cursor:      "pointer",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
              }}
            >
              Resubmit
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── GifTile ───────────────────────────────────────────

export default function GifTile({
  state     = "default",
  gifUrl,
  name      = "Andrew Cloud",
  avatarUrl,
  count     = 0,
  date,
  notes,
  mood,
  progress = 0,
  onRetry,
  onResubmit,
  onClick,
  className,
  style,
}: GifTileProps) {
  const isLoading = state === "loading";

  // Lazy-loading is handled natively by the browser via loading="lazy" on the
  // img tag below — no per-tile IntersectionObserver needed, which keeps scroll
  // smooth by eliminating JS observer overhead during scrolling.

  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        display:       "flex",
        flexDirection: "column",
        alignItems:    "flex-start",
        width:         "340px",
        overflow:      "hidden",
        borderRadius:  "var(--radius\\/lg, 10px)",
        border:        "1px solid var(--component\\/card-border, #2e2e40)",
        background:    "var(--component\\/card-bg, #16161d)",
        boxShadow:     "0px 4px 16px 0px rgba(0,0,0,0.20)",
        cursor:        onClick ? "pointer" : "default",
        boxSizing:     "border-box",
        flexShrink:    0,
        ...style,
      }}
    >
      {/* GIF area — expands to fit the full GIF height; avatar pinned bottom-left */}
      <div style={{
        position:       "relative",
        flexShrink:     0,
        width:          "100%",
        // Reserve height whenever we know a GIF exists, even while off-screen
        // (activeSrc cleared). Without this the area collapses to 0, causing a
        // layout shift and scroll jank when the tile re-enters the viewport.
        minHeight:      (isLoading || gifUrl) ? "180px" : undefined,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        background:     "var(--surface\\/bg-tertiary, #1e1e28)",
      }}>
        {!isLoading && gifUrl && (
          <img
            src={gifUrl}
            alt="Hotdog submission"
            loading="lazy"
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        )}
        {isLoading && <LoadingContent progress={progress} onRetry={onRetry} onResubmit={onResubmit} />}

        {/* Mood emoji — absolute, bottom-right */}
        {!isLoading && mood != null && MOOD_EMOJI[mood] && (
          <div style={{
            position:     "absolute",
            right:        "10px",
            bottom:       "10px",
            fontSize:     "28px",
            lineHeight:   "1",
            filter:       "drop-shadow(0 1px 3px rgba(0,0,0,0.6))",
            userSelect:   "none",
          }}>
            {MOOD_EMOJI[mood]}
          </div>
        )}
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
        display:       "flex",
        flexDirection: "column",
        gap:           isLoading ? "4px" : "8px",
        width:         "100%",
        padding:       "12px 16px",
        boxSizing:     "border-box",
        flexShrink:    0,
      }}>

        {/* Default: name+notes grouped at gap:0, then date below at 8px */}
        {!isLoading ? (
          <>
            {/* name + notes (left column) + count (right) */}
            <div style={{
              display:     "flex",
              alignItems:  "flex-start",
              width:       "100%",
              gap:         "24px",
            }}>
              {/* Left column: avatar+name, then notes indented to username */}
              <div style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", overflow: "hidden" }}>
                  <Avatar name={name} src={avatarUrl} size="md" />
                  <span style={{
                    fontFamily:   "Inter, sans-serif",
                    fontSize:     "18px",
                    fontWeight:   600,
                    lineHeight:   "26px",
                    color:        "var(--text\\/primary, #f0ede6)",
                    overflow:     "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace:   "nowrap",
                    flex:         1,
                    minWidth:     0,
                  }}>
                    {name}
                  </span>
                </div>
                {notes && (
                  <span style={{
                    fontFamily:  "Inter, sans-serif",
                    fontSize:    "16px",
                    fontWeight:  400,
                    lineHeight:  "22px",
                    color:       "var(--text\\/primary, #f0ede6)",
                    paddingLeft: "40px", // 32px avatar + 8px gap
                  }}>
                    "{notes}"
                  </span>
                )}
              </div>

              {/* Right: count */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "4px", flexShrink: 0 }}>
                <span style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize:   "16px",
                  fontWeight: 600,
                  lineHeight: "26px",
                  color:      "var(--brand\\/amber, #e8a44a)",
                  whiteSpace: "nowrap",
                }}>
                  +{count}
                </span>
                <span style={{ fontSize: "16px", lineHeight: "26px" }}>🌭</span>
              </div>
            </div>

            {/* date — 8px below the name/notes group, aligned to username */}
            {date && (
              <span style={{
                fontFamily:   "Inter, sans-serif",
                fontSize:     "14px",
                fontWeight:   400,
                lineHeight:   "16px",
                color:        "var(--text\\/tertiary, #6b6882)",
                overflow:     "hidden",
                textOverflow: "ellipsis",
                whiteSpace:   "nowrap",
                width:        "100%",
                paddingLeft:  "40px", // 32px avatar + 8px gap
              }}>
                {date}
              </span>
            )}
          </>
        ) : (
          /* Loading: flat layout, all rows at 4px gap */
          <>
            <div style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              width:          "100%",
              overflow:       "hidden",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0, overflow: "hidden" }}>
                <Avatar name={name} src={avatarUrl} size="md" />
                <span style={{
                  fontFamily:   "Inter, sans-serif",
                  fontSize:     "18px",
                  fontWeight:   600,
                  lineHeight:   "26px",
                  color:        "var(--text\\/primary, #f0ede6)",
                  overflow:     "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace:   "nowrap",
                  flex:         1,
                  minWidth:     0,
                }}>
                  {name}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                <span style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize:   "16px",
                  fontWeight: 600,
                  lineHeight: "26px",
                  color:      "var(--brand\\/amber, #e8a44a)",
                  whiteSpace: "nowrap",
                }}>
                  +{count}
                </span>
                <span style={{ fontSize: "16px", lineHeight: "26px" }}>🌭</span>
              </div>
            </div>

            {notes && (
              <span style={{
                fontFamily: "Inter, sans-serif",
                fontSize:   "16px",
                fontWeight: 400,
                lineHeight: "26px",
                color:      "var(--text\\/primary, #f0ede6)",
                width:      "100%",
              }}>
                {notes}
              </span>
            )}

            {date && (
              <span style={{
                fontFamily:   "Inter, sans-serif",
                fontSize:     "14px",
                fontWeight:   400,
                lineHeight:   "16px",
                color:        "var(--text\\/tertiary, #6b6882)",
                overflow:     "hidden",
                textOverflow: "ellipsis",
                whiteSpace:   "nowrap",
                width:        "100%",
              }}>
                {date}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
