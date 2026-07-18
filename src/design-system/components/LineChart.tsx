import React, { useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────

export interface LineChartPoint {
  /** "YYYY-MM-DD" calendar date */
  date:  string;
  value: number;
}

export interface LineChartProps {
  data:       LineChartPoint[];
  /** Optional second series (e.g. "everyone else's average") — rendered as a
   *  gray dashed line sharing the same x/y scale as `data`. Must cover the
   *  same date range/length as `data`. */
  compareData?: LineChartPoint[];
  /** Small uppercase caption above the chart, e.g. "Dogs per day since May 1" */
  label?:     string;
  /** Legend text for the primary line — shown next to a solid swatch matching `color` */
  seriesLabel?:  string;
  /** Legend text for the compare line — shown next to a dashed gray swatch. Only rendered if `compareData` is set. */
  compareLabel?: string;
  /** Chart plot area height in px (card padding is added on top of this) */
  height?:    number;
  /** Line + marker color — defaults to the brand accent, but callers can pass
   *  a per-user color (e.g. getAvatarColor(name)) to match an avatar */
  color?:     string;
  className?: string;
  style?:     React.CSSProperties;
}

function LegendSwatch({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <svg width="16" height="8" viewBox="0 0 16 8" style={{ flexShrink: 0 }}>
      <line
        x1="0" y1="4" x2="16" y2="4"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={dashed ? "5 3" : undefined}
      />
    </svg>
  );
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// ── LineChart ─────────────────────────────────────────
// Non-interactive line + area chart, no charting library — just inline SVG,
// consistent with the rest of the design system. Styled to match the
// Card/StatTile family (95%-opacity cream fill, no border, same shadow +
// radius). Intended to span the full width of the profile stats grid.

export default function LineChart({
  data,
  compareData,
  label,
  seriesLabel  = "You",
  compareLabel = "Everyone else (avg)",
  height = 160,
  color = "var(--brand\\/amber, #A30003)",
  className,
  style,
}: LineChartProps) {
  const W = 600; // internal SVG coordinate space — scales to container via viewBox
  const H = height;
  const PAD_TOP    = 16;
  const PAD_BOTTOM = 28; // room for x-axis date labels
  const PAD_LEFT   = 34; // room for y-axis value labels
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const plotW = W - PAD_LEFT;

  const values = data.map(d => d.value);
  const compareValues = compareData ? compareData.map(d => d.value) : [];
  const rawMax = Math.max(1, ...values, ...compareValues); // avoid divide-by-zero on an all-zero series
  // Y-axis top is the higher of the two lines' max, rounded up to the nearest 10
  const maxVal = Math.max(10, Math.ceil(rawMax / 10) * 10);
  const n = data.length;

  const xAt = (i: number) => PAD_LEFT + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
  const yAt = (v: number) => PAD_TOP + plotH - (v / maxVal) * plotH;

  const baselineY = PAD_TOP + plotH;
  const yTicks = [0, maxVal / 2, maxVal];

  // Every path starts with a stub from (first x, baseline) down/up to the
  // first real value — anchors the line visually at 0 on the x-axis instead
  // of appearing to start mid-air at whatever the first day's total was.
  const linePath = n
    ? [`M ${xAt(0).toFixed(2)} ${baselineY.toFixed(2)}`]
        .concat(data.map((d, i) => `L ${xAt(i).toFixed(2)} ${yAt(d.value).toFixed(2)}`))
        .join(" ")
    : "";

  const compareLinePath = compareData && compareData.length
    ? [`M ${xAt(0).toFixed(2)} ${baselineY.toFixed(2)}`]
        .concat(compareData.map((d, i) => `L ${xAt(i).toFixed(2)} ${yAt(d.value).toFixed(2)}`))
        .join(" ")
    : "";

  // Three x-axis labels: start, midpoint, today — enough to orient without clutter
  const labelIdxs = n <= 1 ? [] : n === 2 ? [0, 1] : [0, Math.floor((n - 1) / 2), n - 1];

  // ── Hover / tap ──
  // Tracks which data index the pointer is nearest to, so a crosshair + dots +
  // tooltip can show both lines' values and the date at that point.
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  function updateHoverFromClientX(clientX: number) {
    const el = containerRef.current;
    if (!el || n === 0) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    const svgX = ((clientX - rect.left) / rect.width) * W;
    const t = plotW === 0 ? 0 : (svgX - PAD_LEFT) / plotW;
    const idx = Math.round(t * (n - 1));
    setHoverIdx(Math.min(n - 1, Math.max(0, idx)));
  }

  const handlePointerMove  = (e: React.PointerEvent) => updateHoverFromClientX(e.clientX);
  const handlePointerLeave = () => setHoverIdx(null);

  return (
    <div
      className={className}
      style={{
        display:      "flex",
        flexDirection: "column",
        gap:          "10px",
        width:        "100%",
        boxSizing:    "border-box",
        padding:      "16px",
        borderRadius: "var(--component\\/card-radius, 24px)",
        background:   "rgba(250, 249, 246, 0.95)",
        boxShadow:    "0px 4px 16px 0px rgba(0,0,0,0.20)",
        overflow:     "hidden",
        ...style,
      }}
    >
      {label && (
        <span style={{
          fontFamily:    "'Space Grotesk', sans-serif",
          fontWeight:    700,
          fontSize:      "11px",
          lineHeight:    "1.4",
          letterSpacing: "0.03em",
          textTransform: "uppercase",
          color:         "var(--text\\/secondary, #727272)",
        }}>
          {label}
        </span>
      )}

      {n > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <LegendSwatch color={color} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "12px", color: "var(--text\\/secondary, #727272)" }}>
              {seriesLabel}
            </span>
          </div>
          {compareLinePath && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <LegendSwatch color="#9a9a9a" dashed />
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "12px", color: "var(--text\\/secondary, #727272)" }}>
                {compareLabel}
              </span>
            </div>
          )}
        </div>
      )}

      {n === 0 ? (
        <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "13px", color: "var(--text\\/secondary, #727272)" }}>
            No entries yet
          </span>
        </div>
      ) : (
        <div
          ref={containerRef}
          style={{ position: "relative", width: "100%", height, cursor: "crosshair", touchAction: "pan-y" }}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
            {/* baseline */}
            <line x1={PAD_LEFT} y1={baselineY} x2={W} y2={baselineY} stroke="rgba(18,18,18,0.12)" strokeWidth="1" />
            {/* y-axis */}
            <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={baselineY} stroke="rgba(18,18,18,0.12)" strokeWidth="1" />

            {yTicks.map((v) => (
              <text
                key={v}
                x={PAD_LEFT - 8}
                y={yAt(v) + 4}
                textAnchor="end"
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "13px", fill: "var(--text\\/secondary, #727272)", letterSpacing: "0.8px" }}
              >
                {Math.round(v)}
              </text>
            ))}

            {compareLinePath && (
              <path d={compareLinePath} fill="none" stroke="#9a9a9a" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" />
            )}

            <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {hoverIdx !== null && (
              <line
                x1={xAt(hoverIdx)} y1={PAD_TOP} x2={xAt(hoverIdx)} y2={baselineY}
                stroke="rgba(18,18,18,0.3)" strokeWidth="1" strokeDasharray="3 3"
              />
            )}

            {labelIdxs.map((i) => (
              <text
                key={i}
                x={xAt(i)}
                y={H - 6}
                textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "13px", fill: "var(--text\\/secondary, #727272)", textTransform: "uppercase", letterSpacing: "0.8px" }}
              >
                {formatShortDate(data[i].date)}
              </text>
            ))}
          </svg>

          {/* Today marker — plain HTML dot, positioned by percentage rather than
             drawn inside the SVG's viewBox, since preserveAspectRatio="none"
             non-uniformly scales the viewBox (responsive width, fixed height)
             and would squish a same-space <circle> into an ellipse. */}
          <div style={{
            position:     "absolute",
            left:         `${(xAt(n - 1) / W) * 100}%`,
            top:          `${(yAt(data[n - 1].value) / H) * 100}%`,
            width:        "8px",
            height:       "8px",
            borderRadius: "50%",
            background:   color,
            transform:    "translate(-50%, -50%)",
            pointerEvents: "none",
          }} />

          {hoverIdx !== null && (() => {
            const leftPct = (xAt(hoverIdx) / W) * 100;
            const translateX = leftPct > 70 ? "-100%" : leftPct < 15 ? "0%" : "-50%";
            const hoverVal = data[hoverIdx].value;
            const hoverCompareVal = compareData ? compareData[hoverIdx].value : null;
            return (
              <>
                {/* hover dots — HTML overlay, same reasoning as the today marker above */}
                <div style={{
                  position: "absolute",
                  left: `${leftPct}%`,
                  top: `${(yAt(hoverVal) / H) * 100}%`,
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: color, border: "2px solid rgba(250, 249, 246, 0.95)",
                  transform: "translate(-50%, -50%)", pointerEvents: "none", zIndex: 2,
                }} />
                {hoverCompareVal !== null && (
                  <div style={{
                    position: "absolute",
                    left: `${leftPct}%`,
                    top: `${(yAt(hoverCompareVal) / H) * 100}%`,
                    width: "8px", height: "8px", borderRadius: "50%",
                    background: "#9a9a9a", border: "2px solid rgba(250, 249, 246, 0.95)",
                    transform: "translate(-50%, -50%)", pointerEvents: "none", zIndex: 2,
                  }} />
                )}

                {/* tooltip */}
                <div style={{
                  position:     "absolute",
                  left:         `${leftPct}%`,
                  top:          "0px",
                  transform:    `translateX(${translateX})`,
                  background:   "#121212",
                  color:        "#f0ede6",
                  borderRadius: "8px",
                  padding:      "6px 10px",
                  fontFamily:   "'Space Grotesk', sans-serif",
                  fontSize:     "11px",
                  lineHeight:   1.6,
                  whiteSpace:   "nowrap",
                  pointerEvents: "none",
                  boxShadow:    "0px 2px 8px rgba(0,0,0,0.25)",
                  zIndex:       3,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: "2px" }}>{formatShortDate(data[hoverIdx].date)}</div>
                  <div>{seriesLabel}: {Math.round(hoverVal * 100) / 100}</div>
                  {hoverCompareVal !== null && <div>{compareLabel}: {Math.round(hoverCompareVal * 100) / 100}</div>}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
