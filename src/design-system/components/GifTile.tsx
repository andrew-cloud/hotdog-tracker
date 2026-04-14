import React, { useEffect, useRef, useState } from "react";
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
  progress = 0,
  onClick,
  className,
  style,
}: GifTileProps) {
  const isLoading = state === "loading";

  // ── Lazy-load / pause-when-off-screen ─────────────────
  // Only tiles with a real gifUrl participate — loading tiles always show spinner.
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!gifUrl) return; // nothing to lazy-load

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      {
        // Start loading 150px before the tile scrolls into view;
        // clear src 150px after it scrolls out so re-entry is instant from cache.
        rootMargin: "150px 0px",
        threshold:  0,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [gifUrl]);

  // Visible src: only set when the tile is in (or near) the viewport.
  const activeSrc = gifUrl && isVisible ? gifUrl : undefined;

  return (
    <div
      ref={containerRef}
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
        minHeight:      isLoading ? "180px" : undefined,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        background:     "var(--surface\\/bg-tertiary, #1e1e28)",
      }}>
        {!isLoading && activeSrc && (
          <img
            src={activeSrc}
            alt="Hotdog submission"
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        )}
        {isLoading && <LoadingContent progress={progress} />}

        {/* Avatar — absolute, bottom-left */}
        <div style={{ position: "absolute", left: "16px", bottom: "12px" }}>
          <Avatar name={name} src={avatarUrl} size="sm" />
        </div>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 0, width: "100%" }}>
              {/* name (left) + count (right) */}
              <div style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "space-between",
                width:          "100%",
                overflow:       "hidden",
              }}>
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

              {/* notes — directly under name, no gap */}
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
            </div>

            {/* date — 8px below the name/notes group */}
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
