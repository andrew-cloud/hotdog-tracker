// One-off admin script: recomputes a month's champion from `entries` (using
// the same logic as src/trigger/monthly-battle.ts, including the July 4th
// 2026 ×2 multiplier) and upserts the corrected row into `monthly_champions`.
//
// Usage:  node scripts/recrown-month.mjs 2026-07
//
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (same as
// may-stats.mjs). Prints the old vs. new champion before writing, and only
// writes if they differ.

import fetch from "node-fetch";
import "dotenv/config";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const month = process.argv[2]; // "YYYY-MM"
if (!month || !/^\d{4}-\d{2}$/.test(month)) {
  console.error("Usage: node scripts/recrown-month.mjs YYYY-MM");
  process.exit(1);
}
const [year, mon] = month.split("-").map(Number);

const TZ = "America/Los_Angeles";
function toDateStrPT(d) { return d.toLocaleDateString("en-CA", { timeZone: TZ }); }
function getPacificOffsetMs(date) {
  const fmt = (tz) => new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(date);
  const toMs = (parts) => {
    const get = (t) => parseInt(parts.find((p) => p.type === t).value);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  };
  return toMs(fmt("UTC")) - toMs(fmt(TZ));
}
function ptToUTC(y, m, d, hh, mi, ss) {
  const c = new Date(Date.UTC(y, m - 1, d, hh, mi, ss));
  return c.getTime() + getPacificOffsetMs(c);
}
function isJuly4thPT(ts) { return toDateStrPT(new Date(ts)) === "2026-07-04"; }

// Mirrors DROPPED in src/App.jsx and src/trigger/monthly-battle.ts.
const DROPPED = ["tanto"];

const lastDay = new Date(year, mon, 0).getDate();
const monthStartMs = ptToUTC(year, mon, 1, 0, 0, 0);
const monthEndMs = ptToUTC(year, mon, lastDay, 23, 59, 59);

const res = await fetch(
  `${URL}/rest/v1/entries?timestamp=gte.${monthStartMs}&timestamp=lte.${monthEndMs}&select=name,count,timestamp&order=timestamp.asc`,
  { headers: h }
);
if (!res.ok) throw new Error(`Failed to fetch entries: ${await res.text()}`);
const entries = await res.json();

if (!entries.length) {
  console.log(`No entries found for ${month}.`);
  process.exit(0);
}

const totals = {};
for (const e of entries) {
  if (DROPPED.includes(e.name.toLowerCase())) continue;
  const k = e.name.toLowerCase();
  if (!totals[k]) totals[k] = { name: e.name, count: 0, lastTs: 0 };
  totals[k].count += e.count * (isJuly4thPT(e.timestamp) ? 2 : 1);
  totals[k].lastTs = Math.max(totals[k].lastTs, e.timestamp);
}
const sorted = Object.values(totals).sort((a, b) => b.count - a.count || a.lastTs - b.lastTs);
const winner = sorted[0];

const cur = await fetch(`${URL}/rest/v1/monthly_champions?month=eq.${month}&select=*`, { headers: h });
const [existing] = await cur.json();

console.log(`Recomputed champion for ${month}:`);
console.log(`  ${winner.name} — ${winner.count} dogs`);
if (existing) {
  console.log(`Current stored champion:`);
  console.log(`  ${existing.winner_name} — ${existing.dog_count} dogs`);
}

if (existing && existing.winner_name === winner.name && existing.dog_count === winner.count) {
  console.log("No change needed.");
  process.exit(0);
}

const upsert = await fetch(`${URL}/rest/v1/monthly_champions`, {
  method: "POST",
  headers: { ...h, Prefer: "resolution=merge-duplicates" },
  body: JSON.stringify({
    month,
    winner_name: winner.name,
    dog_count: winner.count,
    crowned_at: new Date().toISOString(),
  }),
});
if (!upsert.ok) throw new Error(`Failed to save champion: ${await upsert.text()}`);
console.log(`✅ Updated ${month} champion to ${winner.name} (${winner.count} dogs).`);
