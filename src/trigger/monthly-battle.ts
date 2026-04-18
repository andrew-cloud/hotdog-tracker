import { schedules, logger } from "@trigger.dev/sdk";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;

const sbHeaders = {
  "Content-Type": "application/json",
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
};

// ── Pacific Time helpers ──────────────────────────────────────────────────────
// All month boundaries match the frontend: Pacific Time, not UTC.

const TZ = "America/Los_Angeles";

// "YYYY-MM-DD" in Pacific Time
function toDateStrPT(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

// How many ms Pacific Time is behind UTC at a given instant
function getPacificOffsetMs(date: Date): number {
  const fmt = (tz: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    }).formatToParts(date);

  const toMs = (parts: Intl.DateTimeFormatPart[]) => {
    const get = (type: string) =>
      parseInt(parts.find((p) => p.type === type)!.value);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  };

  return toMs(fmt("UTC")) - toMs(fmt(TZ));
}

// UTC timestamp for a date/time expressed in Pacific Time
function ptToUTC(y: number, m: number, d: number, h: number, min: number, s: number): number {
  const candidate = new Date(Date.UTC(y, m - 1, d, h, min, s));
  return candidate.getTime() + getPacificOffsetMs(candidate);
}

// ── Task ──────────────────────────────────────────────────────────────────────

export const monthlyBattleClose = schedules.task({
  id: "monthly-battle-close",

  // 08:10 UTC on the 1st of every month.
  // PST = UTC-8: Pacific midnight = 08:00 UTC → we fire 10 min after.
  // PDT = UTC-7: Pacific midnight = 07:00 UTC → we fire 1h10m after.
  // Either way the Pacific month has definitively ended before this runs.
  cron: "10 8 1 * *",

  run: async (payload) => {
    const now = payload.timestamp; // Date object (scheduled time, UTC)

    // Determine the current date in Pacific Time.
    // At 08:10 UTC on the 1st, Pacific time is just past midnight on the 1st.
    const pacificStr = toDateStrPT(now);                        // e.g. "2026-05-01"
    const [ptYear, ptMonth] = pacificStr.split("-").map(Number);

    // The month we're crowning = previous Pacific month
    const prevPtMonth = ptMonth === 1 ? 12 : ptMonth - 1;
    const prevPtYear  = ptMonth === 1 ? ptYear - 1 : ptYear;

    // Last battle is April 2027 — skip anything after that
    if (prevPtYear > 2027 || (prevPtYear === 2027 && prevPtMonth > 4)) {
      logger.log("All battles complete — no more champions to crown.");
      return { skipped: true, reason: "past final battle (April 2027)" };
    }

    const month     = `${prevPtYear}-${String(prevPtMonth).padStart(2, "0")}`;
    const monthName = new Date(prevPtYear, prevPtMonth - 1, 1)
      .toLocaleString("en-US", { month: "long" });

    // Pacific month boundaries as UTC timestamps (matches frontend filtering)
    const lastDay    = new Date(prevPtYear, prevPtMonth, 0).getDate();
    const monthStartMs = ptToUTC(prevPtYear, prevPtMonth, 1, 0, 0, 0);
    const monthEndMs   = ptToUTC(prevPtYear, prevPtMonth, lastDay, 23, 59, 59);

    logger.log(`Closing battle for ${monthName} ${prevPtYear}`, {
      month,
      monthStartMs,
      monthEndMs,
    });

    // ── Fetch entries for the closed month ─────────────────────────────────
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/entries` +
        `?timestamp=gte.${monthStartMs}&timestamp=lte.${monthEndMs}` +
        `&select=name,count,timestamp&order=timestamp.asc`,
      { headers: sbHeaders }
    );
    if (!res.ok)
      throw new Error(`Failed to fetch entries: ${await res.text()}`);

    const entries: { name: string; count: number; timestamp: number }[] =
      await res.json();

    if (entries.length === 0) {
      logger.log(`No entries logged in ${monthName} — skipping champion.`);
      return { month, champion: null, reason: "no entries" };
    }

    // ── Aggregate: total dogs + last-entry timestamp per contestant ────────
    // Tie-break rule: most dogs wins. If equal, whoever reached that count
    // first (earliest timestamp of their final entry for the month) wins.
    const totals: Record<
      string,
      { name: string; count: number; lastTs: number }
    > = {};

    for (const e of entries) {
      const k = e.name.toLowerCase();
      if (!totals[k]) totals[k] = { name: e.name, count: 0, lastTs: 0 };
      totals[k].count += e.count;
      // We want the timestamp when their running total last increased —
      // since entries arrive chronologically (ordered asc), MAX(timestamp)
      // among the entries that brought them to their final total.
      // Simpler: MAX(timestamp) of all their entries is when they hit their total.
      totals[k].lastTs = Math.max(totals[k].lastTs, e.timestamp);
    }

    const sorted = Object.values(totals).sort(
      (a, b) => b.count - a.count || a.lastTs - b.lastTs
    );
    const winner = sorted[0];

    logger.log(`🏆 ${monthName} Champion: ${winner.name} (${winner.count} dogs)`);

    // ── Upsert champion record ─────────────────────────────────────────────
    const upsert = await fetch(`${SUPABASE_URL}/rest/v1/monthly_champions`, {
      method: "POST",
      headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        month,
        winner_name: winner.name,
        dog_count: winner.count,
        crowned_at: new Date().toISOString(),
      }),
    });
    if (!upsert.ok)
      throw new Error(`Failed to save champion: ${await upsert.text()}`);

    return {
      month,
      champion: winner.name,
      dogCount: winner.count,
      totalContestants: sorted.length,
    };
  },
});
