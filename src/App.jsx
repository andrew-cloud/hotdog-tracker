import { useState, useEffect, useRef } from "react";
import "./App.css";
import { Avatar, Button, Input, Stepper, Textarea, UploadField, GifTile, Toast, Divider, TabBar, Select } from "./design-system";

// ── Supabase client (unchanged) ───────────────────────────────────────────────

const SUPABASE_URL = "https://lrjydzmsqkfmenrtoklv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyanlkem1zcWtmbWVucnRva2x2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTE5NjcsImV4cCI6MjA5MDAyNzk2N30.CzW0n8xunV9gholcPDYq-V7yxdtH29ud9piUyhEwxoY";
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
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?select=name_key,display_name,avatar_url&order=display_name.asc`, { headers: this.headers });
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
  const ext  = file.name.split(".").pop() || "mp4";
  const path = `${id}.mp4`;

  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file, file.name);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.videoPath || path);
        } catch {
          resolve(path);
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status} — ${xhr.responseText}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error — is the Mac Mini server running?")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.open("POST", `${MAC_MINI_URL}/upload?id=${encodeURIComponent(id)}`);
    xhr.send(form);
  });
}


function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
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

const EMOJI_POOL = [
  "🌭","🍔","🍕","🌮","🥩","🍗","🥓","🧆","🌯","🍱",
  "🦁","🐯","🦊","🦝","🐺","🐸","🦈","🦅","🦉","🐉",
  "🦄","🐙","🦑","🦋","🐻","🦖","🐊","🦩","🐆","🦓",
];

function pickEmoji() {
  return EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)];
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
  const [videoFile, setVideoFile] = useState(null);
  const [videoFileSize, setVideoFileSize] = useState("");
  const [videoState, setVideoState] = useState("default");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [avatarByName, setAvatarByName] = useState({});
  const [loadingData, setLoadingData] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [toast, setToast] = useState(null);

  const pollRef     = useRef(null);
  const sentinelRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(8);

  useEffect(() => {
    (async () => {
      try {
        const [entryData, userData] = await Promise.all([sb.getEntries(), sb.getUsers()]);
        setEntries(entryData);
        setUsers(userData.map(u => u.display_name));
        setAvatarByName(Object.fromEntries(userData.map(u => [u.display_name, u.avatar_url ?? null])));
        const pending = new Set(entryData.filter(e => e.video_path && !e.gif_url).map(e => e.id));
        setProcessingIds(pending);
      } catch {
        showToast("Could not load data", "error");
      }
      setLoadingData(false);
    })();
  }, []);

  useEffect(() => {
    if (processingIds.size === 0) return;
    pollRef.current = setInterval(async () => {
      for (const id of processingIds) {
        try {
          const entry = await sb.getEntry(id);
          if (entry?.gif_url) {
            setEntries(prev => prev.map(e => e.id === id ? { ...e, gif_url: entry.gif_url } : e));
            setProcessingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
            showToast("🎉 GIF is ready in the gallery!");
          }
        } catch {}
      }
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [processingIds]);

  // ── Gallery pagination ────────────────────────────────────────────────────
  // Watch a sentinel div below the last visible tile; load 8 more when it
  // enters the viewport. Resets to 8 whenever the user leaves the gallery tab.
  useEffect(() => {
    if (tab !== "gallery") {
      setVisibleCount(8);
      return;
    }
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount(prev => prev + 8);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  // entries is used instead of gallery here because gallery is derived later in
  // the component and would cause a temporal dead zone crash in the dep array.
  // entries.length changing means gallery.length may have changed too.
  }, [tab, visibleCount, entries.length]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
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
        const emoji = pickEmoji();
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

      // ── Save entry ───────────────────────────────────────────────────────
      const entry = {
        id,
        name: authedName,
        count: Number(count),
        timestamp: Date.now(),
        gif_url: null,
        video_path: videoPath,
        notes: notes.trim() || null,
      };
      await sb.insertEntry(entry);

      // ── Trigger GIF conversion (Mac Mini server already triggered this,
      //    but trigger-gif is idempotent so calling it again is safe) ───────
      try {
        await sb.triggerGifConversion(id, videoPath);
      } catch (triggerErr) {
        console.warn("GIF trigger failed (non-fatal):", triggerErr.message);
      }

      setProcessingIds(prev => new Set([...prev, id]));
      setEntries(prev => [entry, ...prev]);

      // Navigate to gallery first, then show the toast there
      setCount(1);
      setNotes("");
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

  const standings = Object.values(
    entries.reduce((acc, e) => {
      const k = e.name.toLowerCase();
      if (!acc[k]) acc[k] = { name: e.name, count: 0 };
      acc[k].count += e.count;
      return acc;
    }, Object.fromEntries(users.map(u => [u.toLowerCase(), { name: u, count: 0 }])))
  ).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const gallery = entries.filter(e => e.video_path || e.gif_url);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="app">

      {/* ── Header ── */}
      <div className="app-header">
        <h1 className="app-title">Hotdog Slam</h1>
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
                      <Stepper value={count} min={1} max={99} onChange={setCount} />
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
                      <span className="ds-card-title">Notes (optional)</span>
                      <span className="ds-card-subtitle">
                        Optional, but everyone loves a good story.
                      </span>
                    </div>
                    <div className="ds-card-body">
                      <Textarea
                        value={notes}
                        placeholder={`"So there I was, just me and the 7/11 employee..."`}
                        onChange={e => setNotes(e.target.value)}
                        maxLength={120}
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
                  const leaderCount = standings[0].count;
                  return standings.map((p, i) => {
                    const delta = p.count - leaderCount;
                    const deltaLabel = delta === 0 ? "--" : String(delta);
                    return (
                      <div key={p.name}>
                        {i > 0 && <Divider />}
                        <div className="ds-standings-row">
                          <div className="ds-standings-left">
                            <Avatar name={p.name} src={avatarByName[p.name]} size="sm" />
                            <span className="ds-standings-name">{p.name}</span>
                          </div>
                          <div className="ds-standings-right">
                            <span className="ds-standings-count">{p.count}</span>
                            <span className="ds-standings-delta">{deltaLabel}</span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
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
                  {gallery.slice(0, visibleCount).map(e => (
                    <GifTile
                      key={e.id}
                      state={e.gif_url ? "default" : "loading"}
                      gifUrl={e.gif_url}
                      name={e.name}
                      avatarUrl={avatarByName[e.name] ?? undefined}
                      count={e.count}
                      date={formatDate(e.timestamp)}
                      notes={e.notes ?? undefined}
                      progress={processingIds.has(e.id) ? 50 : undefined}
                      style={{ width: "100%" }}
                    />
                  ))}
                  {/* Sentinel — observed to trigger loading the next batch */}
                  {visibleCount < gallery.length && (
                    <div ref={sentinelRef} style={{ height: 1, width: "100%", flexShrink: 0 }} />
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

    </div>
  );
}
