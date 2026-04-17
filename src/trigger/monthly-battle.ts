import { schedules, logger } from "@trigger.dev/sdk";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;

const sbHeaders = {
  "Content-Type": "application/json",
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date): string {
  return d.toLocaleString("en-US", { month: "long" });
}

// ── Task ──────────────────────────────────────────────────────────────────────

export const monthlyBattleClose = schedules.task({
  id: "monthly-battle-close",

  // 00:05 UTC on the 1st of every month — gives a 5-minute buffer after midnight
  cron: "5 0 1 * *",

  run: async (payload) => {
    const now = payload.timestamp; // Date object (scheduled time)

    // The last battle is April 2027; its champion is crowned May 1, 2027.
    // After that, nothing to do.
    const isAfterLastCrowning =
      now.getFullYear() > 2027 ||
      (now.getFullYear() === 2027 && now.getMonth() >= 4); // May = index 4

    if (isAfterLastCrowning) {
      logger.log("All battles complete — no more champions to crown.");
      return { skipped: true, reason: "past final battle (April 2027)" };
    }

    // Previous month (the one that just ended)
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = monthStr(prevMonth);
    const monthName = monthLabel(prevMonth);

    const monthStartMs = new Date(
      prevMonth.getFullYear(),
      prevMonth.getMonth(),
      1
    ).getTime();
    const monthEndMs = new Date(
      prevMonth.getFullYear(),
      prevMonth.getMonth() + 1,
      0,
      23, 59, 59, 999
    ).getTime();

    logger.log(`Closing battle for ${monthName} ${prevMonth.getFullYear()}`, {
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
