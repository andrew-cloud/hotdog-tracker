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
    const nameKey = displayName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
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

export default function HotdogTracker() {
  const [tab, setTab] = useState("track");
  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedName, setSelectedName] = useState("");
  const [customName, setCustomName] = useState("");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isNewUser, setIsNewUser] = useState(null);
  const [count, setCount] = useState(1);
  const [videoFile, setVideoFile] = useState(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState(null);
  const [processingIds, setProcessingIds] = useState(new Set());
  const pinInputRef = useRef(null);
  const pollRef = useRef(null);
  const fileInputRef = useRef(null);

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

  const handleNameSelect = async (value) => {
    setSelectedName(value);
    setPin(""); setPinError(""); setIsNewUser(null); setCustomName("");
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
    setPin(""); setPinError("");
    setIsNewUser(val.trim().length > 0 ? true : null);
    if (val.trim().length > 0) setTimeout(() => pinInputRef.current?.focus(), 80);
  };

  const handlePinChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPin(val);
    if (val.length > 0) setPinError("");
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVideoFile(file);
    setVideoSrc(URL.createObjectURL(file));
  };

  const activeName = selectedName === NEW_USER_SENTINEL
    ? customName.trim()
    : (selectedName || customName.trim());
  const showPinField = activeName.length > 0 && isNewUser !== null;

  const handleSubmit = async () => {
    if (!activeName) { showToast("Select or enter your name first!", "error"); return; }
    if (!pin || pin.length < 4) { setPinError("Enter your 4-digit PIN"); pinInputRef.current?.focus(); return; }
    setSubmitting(true); setPinError("");
    try {
      const existingUser = await sb.getUser(activeName);
      if (existingUser) {
        if (existingUser.pin !== pin) {
          setPinError("Wrong PIN — try again");
          setPin("");
          setSubmitting(false);
          setTimeout(() => pinInputRef.current?.focus(), 50);
          return;
        }
      } else {
        await sb.createUser(activeName, pin);
        setUsers(prev => [...prev, activeName].sort());
      }
      const id = generateId();
      let video_path = null;
      if (videoFile) {
        showToast("Uploading video...");
        setUploadProgress(30);
        video_path = await sb.uploadVideo(id, videoFile);
        setUploadProgress(70);
      }
      const entry = { id, name: activeName, count: Number(count), timestamp: Date.now(), gif_url: null, video_path };
      await sb.insertEntry(entry);
      setUploadProgress(90);
      if (video_path) {
        await sb.triggerGifConversion(id, video_path);
        setProcessingIds(prev => new Set([...prev, id]));
        showToast("Logged! 🌭 GIF converting in the background...");
      } else {
        showToast(`+${count} hotdog${count !== 1 ? "s" : ""} logged for ${activeName}! 🌭`);
      }
      setEntries(prev => [entry, ...prev]);
      setUploadProgress(100);
      setSelectedName(""); setCustomName(""); setPin(""); setIsNewUser(null);
      setCount(1); setVideoFile(null); setVideoSrc(null);
      setTab("leaderboard");
    } catch (e) {
      showToast("Failed to save: " + e.message, "error");
    }
    setSubmitting(false);
    setUploadProgress(0);
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
        <h1 className="app-title">🌭 Hotdog Tracker</h1>
        <p className="app-subtitle">Who reigns supreme?</p>
        <div className="tab-bar">
          {[
            { id: "track", label: "🌭 Track" },
            { id: "leaderboard", label: "🏆 Leaderboard" },
            { id: "gallery", label: "🎞 Gallery" },
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
          <div className="ui form">

            {/* Name + PIN */}
            <div className="ui segment">
              <div className="field">
                <label>Your Name</label>
                <select
                  className={`name-select${!selectedName ? " placeholder" : ""}`}
                  value={selectedName}
                  onChange={e => handleNameSelect(e.target.value)}
                >
                  <option value="" disabled>Select your name...</option>
                  {users.map(u => <option key={u} value={u}>{u}</option>)}
                  <option value={NEW_USER_SENTINEL}>➕ New player...</option>
                </select>
              </div>

              {selectedName === NEW_USER_SENTINEL && (
                <div className="field">
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={customName}
                    onChange={handleCustomNameChange}
                    autoFocus
                  />
                </div>
              )}

              {showPinField && (
                <div className="field pin-field">
                  <label>
                    {isNewUser ? "Create a 4-digit PIN" : "Enter your PIN"}
                    {isNewUser && <span className="pin-label-hint">(first time? set your PIN here)</span>}
                  </label>
                  <div className="pin-dots">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className={`pin-dot${i < pin.length ? " filled" : ""}`} />
                    ))}
                  </div>
                  <input
                    ref={pinInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    value={pin}
                    onChange={handlePinChange}
                    maxLength={4}
                    placeholder="····"
                    className={`pin-input${pinError ? " error" : ""}`}
                  />
                  {pinError && <div className="pin-error">{pinError}</div>}
                </div>
              )}
            </div>

            {/* Count */}
            <div className="ui segment">
              <span className="count-label">Hotdogs Consumed 🌭</span>
              <div className="count-row">
                <button className="ui circular red icon button" onClick={() => setCount(c => Math.max(1, c - 1))}>
                  <i className="minus icon" />
                </button>
                <span className="count-number">{count}</span>
                <button className="ui circular red icon button" onClick={() => setCount(c => c + 1)}>
                  <i className="plus icon" />
                </button>
              </div>
            </div>

            {/* Video */}
            <div className="ui segment">
              <span className="video-label">🎬 Eating Video</span>
              {!videoSrc ? (
                <label className="upload-zone">
                  <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
                  <i className="huge film icon upload-icon" />
                  <div className="upload-hint">Tap to upload video</div>
                  <div className="ui label upload-sub">Converted to GIF automatically in the background</div>
                </label>
              ) : (
                <>
                  <video src={videoSrc} className="video-preview" muted playsInline controls />
                  <div className="ui green label video-ready-label">✅ Video ready to upload</div>
                  <button className="ui fluid basic button remove-video-btn" onClick={() => { setVideoFile(null); setVideoSrc(null); }}>
                    🗑 Remove video
                  </button>
                </>
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
              className={`ui fluid large red button log-btn${submitting ? " loading" : ""}`}
              onClick={handleSubmit}
              disabled={submitting}
            >
              🌭 Log It!
            </button>
          </div>
        )}

        {/* ══ LEADERBOARD ══ */}
        {tab === "leaderboard" && (
          <>
            <h3 className="ui header section-title">🏆 All-Time Standings</h3>
            {loadingData ? (
              <div className="loader-center"><div className="ui active inline loader" /></div>
            ) : leaderboard.length === 0 ? (
              <div className="ui placeholder segment empty-state">
                <div className="empty-icon">🌭</div>
                <div className="empty-title">No hotdogs logged yet!</div>
                <div className="empty-sub">Head to Track and be the first</div>
              </div>
            ) : leaderboard.map((p, i) => (
              <div key={p.name} className={`leaderboard-row${i === 0 ? " gold" : ""}`}>
                <span className={`leaderboard-rank${i < 3 ? " medal" : ""}`}>
                  {i < 3 ? MEDALS[i] : `#${i + 1}`}
                </span>
                <div className="leaderboard-name">{p.name}</div>
                <div className="ui red label leaderboard-count">{p.count} 🌭</div>
              </div>
            ))}
          </>
        )}

        {/* ══ GALLERY ══ */}
        {tab === "gallery" && (
          <>
            <h3 className="ui header section-title">🎞 GIF Gallery</h3>
            {loadingData ? (
              <div className="loader-center"><div className="ui active inline loader" /></div>
            ) : gallery.length === 0 ? (
              <div className="ui placeholder segment empty-state">
                <div className="empty-icon">🎬</div>
                <div className="empty-title">No GIFs here yet!</div>
                <div className="empty-sub">Upload a video when logging hotdogs</div>
              </div>
            ) : (
              <div className="ui two column grid gallery-grid">
                {gallery.map(e => {
                  const isProcessing = processingIds.has(e.id) || (!e.gif_url && e.video_path);
                  return (
                    <div key={e.id} className="column gallery-col">
                      <div className="ui card gallery-card">
                        <div className="image gallery-image">
                          {e.gif_url
                            ? <img src={e.gif_url} alt={e.name} className="gallery-gif" />
                            : <div className="gallery-processing">
                                <div className="ui active inline inverted loader" />
                                <div className="gallery-processing-label">Converting...</div>
                              </div>}
                        </div>
                        <div className="content gallery-content">
                          <div className="header gallery-name">{e.name}</div>
                          <div className="meta gallery-meta">
                            <span className="ui mini red label">{e.count} 🌭</span>
                            {isProcessing && <span className="ui mini yellow label">⏳ Processing</span>}
                          </div>
                        </div>
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
