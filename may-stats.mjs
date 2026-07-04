import fetch from "node-fetch";
import "dotenv/config";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const MAY_START = "2025-05-01T00:00:00.000Z";
const MAY_END   = "2025-05-31T23:59:59.999Z";

const res = await fetch(
  `${URL}/rest/v1/entries?select=*&timestamp=gte.${MAY_START}&timestamp=lte.${MAY_END}&order=timestamp.asc`,
  { headers: h }
);
const entries = await res.json();

if (!entries.length) { console.log("No entries found for May."); process.exit(); }

// ── Per-user counts ───────────────────────────────────────────────────────────
const byUser = {};
for (const e of entries) {
  const name = e.display_name || e.name || e.user_id || "unknown";
  if (!byUser[name]) byUser[name] = { count: 0, days: new Set(), moods: [] };
  byUser[name].count++;
  byUser[name].days.add(e.timestamp.slice(0, 10));
  if (e.mood != null) byUser[name].moods.push(e.mood);
}

// ── Daily totals ──────────────────────────────────────────────────────────────
const byDay = {};
for (const e of entries) {
  const day = e.timestamp.slice(0, 10);
  byDay[day] = (byDay[day] || 0) + 1;
}
const days = Object.entries(byDay).sort();
const busiest = days.reduce((a, b) => b[1] > a[1] ? b : a);
const quietest = days.reduce((a, b) => b[1] < a[1] ? b : a);

// ── Mood breakdown ────────────────────────────────────────────────────────────
const MOODS = ["😍", "😊", "😐", "😕", "🤢"];
const moodCounts = [0, 0, 0, 0, 0];
for (const e of entries) { if (e.mood != null) moodCounts[e.mood]++; }

// ── Streaks ───────────────────────────────────────────────────────────────────
function longestStreak(datesSet) {
  const sorted = [...datesSet].sort();
  let max = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i]) - new Date(sorted[i-1])) / 86400000;
    cur = diff === 1 ? cur + 1 : 1;
    if (cur > max) max = cur;
  }
  return max;
}

// ── Print ─────────────────────────────────────────────────────────────────────
console.log("\n🌭 HOTDOG SLAM — MAY 2025 STATS\n" + "═".repeat(40));
console.log(`\nTotal hotdogs logged: ${entries.length}`);
console.log(`Active days: ${Object.keys(byDay).length} / 31`);
console.log(`Busiest day: ${busiest[0]} (${busiest[1]} logs)`);
console.log(`Quietest day: ${quietest[0]} (${quietest[1]} log${quietest[1] > 1 ? "s" : ""})`);

console.log("\n👤 Per-person breakdown:");
const sorted = Object.entries(byUser).sort((a, b) => b[1].count - a[1].count);
for (const [name, d] of sorted) {
  const streak = longestStreak(d.days);
  const avgMood = d.moods.length ? (d.moods.reduce((a,b)=>a+b,0)/d.moods.length).toFixed(1) : "n/a";
  const moodEmoji = d.moods.length ? MOODS[Math.round(avgMood)] ?? "" : "";
  console.log(`  ${name}: ${d.count} logs across ${d.days.size} days | longest streak: ${streak}d | avg mood: ${avgMood} ${moodEmoji}`);
}

console.log("\n😄 Overall mood breakdown:");
for (let i = 0; i < MOODS.length; i++) {
  if (moodCounts[i]) console.log(`  ${MOODS[i]}  ${moodCounts[i]}x`);
}

// Most active hour
const byHour = {};
for (const e of entries) {
  const hr = new Date(e.timestamp).getUTCHours();
  byHour[hr] = (byHour[hr] || 0) + 1;
}
const peakHour = Object.entries(byHour).sort((a,b)=>b[1]-a[1])[0];
const fmt = h => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;
console.log(`\n⏰ Most active hour: ${fmt(+peakHour[0])} (${peakHour[1]} logs)`);

console.log("\n" + "═".repeat(40) + "\n");
