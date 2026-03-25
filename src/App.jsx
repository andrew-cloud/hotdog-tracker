import { useState, useEffect, useRef } from "react";

// ── Supabase config ───────────────────────────────────────────────────────
const SUPABASE_URL = "https://lrjydzmsqkfmenrtoklv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyanlkem1zcWtmbWVucnRva2x2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTE5NjcsImV4cCI6MjA5MDAyNzk2N30.CzW0n8xunV9gholcPDYq-V7yxdtH29ud9piUyhEwxoY";

const sb = {
  headers: {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  },

  async getEntries() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/entries?select=*&order=timestamp.desc`, {
      headers: this.headers,
    });
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

  async uploadGif(id, blob) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/gifs/${id}.gif`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "image/gif",
        "x-upsert": "true",
      },
      body: blob,
    });
    if (!res.ok) throw new Error(await res.text());
    return `${SUPABASE_URL}/storage/v1/object/public/gifs/${id}.gif`;
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function HotdogTracker() {
  const [tab, setTab] = useState("track");
  const [entries, setEntries] = useState([]);
  const [name, setName] = useState("");
  const [count, setCount] = useState(1);
  const [videoSrc, setVideoSrc] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [gifBlob, setGifBlob] = useState(null);
  const [gifPreview, setGifPreview] = useState(null);
  const [gifLoaded, setGifLoaded] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load Semantic UI + fonts + gif.js
  useEffect(() => {
    if (!document.querySelector("#sui-css")) {
      const link = document.createElement("link");
      link.id = "sui-css";
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.5.0/semantic.min.css";
      document.head.appendChild(link);
    }
    if (!document.querySelector("#hd-fonts")) {
      const link = document.createElement("link");
      link.id = "hd-fonts";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Boogaloo&display=swap";
      document.head.appendChild(link);
    }
    if (window.GIF) { setGifLoaded(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js";
    script.onload = () => setGifLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Load entries from Supabase
  useEffect(() => {
    (async () => {
      try {
        const data = await sb.getEntries();
        setEntries(data);
      } catch (e) {
        showToast("Could not load entries: " + e.message, "error");
      }
      setLoadingData(false);
    })();
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVideoSrc(URL.createObjectURL(file));
    setGifBlob(null);
    setGifPreview(null);
    setProgress(0);
  };

  const seekVideo = (video, time) => new Promise((resolve) => {
    const h = () => { video.removeEventListener("seeked", h); resolve(); };
    video.addEventListener("seeked", h);
    video.currentTime = time;
  });

  const convertToGif = async () => {
    if (!videoRef.current || !gifLoaded) return;
    setProcessing(true);
    setProgress(2);
    setProgressLabel("Loading video...");
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    try {
      await new Promise((res, rej) => {
        if (video.readyState >= 2) return res();
        video.onloadeddata = res;
        video.onerror = rej;
        setTimeout(res, 6000);
      });
      const duration = Math.min(video.duration || 4, 5);
      const frameCount = 12;
      const delayMs = Math.max(Math.round((duration / frameCount) * 1000), 80);
      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;
      const scale = Math.min(280 / vw, 210 / vh, 1);
      canvas.width = Math.round(vw * scale);
      canvas.height = Math.round(vh * scale);
      setProgress(8); setProgressLabel("Fetching encoder...");
      const resp = await fetch("https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js");
      const workerBlob = await resp.blob();
      const workerURL = URL.createObjectURL(workerBlob);
      const gif = new window.GIF({ workers: 2, quality: 12, width: canvas.width, height: canvas.height, workerScript: workerURL });
      for (let i = 0; i < frameCount; i++) {
        const time = i === 0 ? 0 : (duration / (frameCount - 1)) * i;
        await seekVideo(video, time);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        gif.addFrame(canvas, { copy: true, delay: delayMs });
        setProgress(10 + Math.round(((i + 1) / frameCount) * 65));
        setProgressLabel(`Capturing frames (${i + 1}/${frameCount})...`);
      }
      gif.on("progress", p => {
        setProgress(76 + Math.round(p * 20));
        setProgressLabel("Encoding GIF...");
      });
      gif.on("finished", (blob) => {
        setGifBlob(blob);
        setGifPreview(URL.createObjectURL(blob));
        setProcessing(false);
        setProgress(100);
        setProgressLabel("");
        URL.revokeObjectURL(workerURL);
        showToast("GIF ready! 🎉");
      });
      gif.render();
      setProgress(76);
    } catch {
      setProcessing(false);
      setProgress(0);
      setProgressLabel("");
      showToast("Conversion failed — try a shorter clip", "error");
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) { showToast("Enter your name first! 👋", "error"); return; }
    setSubmitting(true);
    try {
      const id = generateId();
      let gif_url = null;

      // Upload GIF to Supabase Storage if we have one
      if (gifBlob) {
        setProgressLabel("Uploading GIF...");
        gif_url = await sb.uploadGif(id, gifBlob);
      }

      // Insert entry into Supabase DB
      const entry = {
        id,
        name: name.trim(),
        count: Number(count),
        timestamp: Date.now(),
        gif_url,
      };
      await sb.insertEntry(entry);
      setEntries(prev => [entry, ...prev]);

      showToast(`+${count} hotdog${count !== 1 ? "s" : ""} logged for ${entry.name}! 🌭`);
      setName(""); setCount(1); setVideoSrc(null);
      setGifBlob(null); setGifPreview(null); setProgress(0);
      setTab("leaderboard");
    } catch (e) {
      showToast("Failed to save: " + e.message, "error");
    }
    setSubmitting(false);
    setProgressLabel("");
  };

  const leaderboard = Object.values(
    entries.reduce((acc, e) => {
      const k = e.name.toLowerCase();
      if (!acc[k]) acc[k] = { name: e.name, count: 0 };
      acc[k].count += e.count;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count);

  const gallery = entries.filter(e => e.gif_url);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "#f4f4f4", minHeight: "100vh", maxWidth: 520, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ background: "#cc2200", padding: "22px 20px 0", textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Boogaloo', cursive", fontSize: 40, color: "#f5b800", margin: 0, lineHeight: 1.1, textShadow: "3px 3px 0 rgba(0,0,0,0.2)" }}>
          🌭 Hotdog Tracker
        </h1>
        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 700, letterSpacing: 1, margin: "5px 0 0", textTransform: "uppercase" }}>
          Who reigns supreme?
        </p>
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
                <input type="text" placeholder="Who's eating? 🧑" value={name} onChange={e => setName(e.target.value)} />
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
                🎬 Eating Video → GIF
              </label>
              {!videoSrc ? (
                <label style={{ display: "block", border: "2px dashed #ddd", borderRadius: 8, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: "#fafafa" }}>
                  <input ref={fileInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={handleVideoChange} />
                  <i className="huge film icon" style={{ color: "#ccc", fontSize: 40 }} />
                  <div style={{ fontWeight: 700, marginTop: 10, fontSize: 15 }}>Tap to upload video</div>
                  <div className="ui label" style={{ marginTop: 8, fontSize: 11, background: "#f0f0f0", color: "#999" }}>Auto-converted to GIF · max 5 sec</div>
                </label>
              ) : (
                <>
                  <video ref={videoRef} src={videoSrc} style={{ width: "100%", maxHeight: 200, borderRadius: 6, background: "#111", display: "block" }} muted playsInline preload="auto" controls />

                  {!gifPreview && !processing && (
                    <button className="ui fluid yellow button" style={{ marginTop: 10, fontWeight: 700 }} onClick={convertToGif}>
                      ✨ {gifLoaded ? "Convert to GIF" : "Loading encoder..."}
                    </button>
                  )}

                  {(processing || (submitting && progressLabel === "Uploading GIF...")) && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "#aaa", marginBottom: 5 }}>
                        <span>{progressLabel}</span>
                        <span>{progress}%</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 99, background: "#eee", overflow: "hidden" }}>
                        <div style={{ width: `${progress}%`, height: "100%", background: "#cc2200", transition: "width 0.25s", borderRadius: 99 }} />
                      </div>
                    </div>
                  )}

                  {gifPreview && (
                    <div style={{ marginTop: 10 }}>
                      <div className="ui green label" style={{ marginBottom: 8 }}>✅ GIF Ready!</div>
                      <img src={gifPreview} style={{ width: "100%", borderRadius: 6, display: "block" }} alt="GIF preview" />
                    </div>
                  )}

                  <button className="ui fluid basic button" style={{ marginTop: 8 }} onClick={() => { setVideoSrc(null); setGifBlob(null); setGifPreview(null); setProgress(0); }}>
                    🗑 Remove video
                  </button>
                </>
              )}
            </div>

            <button
              className={`ui fluid large red button${submitting ? " loading" : ""}`}
              style={{ fontFamily: "'Boogaloo', cursive", fontSize: 22, letterSpacing: 0.5, marginTop: 4 }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              🌭 Log It!
            </button>
          </div>
        )}

        {/* ── LEADERBOARD ── */}
        {tab === "leaderboard" && (
          <>
            <h3 className="ui header" style={{ fontFamily: "'Boogaloo', cursive", fontSize: 24, marginBottom: 16 }}>
              🏆 All-Time Standings
            </h3>
            {loadingData ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <div className="ui active inline loader" />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="ui placeholder segment" style={{ textAlign: "center" }}>
                <div className="ui icon header" style={{ color: "#aaa" }}>
                  <div style={{ fontSize: 48 }}>🌭</div>
                  No hotdogs logged yet!
                  <div className="sub header">Head to Track and be the first</div>
                </div>
              </div>
            ) : (
              leaderboard.map((p, i) => (
                <div key={p.name} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "13px 12px", borderRadius: 8, marginBottom: 8,
                  background: i === 0 ? "#fffbef" : "#fafafa",
                  border: i === 0 ? "1.5px solid #f5b800" : "1.5px solid #eee",
                }}>
                  <span style={{ fontFamily: "'Boogaloo', cursive", fontSize: i < 3 ? 28 : 14, width: 36, textAlign: "center", flexShrink: 0 }}>
                    {i < 3 ? MEDALS[i] : `#${i + 1}`}
                  </span>
                  <div style={{ flex: 1, fontWeight: 900, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.name}
                  </div>
                  <div className="ui red label" style={{ fontFamily: "'Boogaloo', cursive", fontSize: 15, flexShrink: 0 }}>
                    {p.count} 🌭
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* ── GALLERY ── */}
        {tab === "gallery" && (
          <>
            <h3 className="ui header" style={{ fontFamily: "'Boogaloo', cursive", fontSize: 24, marginBottom: 16 }}>
              🎞 GIF Gallery
            </h3>
            {loadingData ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <div className="ui active inline loader" />
              </div>
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
                {gallery.map(e => (
                  <div key={e.id} className="column" style={{ padding: 5 }}>
                    <div className="ui card" style={{ width: "100%", margin: 0, borderRadius: 10, overflow: "hidden" }}>
                      <div className="image" style={{ background: "#111", aspectRatio: "4/3", overflow: "hidden" }}>
                        <img src={e.gif_url} alt={e.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      </div>
                      <div className="content" style={{ padding: "8px 10px" }}>
                        <div className="header" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {e.name}
                        </div>
                        <div className="meta" style={{ marginTop: 4 }}>
                          <span className="ui mini red label">{e.count} 🌭</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

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
