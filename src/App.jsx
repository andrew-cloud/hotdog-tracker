import { useState, useEffect, useRef } from "react";
import "./App.css";

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
    const ext = file.name.split(".").pop() || "mp4";
    const path = `${id}.${ext}`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/videos/${path}`, {
      method: "POST",
      headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": file.type || "video/mp4", "x-upsert": "true" },
      body: file,
    });
    if (!res.ok) throw new Error(await res.text());
    return path;
  },
  async triggerGifConversion(entryId, videoPath) {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
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
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?select=name_key,display_name&order=display_name.asc`, { headers: this.headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async getUser(displayName) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?display_name=eq.${encodeURIComponent(displayName)}&select=*`, { headers: this.headers });
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    return rows[0] || null;
  },
  async createUser(displayName, pin) {
    const nameKey = displayName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: "POST",
      headers: { ...this.headers, "Prefer": "return=representation" },
      body: JSON.stringify({ name_key: nameKey, display_name: displayName, pin }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const MEDALS = ["🥇", "🥈", "🥉"];
const NEW_USER_SENTINEL = "__new__";

// ── Stepper icons (inline SVG to avoid external asset dependency) ─────────
function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}
function MinusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function HotdogTracker() {
  const [tab, setTab] = useState("track");

  // Auth state: null = not logged in, string = logged-in display name
  const [authedName, setAuthedName] = useState(null);

  // Login form state
  const [selectedName, setSelectedName] = useState("");
  const [customName, setCustomName] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isNewUser, setIsNewUser] = useState(null);
  const [confirming, setConfirming] = useState(false);

  // Log form state
  const [count, setCount] = useState(1);
  const [videoFile, setVideoFile] = useState(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Data
  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [toast, setToast] = useState(null);

  const pinInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [entryData, userData] = await Promise.all([sb.getEntries(), sb.getUsers()]);
        setEntries(entryData);
        setUsers(userData.map(u => u.display_name));
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

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Login flow ────────────────────────────────────────────────────────
  const handleNameSelect = async (value) => {
    setSelectedName(value);
    setLoginPin(""); setLoginError(""); setIsNewUser(null); setCustomName("");
    if (!value || value === NEW_USER_SENTINEL) {
      setIsNewUser(value === NEW_USER_SENTINEL ? true : null);
      return;
    }
    const user = await sb.getUser(value);
    setIsNewUser(!user);
    setTimeout(() => pinInputRef.current?.focus(), 80);
  };

  const handleCustomNameChange = (e) => {
    const val = e.target.value;
    setCustomName(val);
    setLoginPin(""); setLoginError("");
    setIsNewUser(val.trim().length > 0 ? true : null);
    if (val.trim().length > 0) setTimeout(() => pinInputRef.current?.focus(), 80);
  };

  const activeName = selectedName === NEW_USER_SENTINEL
    ? customName.trim()
    : (selectedName || customName.trim());

  const showPinField = activeName.length > 0 && isNewUser !== null;

  const handleConfirm = async () => {
    if (!activeName) { setLoginError("Select or enter your name first"); return; }
    if (!loginPin || loginPin.length < 4) { setLoginError("Enter your 4-digit PIN"); pinInputRef.current?.focus(); return; }
    setConfirming(true); setLoginError("");
    try {
      const existingUser = await sb.getUser(activeName);
      if (existingUser) {
        if (existingUser.pin !== loginPin) {
          setLoginError("Wrong PIN — try again");
          setLoginPin("");
          setConfirming(false);
          setTimeout(() => pinInputRef.current?.focus(), 50);
          return;
        }
      } else {
        await sb.createUser(activeName, loginPin);
        setUsers(prev => [...prev, activeName].sort());
      }
      setAuthedName(activeName);
      setSelectedName(""); setCustomName(""); setLoginPin(""); setIsNewUser(null);
    } catch (e) {
      setLoginError("Something went wrong");
    }
    setConfirming(false);
  };

  // ── Log it flow ───────────────────────────────────────────────────────
  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVideoFile(file);
    setVideoSrc(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!videoFile) { showToast("Video proof is required! 📹", "error"); return; }
    setSubmitting(true); setUploadProgress(0);
    try {
      const id = generateId();
      showToast("Uploading video...");
      setUploadProgress(30);
      const video_path = await sb.uploadVideo(id, videoFile);
      setUploadProgress(70);
      const entry = { id, name: authedName, count: Number(count), timestamp: Date.now(), gif_url: null, video_path };
      await sb.insertEntry(entry);
      setUploadProgress(90);
      await sb.triggerGifConversion(id, video_path);
      setProcessingIds(prev => new Set([...prev, id]));
      setEntries(prev => [entry, ...prev]);
      setUploadProgress(100);
      showToast("Logged! 🌭 GIF converting in the background...");
      setCount(1); setVideoFile(null); setVideoSrc(null);
      setTab("leaderboard");
    } catch (e) {
      showToast("Failed to save: " + e.message, "error");
    }
    setSubmitting(false); setUploadProgress(0);
  };

  const leaderboard = Object.values(
    entries.reduce((acc, e) => {
      const k = e.name.toLowerCase();
      if (!acc[k]) acc[k] = { name: e.name, count: 0 };
      acc[k].count += e.count;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count);

  const gallery = entries.filter(e => e.video_path || e.gif_url);

  return (
    <div className="app">

      {/* ── Header ── */}
      <div className="app-header">
        <h1 className="app-title">Hotdog Slam</h1>
        <div className="tab-bar">
          {[
            { id: "track", label: "Log a dog" },
            { id: "leaderboard", label: "Leaderboard" },
            { id: "gallery", label: "Gallery" },
          ].map(t => (
            <div
              key={t.id}
              className={`tab-item${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === "gallery" && processingIds.size > 0 && (
                <span className="tab-badge">{processingIds.size}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="app-body">

        {/* ══ TRACK ══ */}
        {tab === "track" && (
          <>
            {/* Step 1: Not logged in → show login card */}
            {!authedName && (
              <div className="card">
                {/* Name dropdown */}
                <div className="field-group">
                  <label className="label">Name</label>
                  <select
                    className="name-select"
                    value={selectedName}
                    onChange={e => handleNameSelect(e.target.value)}
                  >
                    <option value="" disabled>Select your name...</option>
                    {users.map(u => <option key={u} value={u}>{u}</option>)}
                    <option value={NEW_USER_SENTINEL}>➕ New player...</option>
                  </select>
                </div>

                {/* New player name input */}
                {selectedName === NEW_USER_SENTINEL && (
                  <div className="field-group">
                    <input
                      className="text-input"
                      type="text"
                      placeholder="Enter your name"
                      value={customName}
                      onChange={handleCustomNameChange}
                      autoFocus
                    />
                  </div>
                )}

                {/* PIN input */}
                {showPinField && (
                  <div className="field-group">
                    <label className="label">Enter PIN</label>
                    <input
                      ref={pinInputRef}
                      className={`pin-input${loginError ? " has-error" : ""}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="one-time-code"
                      value={loginPin}
                      onChange={e => { setLoginPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setLoginError(""); }}
                      maxLength={4}
                      placeholder="····"
                    />
                    {loginError && <div className="pin-error">{loginError}</div>}
                  </div>
                )}

                <button
                  className={`btn btn-outline${confirming ? " loading" : ""}`}
                  onClick={handleConfirm}
                  disabled={confirming}
                >
                  {confirming ? "Confirming..." : "Confirm"}
                </button>
              </div>
            )}

            {/* Step 2: Logged in → show full log form */}
            {authedName && (
              <>
                <p className="welcome-heading">Welcome back, {authedName}!</p>

                {/* Count stepper */}
                <div className="card">
                  <span className="label">Hot dogs consumed</span>
                  <div className="stepper-row">
                    <button className="stepper-btn" onClick={() => setCount(c => Math.max(1, c - 1))}>
                      <MinusIcon />
                    </button>
                    <span className="stepper-count">{count}</span>
                    <button className="stepper-btn" onClick={() => setCount(c => c + 1)}>
                      <PlusIcon />
                    </button>
                  </div>
                </div>

                {/* Video upload */}
                <div className="card">
                  <span className="label">Video proof (required)</span>
                  <p className="video-description">
                    Videos will be auto-converted to sped up gifs and added to the gallery wall.
                  </p>
                  {!videoSrc ? (
                    <label className="upload-zone">
                      <input ref={fileInputRef} type="file" accept="video/*" onChange={handleVideoChange} />
                      <span className="upload-icon">📹</span>
                      <span className="upload-hint">Tap to upload video</span>
                    </label>
                  ) : (
                    <div className="video-actions">
                      <video src={videoSrc} className="video-preview" muted playsInline controls />
                      <button className="btn btn-ghost" onClick={() => { setVideoFile(null); setVideoSrc(null); }}>
                        🗑 Remove video
                      </button>
                    </div>
                  )}
                  {submitting && uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="upload-progress">
                      <div className="upload-progress-meta">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className={`btn btn-primary btn-log${submitting ? " loading" : ""}`}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Logging..." : "Log it!"}
                </button>
              </>
            )}
          </>
        )}

        {/* ══ LEADERBOARD ══ */}
        {tab === "leaderboard" && (
          <>
            <h3 className="section-title">🏆 All-Time Standings</h3>
            {loadingData ? (
              <div className="loader-center"><div className="ui active inline loader" /></div>
            ) : leaderboard.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🌭</div>
                <div className="empty-title">No hotdogs logged yet!</div>
                <div className="empty-sub">Head to Log a dog and be the first</div>
              </div>
            ) : leaderboard.map((p, i) => (
              <div key={p.name} className={`leaderboard-row${i === 0 ? " gold" : ""}`}>
                <span className={`leaderboard-rank${i < 3 ? " medal" : ""}`}>
                  {i < 3 ? MEDALS[i] : `#${i + 1}`}
                </span>
                <div className="leaderboard-name">{p.name}</div>
                <div className="leaderboard-count-pill">{p.count} 🌭</div>
              </div>
            ))}
          </>
        )}

        {/* ══ GALLERY ══ */}
        {tab === "gallery" && (
          <>
            <h3 className="section-title">🎞 GIF Gallery</h3>
            {loadingData ? (
              <div className="loader-center"><div className="ui active inline loader" /></div>
            ) : gallery.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎬</div>
                <div className="empty-title">No GIFs here yet!</div>
                <div className="empty-sub">Upload a video when logging hotdogs</div>
              </div>
            ) : (
              <div className="gallery-grid">
                {gallery.map(e => {
                  const isProcessing = processingIds.has(e.id) || (!e.gif_url && e.video_path);
                  return (
                    <div key={e.id} className="gallery-item">
                      {e.gif_url ? (
                        <img src={e.gif_url} alt={e.name} className="gallery-gif" />
                      ) : (
                        <div className="gallery-processing">
                          <div className="ui active inline inverted loader" />
                          <div className="gallery-processing-label">Converting...</div>
                        </div>
                      )}
                      <div className="gallery-caption">
                        {e.name} · {e.count} 🌭
                        {isProcessing && !e.gif_url && " ⏳"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`ui message toast${toast.type === "error" ? " red" : " green"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
