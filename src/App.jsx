import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";
import { Avatar, Button, Input, Stepper, Textarea, UploadField, GifTile, Toast, Divider, TabBar, Select, RadioGroup } from "./design-system";

// ── Supabase ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = "https://lrjydzmsqkfmenrtoklv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyanlkem1zcWtmbWVucnRva2x2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTE5NjcsImV4cCI6MjA5MDAyNzk2N30.CzW0n8xunV9gholcPDYq-V7yxdtH29ud9piUyhEwxoY";

// Realtime client — only used for WebSocket subscriptions.
// All REST calls continue to use the plain fetch-based `sb` object below.
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/trigger-gif`;

const sb = {
  headers: {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  },
  async getEntries() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/entries?select=*&order=timestamp.desc`, { headers: this.headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async insertEntry(entry) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/entries`, {
      method: "POST",
      headers: { ...this.headers, "Prefer": "return=representation" },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async uploadVideo(id, file) {
    // Kept for reference — actual upload now handled by uploadVideoTus() below
    throw new Error("Use uploadVideoTus() instead");
  },
  async triggerGifConversion(entryId, videoPath) {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ entryId, videoPath }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async getEntry(id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/entries?id=eq.${id}&select=*`, { headers: this.headers });
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    return rows[0] || null;
  },
  async getUsers() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?select=name_key,display_name,avatar_url,created_at&order=created_at.asc`, { headers: this.headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async getUser(displayName) {
    // Deliberately excludes pin — never fetch PINs to the client
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?display_name=eq.${encodeURIComponent(displayName)}&select=name_key,display_name`, { headers: this.headers });
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    return rows[0] || null;
  },
  async verifyPin(displayName, pin) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
      body: JSON.stringify({ displayName, pin }),
    });
    if (!res.ok) throw new Error("PIN verification failed");
    const { valid } = await res.json();
    return valid;
  },
  async createUser(displayName, pin, avatarUrl) {
    const nameKey = displayName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: "POST",
      headers: { ...this.headers, "Prefer": "return=representation" },
      body: JSON.stringify({ name_key: nameKey, display_name: displayName, pin, avatar_url: avatarUrl }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  // Returns { [display_name_lowercase]: rank } for all contestants
  async getRankSnapshot() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rank_snapshots?select=display_name,rank`, { headers: this.headers });
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    return Object.fromEntries(rows.map(r => [r.display_name.toLowerCase(), r.rank]));
  },
  // Upserts current standings — called once after data loads
  async saveRankSnapshot(standings) {
    const rows = standings.map((p, i) => ({
      display_name: p.name,
      rank: i + 1,
      updated_at: new Date().toISOString(),
    }));
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rank_snapshots`, {
      method: "POST",
      headers: { ...this.headers, "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify(rows),
    });
    if (!res.ok) throw new Error(await res.text());
  },
  // Returns all past monthly champions sorted newest-first
  async getMonthlyChampions() {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/monthly_champions?select=month,winner_name,dog_count&order=month.desc`,
      { headers: this.headers }
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json(); // [{ month, winner_name, dog_count }, ...]
  },
};

// ── Mac Mini upload server ────────────────────────────────────────────────────
// Raw video is sent to the local server which compresses with native FFmpeg
// (seconds, not minutes) and uploads to Supabase using the service key.
// The server URL comes from a Cloudflare Tunnel — update this when the
// tunnel URL changes.
//
// To start the server:
//   cd hotdog-server && node server.js
//   npx cloudflare tunnel --url http://localhost:3001
//
// The tunnel prints a URL like https://xxxx-xxxx.trycloudflare.com
// Paste that URL below.

const MAC_MINI_URL = window.__UPLOAD_SERVER_URL__ || "https://uploads.andrewcloud.com";

async function uploadVideoViaMacMini(id, file, onProgress) {
  const CHUNK_SIZE  = 5 * 1024 * 1024; // 5 MB — well under Cloudflare's per-request limit
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const storagePath = `${id}.mp4`;

  // ── Send file in 5 MB slices ──────────────────────────────────────────────
  // Each chunk is a separate POST — small enough to pass through Cloudflare.
  // The Mac Mini reassembles, compresses with FFmpeg, then uploads to Supabase.
  //
  // Retries: mobile browsers occasionally drop the TCP connection mid-chunk
  // (backgrounded tab, brief network blip, screen sleep). A chunk is a Blob
  // slice so it's safe to resend — re-creating FormData each time avoids
  // consuming a stream that can only be read once.
  const MAX_CHUNK_ATTEMPTS = 4;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const chunk = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
    const url   = `${MAC_MINI_URL}/upload-chunk?id=${encodeURIComponent(id)}`;

    let lastErr;
    for (let attempt = 1; attempt <= MAX_CHUNK_ATTEMPTS; attempt++) {
      try {
        // Recreate FormData every attempt — consumed body can't be re-sent
        const form = new FormData();
        form.append("chunk", chunk, file.name);
        form.append("index", String(i));
        form.append("total", String(totalChunks));

        const res = await fetch(url, { method: "POST", body: form });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        lastErr = null;
        break; // success — move to next chunk
      } catch (err) {
        lastErr = err;
        if (attempt < MAX_CHUNK_ATTEMPTS) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
          console.warn(`Chunk ${i + 1}/${totalChunks} attempt ${attempt} failed, retrying…`, err.message);
        }
      }
    }
    if (lastErr) throw new Error(`Chunk ${i + 1}/${totalChunks} failed after ${MAX_CHUNK_ATTEMPTS} attempts: ${lastErr.message}`);

    onProgress(Math.round(((i + 1) / totalChunks) * 100));
  }

  // ── Tell the Mac Mini to assemble + compress + trigger GIF ────────────────
  const finalRes = await fetch(
    `${MAC_MINI_URL}/upload-finalize?id=${encodeURIComponent(id)}`,
    { method: "POST" }
  );
  if (!finalRes.ok) throw new Error(`Finalize failed: ${finalRes.status}`);

  return storagePath;
}


function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Time zone ─────────────────────────────────────────────────────────────────
// All calendar-day logic uses Pacific Time so every contestant plays by the
// same clock regardless of where they are in the country.

const TZ = "America/Los_Angeles";

// "YYYY-MM-DD" in Pacific Time
function toDateStr(d) {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

// How many ms Pacific Time is behind UTC at the given instant.
// Uses Intl.DateTimeFormat.formatToParts — works in all modern browsers / Node 14+.
function getPacificOffsetMs(date) {
  const fmt = (tz) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    }).formatToParts(date);

  const toMs = (parts) => {
    const get = (type) => parseInt(parts.find((p) => p.type === type).value);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  };

  return toMs(fmt("UTC")) - toMs(fmt(TZ)); // e.g. 25_200_000 for PDT (UTC-7)
}

// UTC timestamp for a date/time expressed in Pacific Time.
// Accurate everywhere except within the ambiguous hour of a DST fall-back,
// which never overlaps with month-boundary calculations.
function ptToUTC(y, m, d, h, min, s) {
  const candidate = new Date(Date.UTC(y, m - 1, d, h, min, s));
  return candidate.getTime() + getPacificOffsetMs(candidate);
}

// ── Streak helpers ────────────────────────────────────────────────────────────

// Returns an array of { name, streak, active } for all contestants tied at
// the longest all-time streak of consecutive calendar days with at least one
// logged entry.  "active" = the streak ends today or yesterday (still unbroken).
// When multiple people share the top streak length, all are returned so the UI
// can display each tied contestant.
function computeLongestStreak(entries) {
  if (!entries.length) return [];

  const today = new Date();
  const todayStr     = toDateStr(today);
  const yesterday    = new Date(today); yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = toDateStr(yesterday);

  // Collect entries per user, and track the earliest timestamp per calendar date
  // (needed to tiebreak when multiple users share the same longestEnd date)
  const byUser = {};
  for (const e of entries) {
    if (!byUser[e.name]) byUser[e.name] = { dates: new Set(), firstTs: {} };
    const d = toDateStr(new Date(e.timestamp));
    byUser[e.name].dates.add(d);
    // Keep the earliest log timestamp for each date
    if (byUser[e.name].firstTs[d] === undefined || e.timestamp < byUser[e.name].firstTs[d]) {
      byUser[e.name].firstTs[d] = e.timestamp;
    }
  }

  // Compute each person's longest streak
  const all = [];
  for (const [name, { dates: datesSet, firstTs }] of Object.entries(byUser)) {
    const dates = [...datesSet].sort(); // "YYYY-MM-DD" sorts lexicographically
    let longestLen = 1, longestEnd = dates[0], cur = 1;

    for (let i = 1; i < dates.length; i++) {
      const diffMs = new Date(dates[i] + "T00:00:00") - new Date(dates[i - 1] + "T00:00:00");
      if (Math.round(diffMs / 86400000) === 1) {
        cur++;
        if (cur > longestLen) { longestLen = cur; longestEnd = dates[i]; }
      } else {
        cur = 1;
      }
    }

    // Active only if the streak's final day is today or yesterday AND is the
    // person's most recent logged day (prevents a lapsed streak from counting)
    const lastDate = dates[dates.length - 1];
    const active   = longestEnd === lastDate && (lastDate === todayStr || lastDate === yesterdayStr);

    // longestEndTs: earliest log on longestEnd — tiebreaker when dates are equal
    const longestEndTs = firstTs[longestEnd] ?? 0;

    all.push({ name, streak: longestLen, active, longestEnd, longestEndTs });
  }

  // Find the top streak length
  const maxStreak = Math.max(...all.map(p => p.streak));

  // Return everyone tied at the top, sorted by who reached it first.
  // Primary: longestEnd date (earlier = reached it first).
  // Secondary: earliest log on that date (tiebreaker within the same day).
  return all
    .filter(p => p.streak === maxStreak)
    .sort((a, b) =>
      a.longestEnd < b.longestEnd ? -1 :
      a.longestEnd > b.longestEnd ?  1 :
      a.longestEndTs - b.longestEndTs
    );
}

// ── Monthly battle helpers ────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// "2026-04" → "April"
function monthStrToName(monthStr) {
  const month = parseInt(monthStr.split("-")[1], 10);
  return MONTH_NAMES[month - 1];
}

// Countdown to 23:59:59 Pacific Time on the last day of the current Pacific month
function getCountdown(now) {
  const pacificStr = toDateStr(now); // "YYYY-MM-DD" in PT
  const [year, month] = pacificStr.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate(); // last day of this Pacific month
  const endMs = ptToUTC(year, month, lastDay, 23, 59, 59);
  const diff = endMs - now.getTime();
  if (diff <= 0) return "Ended";
  const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  if (days >= 1) return `${days}d ${hours}h`;
  return `${hours}h ${minutes}m ${seconds}s`;
}

function formatDate(timestamp) {
  if (!timestamp) return "";
  const d = new Date(typeof timestamp === "number" ? timestamp : Date.parse(timestamp));
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  );
}

const NEW_USER_SENTINEL = "__new__";

// Computes standings sorted by count desc, tiebroken by who reached that
// count first (earliest timestamp of the entry that completed their total).
function computeStandings(entries, users, userCreatedAt = {}) {
  const byUser = {};
  for (const u of users) byUser[u.toLowerCase()] = { name: u, entries: [] };
  for (const e of entries) {
    const k = e.name.toLowerCase();
    if (!byUser[k]) byUser[k] = { name: e.name, entries: [] };
    byUser[k].entries.push(e);
  }
  return Object.values(byUser).map(({ name, entries: ents }) => {
    const sorted = [...ents].sort((a, b) => a.timestamp - b.timestamp);
    const total = sorted.reduce((s, e) => s + e.count, 0);
    let cum = 0, reachedAt = null;
    for (const e of sorted) {
      cum += e.count;
      if (cum >= total) { reachedAt = e.timestamp; break; }
    }
    // Fall back to signup time so zero-count users sort by join order
    if (reachedAt === null) {
      const ca = userCreatedAt[name.toLowerCase()];
      reachedAt = ca ? new Date(ca).getTime() : 0;
    }
    return { name, count: total, reachedAt };
  }).sort((a, b) => b.count - a.count || a.reachedAt - b.reachedAt);
}

const EMOJI_POOL = [
  // Animals (30)
  "🐶","🐱","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐸",
  "🐧","🦆","🦅","🦉","🦋","🐢","🐙","🦈","🐬","🦓",
  "🐘","🦒","🦘","🦔","🐿","🦡","🦦","🦜","🦩","🦢",
  // Food (30)
  "🍎","🍊","🍋","🍇","🍓","🫐","🍒","🥭","🍍","🥝",
  "🥑","🌽","🧀","🥚","🥞","🥓","🥩","🍗","🌭","🍔",
  "🍕","🌮","🧁","🍰","🍩","🍪","🍫","🍿","🍣","🍜",
  // Nature & objects (30)
  "🌈","🔥","🌊","🌸","🌺","🌻","🍀","🍄","🌵","🌙",
  "⭐","💫","🎃","🎄","🎈","🎉","🎊","🏆","🥇","🎯",
  "🎮","🎲","🧩","🎨","🎤","🎸","🚀","🛸","💎","🔮",
];

function pickEmoji(usedEmojis = []) {
  const available = EMOJI_POOL.filter(e => !usedEmojis.includes(e));
  const pool = available.length > 0 ? available : EMOJI_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function HotdogTracker() {
  const [tab, setTab] = useState(() => {
    // Restore last active tab on refresh, default to "log"
    return localStorage.getItem("hds-tab") || "log";
  });

  // Persist tab changes
  const handleTabChange = (val) => {
    setTab(val);
    localStorage.setItem("hds-tab", val);
  };
  const [step, setStep] = useState("auth"); // "auth" | "entry"

  // Auth state
  const [selectedName, setSelectedName] = useState("");
  const [customName, setCustomName] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isNewUser, setIsNewUser] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [authedName, setAuthedName] = useState(null);

  // Log form state
  const [count, setCount] = useState(1);
  const [notes, setNotes] = useState("");
  const [mood, setMood] = useState(3); // 1–5, default neutral
  const [daysAgo, setDaysAgo] = useState(0); // 0 = today, 1–3 = backdated
  const [videoFile, setVideoFile] = useState(null);
  const [videoFileSize, setVideoFileSize] = useState("");
  const [videoState, setVideoState] = useState("default");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [avatarByName, setAvatarByName] = useState({});
  const [userCreatedAt, setUserCreatedAt] = useState({}); // name.toLowerCase() → ISO string
  const [loadingData, setLoadingData] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [toast, setToast] = useState(null);
  const [monthlyChampions, setMonthlyChampions] = useState([]);

  const topSentinelRef    = useRef(null);
  const bottomSentinelRef = useRef(null);
  const scrollAnchor      = useRef(null); // { id, top } — set before each window shift
  const resubmitInputRef  = useRef(null); // hidden file input for resubmit flow
  const resubmitEntryRef  = useRef(null); // entry being resubmitted
  const [windowStart, setWindowStart] = useState(0);

  // Previous-session rank snapshot for position-change arrows (▲/▼).
  // Fetched from Supabase on load — survives cache clears and works across devices.
  const [prevRankByName, setPrevRankByName] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const [entryData, userData, rankSnapshot, champions] = await Promise.all([
          sb.getEntries(),
          sb.getUsers(),
          sb.getRankSnapshot(),
          sb.getMonthlyChampions(),
        ]);
        setEntries(entryData);
        setUsers(userData.map(u => u.display_name));
        setAvatarByName(Object.fromEntries(userData.map(u => [u.display_name, u.avatar_url ?? null])));
        setUserCreatedAt(Object.fromEntries(userData.map(u => [u.display_name.toLowerCase(), u.created_at])));
        const pending = new Set(entryData.filter(e => e.video_path && !e.gif_url).map(e => e.id));
        setProcessingIds(pending);
        setPrevRankByName(rankSnapshot);
        setMonthlyChampions(champions);
      } catch {
        showToast("Could not load data", "error");
      }
      setLoadingData(false);
    })();
  }, []);

  // ── Realtime: GIF-ready notifications ────────────────────────────────────
  // Supabase pushes an UPDATE event the moment gif_url is written to the DB.
  // One persistent WebSocket replaces the old 5-second polling interval.
  // Requires Realtime to be enabled on the `entries` table in Supabase dashboard:
  //   Database → Replication → Tables → entries → toggle on
  useEffect(() => {
    const channel = supabase
      .channel("gif-ready")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "entries" },
        (payload) => {
          const updated = payload.new;
          if (!updated.gif_url) return;
          // Use functional updaters so we never close over stale state
          setEntries((prev) => {
            const existing = prev.find((e) => e.id === updated.id);
            if (!existing || existing.gif_url) return prev; // already up to date
            showToast("🎉 GIF is ready in the gallery!");
            return prev.map((e) =>
              e.id === updated.id ? { ...e, gif_url: updated.gif_url } : e
            );
          });
          setProcessingIds((prev) => {
            if (!prev.has(updated.id)) return prev;
            const next = new Set(prev);
            next.delete(updated.id);
            return next;
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fallback poll for stuck processing tiles ──────────────────────────────
  // Realtime can miss UPDATE events (tab backgrounded, network blip, etc.).
  // Every 15 seconds, re-fetch any entries still without a gif_url and patch
  // them in — so GIFs always appear even if the WebSocket event was dropped.
  useEffect(() => {
    const interval = setInterval(async () => {
      // Only run when there are actually entries still processing
      setEntries(prev => {
        const stuck = prev.filter(e => e.video_path && !e.gif_url);
        if (!stuck.length) return prev; // nothing to check

        // Fire-and-forget: fetch each stuck entry and patch gif_url if ready
        Promise.all(stuck.map(e => sb.getEntry(e.id))).then(fresh => {
          const updates = fresh.filter(e => e?.gif_url);
          if (!updates.length) return;

          setEntries(current =>
            current.map(e => {
              const updated = updates.find(u => u.id === e.id);
              return updated ? { ...e, gif_url: updated.gif_url } : e;
            })
          );
          setProcessingIds(current => {
            const next = new Set(current);
            updates.forEach(u => next.delete(u.id));
            return next;
          });
          if (updates.length === 1) showToast("🎉 GIF is ready in the gallery!");
          else showToast(`🎉 ${updates.length} GIFs are ready in the gallery!`);
        }).catch(() => {}); // silent — Realtime is the primary path

        return prev; // no synchronous state change
      });
    }, 15_000);

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Gallery window (derived early so effects can reference gallery) ──────
  const gallery = entries.filter(e => e.video_path || e.gif_url);

  // Snapshot is saved inside handleSubmit (before a new entry is inserted),
  // so arrows reflect the change caused by the most recent log and persist
  // until the next dog is logged. We do NOT save here on page load.

  // ── Monthly battle ────────────────────────────────────────────────────────
  // All month logic uses Pacific Time so "end of month" is the same instant
  // for everyone regardless of their device's local clock.
  const nowDate = new Date();
  const pacificDateStr  = toDateStr(nowDate);                          // "2026-04-17"
  const pacificYear     = parseInt(pacificDateStr.slice(0, 4));
  const pacificMonth    = parseInt(pacificDateStr.slice(5, 7));
  const currentMonthStr = pacificDateStr.slice(0, 7);                  // "2026-04"
  const currentMonthName = MONTH_NAMES[pacificMonth - 1];
  // Only show a battle card up through April 2027
  const showBattleCard = currentMonthStr <= "2027-04";

  // Pacific month boundaries as UTC timestamps
  const lastDayOfMonth = new Date(pacificYear, pacificMonth, 0).getDate();
  const monthStart = ptToUTC(pacificYear, pacificMonth, 1, 0, 0, 0);
  const monthEnd   = ptToUTC(pacificYear, pacificMonth, lastDayOfMonth, 23, 59, 59);
  const battleEntries = entries.filter(e => e.timestamp >= monthStart && e.timestamp <= monthEnd);

  // Aggregate into battle standings — top 3, tie-break: most dogs, then earliest last entry
  const battleTotals = {};
  for (const e of battleEntries) {
    const k = e.name.toLowerCase();
    if (!battleTotals[k]) battleTotals[k] = { name: e.name, count: 0, lastTs: 0 };
    battleTotals[k].count += e.count;
    battleTotals[k].lastTs = Math.max(battleTotals[k].lastTs, e.timestamp);
  }
  const battleStandings = Object.values(battleTotals)
    .sort((a, b) => b.count - a.count || a.lastTs - b.lastTs)
    .slice(0, 3);

  // Live countdown to end of month
  const [countdown, setCountdown] = useState(() => getCountdown(new Date()));
  useEffect(() => {
    const interval = setInterval(() => setCountdown(getCountdown(new Date())), 1000);
    return () => clearInterval(interval);
  }, []);

  // Past champion cards — exclude current month in case it got seeded early
  const pastChampions = monthlyChampions.filter(c => c.month < currentMonthStr);

  // Longest streak across all contestants
  const longestStreak = computeLongestStreak(entries);

  // Sliding window constants
  const WINDOW_SIZE      = 24;  // max tiles in the DOM at once
  const BATCH_SIZE       = 8;   // tiles added/removed per step
  const EST_TILE_HEIGHT  = 400; // rough px height used for spacer sizing only

  const windowEnd      = Math.min(windowStart + WINDOW_SIZE, gallery.length);
  const hasMoreBelow   = windowEnd < gallery.length;
  const hasMoreAbove   = windowStart > 0;

  // ── Gallery pagination ────────────────────────────────────────────────────
  // Two sentinels bookend the visible window.
  //   Bottom sentinel → slide window forward (scroll down)
  //   Top sentinel    → slide window back    (scroll up)
  // After each shift, useLayoutEffect restores scroll position exactly using
  // getBoundingClientRect on a saved anchor element (no layout estimates needed).
  useEffect(() => {
    if (tab !== "gallery") {
      setWindowStart(0);
      return;
    }

    const observers = [];

    const bottom = bottomSentinelRef.current;
    if (bottom && hasMoreBelow) {
      const obs = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        // Anchor = first tile that will survive the trim (stays visible after shift)
        const anchor = gallery[windowStart + BATCH_SIZE];
        if (anchor) {
          const el = document.getElementById(`tile-${anchor.id}`);
          if (el) scrollAnchor.current = { id: `tile-${anchor.id}`, top: el.getBoundingClientRect().top };
        }
        setWindowStart(prev => prev + BATCH_SIZE);
      }, { rootMargin: "200px" });
      obs.observe(bottom);
      observers.push(obs);
    }

    const top = topSentinelRef.current;
    if (top && hasMoreAbove) {
      const obs = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        // Anchor = first currently-visible tile (will move down as tiles are prepended)
        const anchor = gallery[windowStart];
        if (anchor) {
          const el = document.getElementById(`tile-${anchor.id}`);
          if (el) scrollAnchor.current = { id: `tile-${anchor.id}`, top: el.getBoundingClientRect().top };
        }
        setWindowStart(prev => Math.max(0, prev - BATCH_SIZE));
      }, { rootMargin: "200px" });
      obs.observe(top);
      observers.push(obs);
    }

    return () => observers.forEach(o => o.disconnect());
  }, [tab, windowStart, gallery.length]);

  // After the DOM updates from a window shift, restore the anchor element to
  // the same viewport position it had before. This prevents any visible jump.
  useLayoutEffect(() => {
    if (!scrollAnchor.current) return;
    const { id, top: savedTop } = scrollAnchor.current;
    const el = document.getElementById(id);
    if (el) window.scrollBy(0, el.getBoundingClientRect().top - savedTop);
    scrollAnchor.current = null;
  }, [windowStart]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Retry GIF conversion for stuck tiles ──────────────────────────────────

  const handleRetryGif = async (entry) => {
    if (!entry.video_path) return;
    try {
      await sb.triggerGifConversion(entry.id, entry.video_path);
      showToast("🔄 Re-triggered — GIF should arrive shortly");
    } catch (err) {
      showToast("Retry failed: " + err.message, "error");
    }
  };

  // ── Resubmit lost video for stuck tiles ───────────────────────────────────
  // Opens a file picker; on selection, re-uploads using the existing entry ID
  // so the video lands at the correct path in Supabase Storage, then triggers
  // GIF conversion. The DB entry is left intact — only the video is replaced.

  const handleResubmitGif = (entry) => {
    resubmitEntryRef.current = entry;
    resubmitInputRef.current?.click();
  };

  const handleResubmitFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so the same file can be picked again if needed
    if (!file || !resubmitEntryRef.current) return;

    const entry = resubmitEntryRef.current;
    resubmitEntryRef.current = null;

    try {
      showToast("Re-uploading video…");
      // Reuse the existing entry ID so the video lands at the right storage path
      await uploadVideoViaMacMini(entry.id, file, () => {});
      await sb.triggerGifConversion(entry.id, entry.video_path);
      showToast("🔄 Re-uploaded — GIF converting in the background");
    } catch (err) {
      showToast("Resubmit failed: " + err.message, "error");
    }
  };

  // ── Auth ──────────────────────────────────────────────────────────────────

  const activeName = selectedName === NEW_USER_SENTINEL ? customName.trim() : selectedName;

  const nameOptions = [
    ...users.map(u => ({ value: u, label: u })),
    { value: NEW_USER_SENTINEL, label: "New contestant" },
  ];

  // When an existing user is selected from the dropdown, look them up once
  // to determine new/existing. For new contestants we know isNewUser = true
  // immediately — no per-keystroke lookup needed.
  useEffect(() => {
    if (selectedName === NEW_USER_SENTINEL) {
      // New contestant — show both fields immediately, no lookup
      setIsNewUser(true);
      setLoginPin("");
      setConfirmPin("");
      setLoginError("");
      return;
    }
    if (!selectedName) {
      setIsNewUser(null);
      return;
    }
    // Existing user selected from dropdown — look up once
    let cancelled = false;
    setIsNewUser(null);
    setLoginPin("");
    setConfirmPin("");
    setLoginError("");
    (async () => {
      try {
        const existingUser = await sb.getUser(selectedName);
        if (!cancelled) setIsNewUser(!existingUser);
      } catch {
        if (!cancelled) setIsNewUser(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedName]); // only runs when dropdown selection changes, not on every keystroke

  const handlePinConfirm = async () => {
    if (!activeName) {
      setLoginError("Please enter your name");
      return;
    }
    if (isNewUser && !/^[a-zA-Z0-9 ]+$/.test(activeName)) {
      setLoginError("Name can only contain letters, numbers, and spaces");
      return;
    }
    if (!loginPin || loginPin.length < 4) {
      setLoginError("Enter your 4-digit PIN");
      return;
    }
    if (isNewUser && confirmPin !== loginPin) {
      setLoginError("PINs don't match — try again");
      return;
    }
    setConfirming(true);
    setLoginError("");
    try {
      if (isNewUser) {
        // Check for duplicate name at confirm time
        const existingUser = await sb.getUser(activeName);
        if (existingUser) {
          setLoginError(`"${activeName}" is already taken — select them from the list instead.`);
          setConfirming(false);
          return;
        }
        const usedEmojis = Object.values(avatarByName).filter(v => EMOJI_POOL.includes(v));
        const emoji = pickEmoji(usedEmojis);
        await sb.createUser(activeName, loginPin, emoji);
        setUsers(prev => [...prev, activeName].sort());
        setAvatarByName(prev => ({ ...prev, [activeName]: emoji }));
      } else {
        const valid = await sb.verifyPin(activeName, loginPin);
        if (!valid) {
          setLoginError("Incorrect PIN");
          setLoginPin("");
          setConfirming(false);
          return;
        }
      }
      setAuthedName(activeName);
      setStep("entry");
      setSelectedName("");
      setCustomName("");
      setLoginPin("");
      setConfirmPin("");
      setIsNewUser(null);
    } catch {
      setLoginError("Something went wrong");
    }
    setConfirming(false);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  // File selected by user — "selected" state, upload happens on submit
  const handleFileSelect = (file) => {
    const MAX_SIZE = 1 * 1024 * 1024 * 1024; // 1 GB
    if (file.size > MAX_SIZE) {
      showToast("File is too large. Maximum size is 1 GB. 🚫", "error");
      return;
    }
    setVideoFile(file);
    setVideoState("selected");
    const mb = (file.size / 1024 / 1024).toFixed(1);
    setVideoFileSize(`${mb} MB`);
  };

  const handleSubmit = async () => {
    if (!videoFile) {
      showToast("Video proof is required! 📹", "error");
      return;
    }
    setSubmitting(true);
    setUploadProgress(0);
    try {
      const id = generateId();

      // ── Upload to Mac Mini server (compresses + uploads to Supabase) ─────
      showToast("Uploading video...");
      setVideoState("uploading");

      const videoPath = await uploadVideoViaMacMini(id, videoFile, (pct) => {
        setUploadProgress(pct);
      });
      setUploadProgress(100);
      setVideoState("filled");

      // ── Snapshot current standings before inserting the new entry ────────
      // This freezes the "before" state so arrows persist until the next log.
      const currentStandings = computeStandings(entries, users, userCreatedAt);
      sb.saveRankSnapshot(currentStandings).catch(err =>
        console.warn("Rank snapshot save failed (non-fatal):", err)
      );

      // ── Save entry ───────────────────────────────────────────────────────
      const entry = {
        id,
        name: authedName,
        count: Number(count),
        timestamp: Date.now() - daysAgo * 24 * 60 * 60 * 1000,
        gif_url: null,
        video_path: videoPath,
        notes: notes.trim() || null,
        mood: mood ?? null,
      };
      await sb.insertEntry(entry);

      // GIF conversion is triggered by the Mac Mini server after it finishes
      // compressing and uploading the video. We no longer trigger it here to
      // avoid a race condition where Trigger.dev starts before the video is
      // in Supabase. The Realtime subscription notifies us when the GIF is ready.

      setProcessingIds(prev => new Set([...prev, id]));
      setEntries(prev => [entry, ...prev]);

      // Navigate to gallery first, then show the toast there
      setCount(1);
      setNotes("");
      setMood(3);
      setDaysAgo(0);
      setVideoFile(null);
      setVideoFileSize("");
      setVideoState("default");
      setUploadProgress(0);
      handleTabChange("gallery");
      showToast("Logged! 🌭 GIF converting in the background...");
    } catch (e) {
      console.error("Submit error:", e);
      showToast(e.message || "Something went wrong — please try again.", "error");
      setVideoState("error");
    }
    setSubmitting(false);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const standings = computeStandings(entries, users, userCreatedAt);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="app">

      {/* ── Header ── */}
      <div className="app-header">
        <h1 className="app-title">Year of the Dog</h1>
      </div>

      {/* ── Tab bar + content ── */}
      <div className="app-content">
        <TabBar
          variant="pointing"
          tabs={[
            { value: "log",       label: "Log a dog"  },
            { value: "standings", label: "Standings"  },
            { value: "gallery",   label: "Gallery"    },
          ]}
          value={tab}
          onChange={val => handleTabChange(val)}
          style={{ width: "100%", flexShrink: 0 }}
        />

        <div className="app-body">

          {/* ══ LOG TAB ══════════════════════════════════════════════════════ */}
          {tab === "log" && (
            <>

              {/* Auth — single card, PIN appears after name is selected */}
              {step === "auth" && (
                <div className="ds-card ds-card-overflow">
                  <div className="ds-card-header">
                    <span className="ds-card-title">Who's chowin' down?</span>
                  </div>
                  <div className="ds-card-body">

                    {/* Name select */}
                    <Select
                      label="Contestant"
                      options={nameOptions}
                      value={selectedName}
                      onChange={val => {
                        setSelectedName(val);
                        setCustomName("");
                        setLoginError("");
                        setLoginPin("");
                        setIsNewUser(null);
                      }}
                      placeholder="— Choose —"
                    />

                    {/* Custom name input — new contestant only */}
                    {selectedName === NEW_USER_SENTINEL && (
                      <div style={{ marginTop: 16 }}>
                        <Input
                          label="Your name"
                          placeholder="Enter your name"
                          value={customName}
                          onChange={e => { setCustomName(e.target.value); setLoginError(""); }}
                          state={loginError && !loginPin ? "error" : "default"}
                          hint={loginError && !loginPin ? loginError : undefined}
                          showHint={!!(loginError && !loginPin)}
                          autoFocus
                        />
                      </div>
                    )}

                    {/* PIN field — for existing users: appears after name selected + lookup done
                                   for new contestants: appears immediately on selection */}
                    {isNewUser !== null && (
                      <div style={{ marginTop: 16 }}>
                        <Input
                          label={isNewUser ? "Enter a four-digit PIN" : "Enter your PIN"}
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          value={loginPin}
                          onChange={e => {
                            setLoginPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                            setLoginError("");
                          }}
                          onKeyDown={e => { if (e.key === "Enter" && loginPin.length === 4 && (!isNewUser || confirmPin.length === 4)) handlePinConfirm(); }}
                          state={loginError && !isNewUser ? "error" : "default"}
                          hint={!isNewUser ? loginError : undefined}
                          showHint={!isNewUser && !!loginError}
                          autoFocus={!isNewUser}
                        />
                      </div>
                    )}

                    {/* Confirm PIN — new contestants only */}
                    {isNewUser && (
                      <div style={{ marginTop: 16 }}>
                        <Input
                          label="Confirm PIN"
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          value={confirmPin}
                          onChange={e => {
                            setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                            setLoginError("");
                          }}
                          onKeyDown={e => { if (e.key === "Enter" && confirmPin.length === 4) handlePinConfirm(); }}
                          state={loginError && confirmPin.length > 0 ? "error" : "default"}
                          hint={loginError && confirmPin.length > 0 ? loginError : undefined}
                          showHint={!!(loginError && confirmPin.length > 0)}
                        />
                      </div>
                    )}

                    {/* Confirm — always visible, disabled until name + PIN (+ confirm) are ready */}
                    <div style={{ marginTop: 24 }}>
                      <Button
                        buttonStyle="primary"
                        size="medium"
                        label={confirming ? "Confirming…" : "Confirm"}
                        loading={confirming}
                        disabled={!activeName || loginPin.length < 4 || (isNewUser && confirmPin.length < 4) || confirming}
                        onClick={handlePinConfirm}
                        style={{ width: "100%" }}
                      />
                    </div>

                  </div>
                </div>
              )}


              {/* Step 2 — Dog entry form */}
              {step === "entry" && (
                <>
                  <p className="ds-welcome">
                    Welcome{isNewUser === false ? " back" : " to the league"}, {authedName}!
                  </p>

                  <div className="ds-card">
                    <div className="ds-card-header">
                      <span className="ds-card-title">Hot dogs consumed</span>
                    </div>
                    <div className="ds-card-body">
                      <Stepper value={count} min={1} max={10} onChange={setCount} />
                    </div>
                  </div>

                  <div className="ds-card">
                    <div className="ds-card-header">
                      <span className="ds-card-title">Video proof (required)</span>
                      <span className="ds-card-subtitle">
                        Your video will be converted to a gif and proudly displayed in the gallery.
                      </span>
                    </div>
                    <div className="ds-card-body">
                      <UploadField
                        state={videoState}
                        progress={uploadProgress}
                        filename={videoFile?.name}
                        filesize={videoFileSize}
                        onFile={handleFileSelect}
                        accept="video/*"
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>

                  <div className="ds-card">
                    <div className="ds-card-header">
                      <span className="ds-card-title">When did you chow down?</span>
                      {daysAgo > 0 && (() => {
                        const then = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
                        const now  = new Date();
                        const crossesMonth = then.getMonth() !== now.getMonth() || then.getFullYear() !== now.getFullYear();
                        return crossesMonth ? (
                          <span className="ds-card-subtitle" style={{ color: "var(--semantic\\/warning, #e8a44a)" }}>
                            This date is in a past month — it won't affect that month's champion.
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <div className="ds-card-body">
                      <RadioGroup
                        name="daysAgo"
                        value={daysAgo}
                        onChange={(v) => setDaysAgo(Number(v))}
                        options={[
                          { value: 0, label: "Today" },
                          { value: 1, label: "1 day ago" },
                          { value: 2, label: "2 days ago" },
                          { value: 3, label: "3 days ago" },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="ds-card">
                    <div className="ds-card-header">
                      <span className="ds-card-title">How did it feel?</span>
                    </div>
                    <div className="ds-card-body">
                      <div className="ds-mood-picker">
                        {[
                          { value: 1, emoji: "🤢" },
                          { value: 2, emoji: "😕" },
                          { value: 3, emoji: "😐" },
                          { value: 4, emoji: "🙂" },
                          { value: 5, emoji: "🤩" },
                        ].map(({ value, emoji }) => (
                          <button
                            key={value}
                            className={`ds-mood-btn${mood === value ? " ds-mood-btn--selected" : ""}`}
                            onClick={() => setMood(prev => prev === value ? null : value)}
                            type="button"
                            aria-label={`Mood ${value} of 5`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="ds-card">
                    <div className="ds-card-header">
                      <span className="ds-card-title">Notes</span>
                      <span className="ds-card-subtitle">
                        Optional, but everyone loves a good story.
                      </span>
                    </div>
                    <div className="ds-card-body">
                      <Textarea
                        value={notes}
                        placeholder={`"So there I was, just me and the 7/11 employee..."`}
                        onChange={e => setNotes(e.target.value)}
                        maxLength={240}
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>

                  <Button
                    buttonStyle="primary"
                    size="medium"
                    label={submitting ? "Logging…" : "Log it!"}
                    loading={submitting}
                    disabled={submitting || !videoFile}
                    onClick={handleSubmit}
                    style={{ width: "100%" }}
                  />
                </>
              )}

            </>
          )}

          {/* ══ STANDINGS TAB ════════════════════════════════════════════════ */}
          {tab === "standings" && (
            <>
              {/* ── Overall standings card ── */}
              <div className="ds-card ds-card-shadow">
                <div className="ds-card-header">
                  <span className="ds-card-title">Standings</span>
                </div>
                <div className="ds-card-body" style={{ padding: "20px" }}>
                  {loadingData ? (
                    <p className="ds-empty">Loading…</p>
                  ) : standings.length === 0 ? (
                    <p className="ds-empty">No entries yet — be the first! 🌭</p>
                  ) : (() => {
                    return standings.map((p, i) => {
                      const rank = i + 1;
                      const prevRank = prevRankByName[p.name.toLowerCase()];
                      const posChange = prevRank !== undefined ? prevRank - rank : 0;
                      return (
                        <div key={p.name}>
                          {i > 0 && <Divider />}
                          <div className="ds-standings-row">
                            <div className="ds-standings-rank-col">
                              {posChange > 0 && <span className="ds-rank-arrow up">▲</span>}
                              <span className="ds-rank-num">{rank}</span>
                              {posChange < 0 && <span className="ds-rank-arrow down">▼</span>}
                            </div>
                            <div className="ds-standings-left">
                              <Avatar name={p.name} src={avatarByName[p.name]} size="sm" />
                              <span className="ds-standings-name">{p.name}</span>
                            </div>
                            <span className="ds-standings-count">{p.count}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* ── Longest streak card ── */}
              {!loadingData && (
                <div className="ds-card ds-streak-card">
                  <div className="ds-streak-header">
                    <span className="ds-streak-icon">🔥</span>
                    <span className="ds-streak-title">Longest Streak</span>
                  </div>
                  <div className="ds-card-body" style={{ padding: "12px 20px 16px" }}>
                    {longestStreak.length > 0 ? (
                      longestStreak.map(p => (
                        <div key={p.name} className="ds-standings-row">
                          <div className="ds-standings-left">
                            <Avatar name={p.name} src={avatarByName[p.name]} size="sm" />
                            <span className="ds-standings-name">{p.name}</span>
                          </div>
                          <div className="ds-streak-right">
                            <span className="ds-standings-count">{p.streak} days</span>
                            {p.active && <span className="ds-streak-active">(active)</span>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="ds-empty" style={{ padding: "8px 0" }}>No one has logged a dog yet</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Battle card (current month) ── */}
              {!loadingData && showBattleCard && (
                <div className="ds-card ds-battle-card">
                  <div className="ds-battle-header">
                    <div className="ds-battle-title-row">
                      <span className="ds-battle-icon">⚔️</span>
                      <span className="ds-battle-title">The Battle for {currentMonthName}</span>
                    </div>
                    <span className="ds-battle-countdown">{countdown}</span>
                  </div>
                  <div className="ds-card-body" style={{ padding: "12px 20px 16px" }}>
                    {battleStandings.length === 0 ? (
                      <p className="ds-empty" style={{ padding: "8px 0" }}>No one has logged a dog yet</p>
                    ) : battleStandings.map((p, i) => (
                      <div key={p.name}>
                        {i > 0 && <Divider />}
                        <div className="ds-standings-row">
                          <div className="ds-standings-left">
                            <Avatar name={p.name} src={avatarByName[p.name]} size="sm" />
                            <span className="ds-standings-name">{p.name}</span>
                          </div>
                          <span className="ds-standings-count">{p.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Champion cards (past months, newest first) ── */}
              {!loadingData && pastChampions.map(c => (
                <div key={c.month} className="ds-card ds-champion-card">
                  <div className="ds-champion-header">
                    <span className="ds-champion-icon">🏆</span>
                    <span className="ds-champion-title">{monthStrToName(c.month)}'s Champion</span>
                  </div>
                  <div className="ds-card-body" style={{ padding: "12px 20px 16px" }}>
                    <div className="ds-standings-row">
                      <div className="ds-standings-left">
                        <Avatar name={c.winner_name} src={avatarByName[c.winner_name]} size="sm" />
                        <span className="ds-standings-name">{c.winner_name}</span>
                      </div>
                      <span className="ds-standings-count">{c.dog_count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ══ GALLERY TAB ══════════════════════════════════════════════════ */}
          {tab === "gallery" && (
            <>
              {loadingData ? (
                <p className="ds-empty">Loading…</p>
              ) : gallery.length === 0 ? (
                <p className="ds-empty">No GIFs yet — upload a video when logging! 🎬</p>
              ) : (
                <>
                  {/* Top spacer + sentinel — represent tiles scrolled above the window */}
                  {hasMoreAbove && (
                    <>
                      <div style={{ height: windowStart * EST_TILE_HEIGHT, flexShrink: 0 }} />
                      <div ref={topSentinelRef} style={{ height: 1, flexShrink: 0 }} />
                    </>
                  )}

                  {gallery.slice(windowStart, windowEnd).map(e => (
                    <div key={e.id} id={`tile-${e.id}`} style={{ flexShrink: 0 }}>
                      <GifTile
                        state={e.gif_url ? "default" : "loading"}
                        gifUrl={e.gif_url}
                        name={e.name}
                        avatarUrl={avatarByName[e.name] ?? undefined}
                        count={e.count}
                        date={formatDate(e.timestamp)}
                        notes={e.notes ?? undefined}
                        mood={e.mood ?? undefined}
                        progress={processingIds.has(e.id) ? 50 : undefined}
                        onResubmit={!e.gif_url ? () => handleResubmitGif(e) : undefined}
                        style={{ width: "100%" }}
                      />
                    </div>
                  ))}

                  {/* Bottom sentinel + spacer — represent tiles below the window */}
                  {hasMoreBelow && (
                    <>
                      <div ref={bottomSentinelRef} style={{ height: 1, flexShrink: 0 }} />
                      <div style={{ height: (gallery.length - windowEnd) * EST_TILE_HEIGHT, flexShrink: 0 }} />
                    </>
                  )}
                </>
              )}
            </>
          )}

        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 1000 }}>
          <Toast
            type={toast.type === "error" ? "error" : "success"}
            message={toast.msg}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {/* Hidden file input for the resubmit flow */}
      <input
        ref={resubmitInputRef}
        type="file"
        accept="video/mp4,video/quicktime"
        style={{ display: "none" }}
        onChange={handleResubmitFileSelected}
      />

    </div>
  );
}
