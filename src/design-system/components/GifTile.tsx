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
  /** Formatted date string, e.g. "Mar 28, 2026" — overlaid top-left on the GIF */
  date?:      string;
  /** Formatted time string, e.g. "2:14 PM" — overlaid top-right on the GIF */
  time?:      string;
  /** Optional caption appended to the GIF */
  notes?:     string;
  /** Mood rating 1–5 */
  mood?:      number | null;
  /** Upload/processing progress 0–100 (used when state="loading") */
  progress?:  number;
  /** Whether this entry falls on July 4, 2025 — counts double in standings */
  july4th?:   boolean;
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
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize:   "16px",
        fontWeight: 600,
        lineHeight: "22px",
        color:      "var(--text\\/primary, #f0ede6)", // cream — was the amber/red brand color, hard to read on the dark placeholder bg
        whiteSpace: "nowrap",
      }}>
        Processing GIF…
      </span>

      <div style={{
        width:        "128px",
        height:       "3px",
        borderRadius: "2px",
        background:   "var(--surface\\/border-default, #343434)",
        overflow:     "hidden",
        flexShrink:   0,
      }}>
        <div style={{
          width:        `${Math.min(Math.max(progress, 0), 100)}%`,
          height:       "100%",
          borderRadius: "2px",
          background:   "var(--brand\\/amber, #A30003)",
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
                fontFamily:  "'Space Grotesk', sans-serif",
                fontSize:    "12px",
                fontWeight:  500,
                lineHeight:  "16px",
                color:       "var(--text\\/tertiary, #727272)",
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
                fontFamily:  "'Space Grotesk', sans-serif",
                fontSize:    "12px",
                fontWeight:  500,
                lineHeight:  "16px",
                color:       "var(--text\\/tertiary, #727272)",
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
  time,
  notes,
  mood,
  progress = 0,
  july4th  = false,
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
        borderRadius:  "var(--component\\/card-radius, 24px)",
        background:    "rgba(250, 249, 246, 0.95)", // raw — 95%-opacity cream fill, unlike the translucent card-bg/card-bg-elevated tokens shared cards use
        boxShadow:     "0px 4px 16px 0px rgba(0,0,0,0.20)",
        cursor:        onClick ? "pointer" : "default",
        boxSizing:     "border-box",
        flexShrink:    0,
        ...style,
      }}
    >
      {/* GIF area — expands to fit the full GIF height; avatar pinned bottom-left.
          Inset 12px on top/left/right so it sits within the tile rather than
          flush against its edges, with its own rounded corners since it's no
          longer sharing the outer card's radius. Bottom inset is conditional:
          when the notes footer renders, its own padding already provides
          breathing room below the image, so the gap would double up; when
          there's no footer, the image needs its own 12px bottom margin so it
          doesn't run flush against the card's bottom edge. */}
      <div style={{
        position:       "relative",
        flexShrink:     0,
        width:          "calc(100% - 24px)",
        margin:         (isLoading || notes) ? "12px 12px 0 12px" : "12px",
        overflow:       "hidden",
        borderRadius:   "20px",
        // Reserve height whenever we know a GIF exists, even while off-screen
        // (activeSrc cleared). Without this the area collapses to 0, causing a
        // layout shift and scroll jank when the tile re-enters the viewport.
        minHeight:      (isLoading || gifUrl) ? "180px" : undefined,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        background:     "var(--surface\\/bg-tertiary, #212121)",
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

        {/* Date + time — absolute, top-left, stacked, standalone strings (no badge chrome) */}
        {!isLoading && (date || time) && (
          <div style={{
            position:      "absolute",
            left:          "16px",
            top:           "16px",
            display:       "flex",
            flexDirection: "column",
            alignItems:    "flex-start",
            gap:           "6px",
          }}>
            {date && (
              <span style={{
                fontFamily:    "'Martian Mono', monospace",
                fontSize:      "14px",
                fontWeight:    500,
                lineHeight:    "1",
                color:         "#fff",
                textShadow:    "0 1px 3px rgba(0,0,0,0.6)",
                whiteSpace:    "nowrap",
                userSelect:    "none",
              }}>
                {date}
              </span>
            )}
            {time && (
              <span style={{
                fontFamily:    "'Martian Mono', monospace",
                fontSize:      "14px",
                fontWeight:    500,
                lineHeight:    "1",
                color:         "#fff",
                textShadow:    "0 1px 3px rgba(0,0,0,0.6)",
                whiteSpace:    "nowrap",
                userSelect:    "none",
              }}>
                {time}
              </span>
            )}
          </div>
        )}

        {/* Mood — absolute, top-right, standalone (label above emoji) */}
        {!isLoading && mood != null && MOOD_EMOJI[mood] && (
          <div style={{
            position:      "absolute",
            right:         "16px",
            top:           "16px",
            display:       "flex",
            flexDirection: "column",
            alignItems:    "center",
            gap:           "4px",
          }}>
            <span style={{
              fontFamily:    "'Martian Mono', monospace",
              fontSize:      "14px",
              fontWeight:    500,
              lineHeight:    "1",
              color:         "#fff",
              textShadow:    "0 1px 3px rgba(0,0,0,0.6)",
              whiteSpace:    "nowrap",
              userSelect:    "none",
            }}>
              Mood
            </span>
            <span style={{
              fontSize:   "22px",
              lineHeight: "1",
              userSelect: "none",
              filter:     "drop-shadow(0 1px 3px rgba(0,0,0,0.6))",
            }}>
              {MOOD_EMOJI[mood]}
            </span>
          </div>
        )}

        {/* Avatar + name (left) and hot dog count (right) — absolute, bottom,
            sharing one row so both sit on the same horizontal line regardless
            of their individual content heights */}
        {!isLoading && (
          <div style={{
            position:       "absolute",
            left:           "16px",
            right:          "16px",
            bottom:         "16px",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            gap:            "8px",
          }}>
            <div style={{
              display:    "flex",
              alignItems: "center",
              gap:        "8px",
              minWidth:   0,
              flex:       "1 1 auto",
            }}>
              <Avatar name={name} src={avatarUrl} size="sm" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.6)" }} />
              <span style={{
                fontFamily:   "'Martian Mono', monospace",
                fontSize:     "18px",
                fontWeight:   600,
                lineHeight:   "1.2",
                color:        "#fff",
                textShadow:   "0 1px 3px rgba(0,0,0,0.6)",
                overflow:     "hidden",
                textOverflow: "ellipsis",
                whiteSpace:   "nowrap",
              }}>
                {name}
              </span>
            </div>

            <div style={{
              display:    "flex",
              alignItems: "center",
              gap:        "4px",
              flexShrink: 0,
            }}>
              <span style={{
                fontFamily: "'Martian Mono', monospace",
                fontSize:   "14px",
                fontWeight: 600,
                lineHeight: "1",
                color:      "#fff",
                textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                whiteSpace: "nowrap",
              }}>
                +{count}
              </span>
              <span style={{ fontSize: "14px", lineHeight: "1", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))" }}>🌭</span>
              {july4th && (
                <span style={{
                  fontFamily: "'Martian Mono', monospace",
                  fontSize:   "14px",
                  fontWeight: 500,
                  lineHeight: "1",
                  color:      "#fff",
                  textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                  whiteSpace: "nowrap",
                }}>
                  (x2 🇺🇸)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Metadata — in the default state, name/avatar, count, date/time, and
          mood now all live as overlays on the GIF itself, so this footer
          only exists when there's a note to show below it */}
      {(isLoading || notes) && (
      <div style={{
        display:       "flex",
        flexDirection: "column",
        gap:           isLoading ? "4px" : "8px",
        width:         "100%",
        padding:       "12px 16px",
        boxSizing:     "border-box",
        flexShrink:    0,
      }}>

        {!isLoading ? (
          <>
            {notes && (
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize:   "16px",
                fontWeight: 500,
                lineHeight: "22px",
                color:      "#121212",
              }}>
                "{notes}"
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
                  fontFamily:   "'Martian Mono', monospace",
                  fontSize:     "18px",
                  fontWeight:   600,
                  lineHeight:   "26px",
                  color:        "#121212",
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
                  fontFamily: "'Martian Mono', monospace",
                  fontSize:   "16px",
                  fontWeight: 600,
                  lineHeight: "26px",
                  color:      "#121212",
                  whiteSpace: "nowrap",
                }}>
                  +{count}
                </span>
                <span style={{ fontSize: "16px", lineHeight: "26px" }}>🌭</span>
              </div>
            </div>

            {notes && (
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize:   "16px",
                fontWeight: 500,
                lineHeight: "26px",
                color:      "#121212",
                width:      "100%",
              }}>
                {notes}
              </span>
            )}

            {date && (
              <span style={{
                fontFamily:   "'Martian Mono', monospace",
                fontSize:     "14px",
                fontWeight:   500,
                lineHeight:   "16px",
                color:        "var(--text\\/tertiary, #727272)",
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
      )}
    </div>
  );
}
