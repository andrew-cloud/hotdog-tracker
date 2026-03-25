import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://lrjydzmsqkfmenrtoklv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyanlkem1zcWtmbWVucnRva2x2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTE5NjcsImV4cCI6MjA5MDAyNzk2N30.CzW0n8xunV9gholcPDYq-V7yxdtH29ud9piUyhEwxoY";
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/trigger-gif`;
const SESSION_KEY = "hd_session";
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

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
  async getUser(name) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?name=eq.${encodeURIComponent(name)}&select=*`, { headers: this.headers });
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    return rows[0] || null;
  },
  async createUser(name, pin) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: "POST",
      headers: { ...this.headers, "Prefer": "return=representation" },
      body: JSON.stringify({ name, pin }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (Date.now() - session.ts > SESSION_TTL) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch { return null; }
}

function saveSession(name) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ name, ts: Date.now() }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

const MEDALS = ["🥇", "🥈", "🥉"];

// ── PIN Bottom Sheet ──────────────────────────────────────────────────────
function PinSheet({ name, onSuccess, onCancel }) {
  const [pin, setPin] = useState("");
  const [isNew, setIsNew] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      const user = await sb.getUser(name);
      setIsNew(!user);
      // Auto-focus the hidden input to bring up native keyboard
      setTimeout(() => inputRef.current?.focus(), 100);
    })();
  }, [name]);

  const handleChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPin(val);
    setError("");
    if (val.length === 4) handleSubmit(val);
  };

  const handleSubmit = async (finalPin) => {
    setLoading(true);
    setError("");
    try {
      if (isNew) {
        await sb.createUser(name, finalPin);
        saveSession(name);
        onSuccess(name);
      } else {
        const user = await sb.getUser(name);
        if (user.pin !== finalPin) {
          setError("Wrong PIN — try again");
          setPin("");
          setLoading(false);
          setTimeout(() => inputRef.current?.focus(), 50);
          return;
        }
        saveSession(name);
        onSuccess(name);
      }
    } catch (e) {
      setError("Something went wrong");
      setPin("");
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000 }} />

      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 520,
        background: "#fff", borderRadius: "20px 20px 0 0",
        padding: "24px 24px 48px",
        zIndex: 1001,
        boxShadow: "0 -4px 32px rgba(0,0,0,0.15)",
        animation: "slideUp 0.25s ease",
      }}>
        <style>{`@keyframes slideUp { from { transform: translateX(-50%) translateY(100%); } to { transform: translateX(-50%) translateY(0); } }`}</style>

        {/* Handle */}
        <div style={{ width: 40, height: 4, background: "#ddd", borderRadius: 99, margin: "0 auto 20px" }} />

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: "'Boogaloo', cursive", fontSize: 26, color: "#cc2200" }}>
            {isNew === null ? "Checking..." : isNew ? "Create your PIN" : "Welcome back!"}
          </div>
          <div style={{ fontSize: 14, color: "#888", marginTop: 4 }}>
            {isNew === null ? "" : isNew
              ? `Set a 4-digit PIN for ${name}`
              : `Enter your PIN for ${name}`}
          </div>
        </div>

        {/* Hidden native numeric input */}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={pin}
          onChange={handleChange}
          maxLength={4}
          autoComplete="one-time-code"
          style={{
            position: "absolute",
            opacity: 0,
            width: 1,
            height: 1,
            pointerEvents: "none",
          }}
        />

        {/* PIN dots — tap anywhere to refocus keyboard */}
        <div
          onClick={() => inputRef.current?.focus()}
          style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 8, cursor: "text", padding: "8px 0" }}
        >
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              width: 18, height: 18, borderRadius: "50%",
              background: i < pin.length ? "#cc2200" : "#eee",
              transition: "background 0.15s, transform 0.1s",
              transform: i < pin.length ? "scale(1.1)" : "scale(1)",
            }} />
          ))}
        </div>

        {/* Hint */}
        <div style={{ textAlign: "center", fontSize: 12, color: "#bbb", marginBottom: 4 }}>
          {!error && !loading && isNew !== null && "Tap the dots to open keyboard"}
        </div>

        {/* Error */}
        <div style={{ textAlign: "center", color: "#cc2200", fontSize: 13, fontWeight: 700, height: 20, marginBottom: 20 }}>
          {error}
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div className="ui active inline loader" />
          </div>
        )}

        <button
          className="ui fluid basic button"
          style={{ color: "#aaa", fontSize: 13 }}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────
export default function HotdogTracker() {
  const [tab, setTab] = useState("track");
  const [entries, setEntries] = useState([]);
  const [name, setName] = useState("");
  const [count, setCount] = useState(1);
  const [videoFile, setVideoFile] = useState(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState(null);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [showPinSheet, setShowPinSheet] = useState(false);
  const [session, setSession] = useState(getSession);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!document.querySelector("#sui-css")) {
      const link = document.createElement("link");
      link.id = "sui-css"; link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.5.0/semantic.min.css";
      document.head.appendChild(link);
    }
    if (!document.querySelector("#hd-fonts")) {
      const link = document.createElement("link");
      link.id = "hd-fonts"; link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Boogaloo&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await sb.getEntries();
        setEntries(data);
        const pending = new Set(data.filter(e => e.video_path && !e.gif_url).map(e => e.id));
        setProcessingIds(pending);
      } catch (e) {
        showToast("Could not load entries", "error");
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

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVideoFile(file);
    setVideoSrc(URL.createObjectURL(file));
  };

  // Called when user taps "Log It!" — validate name then show PIN sheet
  const handleLogIt = () => {
    if (!name.trim()) { showToast("Enter your name first! 👋", "error"); return; }
    setShowPinSheet(true);
  };

  // Called after PIN is verified successfully
  const handlePinSuccess = async (verifiedName) => {
    setShowPinSheet(false);
    setSession(getSession());
    setSubmitting(true);
    setUploadProgress(0);

    try {
      const id = generateId();
      let video_path = null;

      if (videoFile) {
        showToast("Uploading video...", "success");
        setUploadProgress(30);
        video_path = await sb.uploadVideo(id, videoFile);
        setUploadProgress(70);
      }

      const entry = { id, name: verifiedName, count: Number(count), timestamp: Date.now(), gif_url: null, video_path };
      await sb.insertEntry(entry);
      setUploadProgress(90);

      if (video_path) {
        await sb.triggerGifConversion(id, video_path);
        setProcessingIds(prev => new Set([...prev, id]));
        showToast("Logged! 🌭 GIF converting in the background...");
      } else {
        showToast(`+${count} hotdog${count !== 1 ? "s" : ""} logged for ${verifiedName}! 🌭`);
      }

      setEntries(prev => [entry, ...prev]);
      setUploadProgress(100);
      setName(""); setCount(1); setVideoFile(null); setVideoSrc(null);
      setTab("leaderboard");
    } catch (e) {
      showToast("Failed to save: " + e.message, "error");
    }

    setSubmitting(false);
    setUploadProgress(0);
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    showToast("Logged out!");
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
    <div style={{ background: "#f4f4f4", minHeight: "100vh", maxWidth: 520, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ background: "#cc2200", padding: "22px 20px 0", textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Boogaloo', cursive", fontSize: 40, color: "#f5b800", margin: 0, lineHeight: 1.1, textShadow: "3px 3px 0 rgba(0,0,0,0.2)" }}>
          🌭 Hotdog Tracker
        </h1>
        {session ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, margin: "5px 0 0" }}>
            <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: 700 }}>
              👋 {session.name}
            </span>
            <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 99, padding: "2px 10px", cursor: "pointer" }}>
              Log out
            </button>
          </div>
        ) : (
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 700, letterSpacing: 1, margin: "5px 0 0", textTransform: "uppercase" }}>
            Who reigns supreme?
          </p>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", marginTop: 14 }}>
          {[{ id: "track", label: "🌭 Track" }, { id: "leaderboard", label: "🏆 Leaderboard" }, { id: "gallery", label: "🎞 Gallery" }].map(t => (
            <div key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "10px 4px", textAlign: "center", cursor: "pointer",
              fontWeight: 700, fontSize: 13,
              color: tab === t.id ? "#cc2200" : "rgba(255,255,255,0.85)",
              background: tab === t.id ? "#fff" : "transparent",
              borderRadius: tab === t.id ? "6px 6px 0 0" : 0,
              userSelect: "none",
            }}>
              {t.label}
              {t.id === "gallery" && processingIds.size > 0 && (
                <span style={{ marginLeft: 4, background: "#f5b800", color: "#cc2200", borderRadius: 99, fontSize: 10, fontWeight: 900, padding: "1px 6px" }}>
                  {processingIds.size}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", padding: "20px 16px", minHeight: 400 }}>

        {/* ── TRACK ── */}
        {tab === "track" && (
          <div className="ui form">
            <div className="ui segment">
              <div className="field">
                <label>Your Name</label>
                <input
                  type="text"
                  placeholder="Who's eating? 🧑"
                  value={session ? session.name : name}
                  onChange={e => !session && setName(e.target.value)}
                  readOnly={!!session}
                  style={session ? { background: "#f9f9f9", color: "#aaa" } : {}}
                />
                {session && (
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
                    Logged in — PIN will be requested on submit
                  </div>
                )}
              </div>
            </div>

            <div className="ui segment">
              <label style={{ fontSize: 13, fontWeight: 700, color: "rgba(0,0,0,0.6)", display: "block", marginBottom: 10 }}>
                Hotdogs Consumed 🌭
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 8 }}>
                <button className="ui circular red icon button" onClick={() => setCount(c => Math.max(1, c - 1))}>
                  <i className="minus icon" />
                </button>
                <span style={{ fontFamily: "'Boogaloo', cursive", fontSize: 56, color: "#cc2200", flex: 1, textAlign: "center", lineHeight: 1 }}>
                  {count}
                </span>
                <button className="ui circular red icon button" onClick={() => setCount(c => c + 1)}>
                  <i className="plus icon" />
                </button>
              </div>
            </div>

            <div className="ui segment">
              <label style={{ fontSize: 13, fontWeight: 700, color: "rgba(0,0,0,0.6)", display: "block", marginBottom: 10 }}>
                🎬 Eating Video
              </label>
              {!videoSrc ? (
                <label style={{ display: "block", border: "2px dashed #ddd", borderRadius: 8, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: "#fafafa" }}>
                  <input ref={fileInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={handleVideoChange} />
                  <i className="huge film icon" style={{ color: "#ccc", fontSize: 40 }} />
                  <div style={{ fontWeight: 700, marginTop: 10, fontSize: 15 }}>Tap to upload video</div>
                  <div className="ui label" style={{ marginTop: 8, fontSize: 11, background: "#f0f0f0", color: "#999" }}>
                    Converted to GIF automatically in the background
                  </div>
                </label>
              ) : (
                <>
                  <video src={videoSrc} style={{ width: "100%", maxHeight: 200, borderRadius: 6, background: "#111", display: "block" }} muted playsInline controls />
                  <div className="ui green label" style={{ marginTop: 10 }}>✅ Video ready to upload</div>
                  <button className="ui fluid basic button" style={{ marginTop: 8 }} onClick={() => { setVideoFile(null); setVideoSrc(null); }}>
                    🗑 Remove video
                  </button>
                </>
              )}

              {submitting && uploadProgress > 0 && uploadProgress < 100 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "#aaa", marginBottom: 5 }}>
                    <span>Uploading...</span><span>{uploadProgress}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 99, background: "#eee", overflow: "hidden" }}>
                    <div style={{ width: `${uploadProgress}%`, height: "100%", background: "#cc2200", transition: "width 0.3s", borderRadius: 99 }} />
                  </div>
                </div>
              )}
            </div>

            <button
              className={`ui fluid large red button${submitting ? " loading" : ""}`}
              style={{ fontFamily: "'Boogaloo', cursive", fontSize: 22, letterSpacing: 0.5, marginTop: 4 }}
              onClick={handleLogIt}
              disabled={submitting}
            >
              🌭 Log It!
            </button>
          </div>
        )}

        {/* ── LEADERBOARD ── */}
        {tab === "leaderboard" && (
          <>
            <h3 className="ui header" style={{ fontFamily: "'Boogaloo', cursive", fontSize: 24, marginBottom: 16 }}>🏆 All-Time Standings</h3>
            {loadingData ? (
              <div style={{ textAlign: "center", padding: 40 }}><div className="ui active inline loader" /></div>
            ) : leaderboard.length === 0 ? (
              <div className="ui placeholder segment" style={{ textAlign: "center" }}>
                <div className="ui icon header" style={{ color: "#aaa" }}>
                  <div style={{ fontSize: 48 }}>🌭</div>
                  No hotdogs logged yet!
                  <div className="sub header">Head to Track and be the first</div>
                </div>
              </div>
            ) : leaderboard.map((p, i) => (
              <div key={p.name} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "13px 12px", borderRadius: 8, marginBottom: 8,
                background: i === 0 ? "#fffbef" : "#fafafa",
                border: i === 0 ? "1.5px solid #f5b800" : "1.5px solid #eee",
              }}>
                <span style={{ fontFamily: "'Boogaloo', cursive", fontSize: i < 3 ? 28 : 14, width: 36, textAlign: "center", flexShrink: 0 }}>
                  {i < 3 ? MEDALS[i] : `#${i + 1}`}
                </span>
                <div style={{ flex: 1, fontWeight: 900, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                <div className="ui red label" style={{ fontFamily: "'Boogaloo', cursive", fontSize: 15, flexShrink: 0 }}>{p.count} 🌭</div>
              </div>
            ))}
          </>
        )}

        {/* ── GALLERY ── */}
        {tab === "gallery" && (
          <>
            <h3 className="ui header" style={{ fontFamily: "'Boogaloo', cursive", fontSize: 24, marginBottom: 16 }}>🎞 GIF Gallery</h3>
            {loadingData ? (
              <div style={{ textAlign: "center", padding: 40 }}><div className="ui active inline loader" /></div>
            ) : gallery.length === 0 ? (
              <div className="ui placeholder segment" style={{ textAlign: "center" }}>
                <div className="ui icon header" style={{ color: "#aaa" }}>
                  <div style={{ fontSize: 48 }}>🎬</div>
                  No GIFs here yet!
                  <div className="sub header">Upload a video when logging hotdogs</div>
                </div>
              </div>
            ) : (
              <div className="ui two column grid" style={{ margin: 0 }}>
                {gallery.map(e => {
                  const isProcessing = processingIds.has(e.id) || (!e.gif_url && e.video_path);
                  return (
                    <div key={e.id} className="column" style={{ padding: 5 }}>
                      <div className="ui card" style={{ width: "100%", margin: 0, borderRadius: 10, overflow: "hidden" }}>
                        <div className="image" style={{ background: "#111", aspectRatio: "4/3", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {e.gif_url
                            ? <img src={e.gif_url} alt={e.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                            : <div style={{ textAlign: "center" }}>
                                <div className="ui active inline inverted loader" style={{ marginBottom: 8 }} />
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#888" }}>Converting...</div>
                              </div>}
                        </div>
                        <div className="content" style={{ padding: "8px 10px" }}>
                          <div className="header" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</div>
                          <div className="meta" style={{ marginTop: 4, display: "flex", gap: 6, alignItems: "center" }}>
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

      {/* PIN Sheet */}
      {showPinSheet && (
        <PinSheet
          name={session ? session.name : name}
          onSuccess={handlePinSuccess}
          onCancel={() => setShowPinSheet(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`ui ${toast.type === "error" ? "red" : "green"} message`} style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, whiteSpace: "nowrap", borderRadius: 99,
          padding: "10px 22px", boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          fontSize: 14, fontWeight: 700,
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
