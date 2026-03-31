import { useState, useEffect, useRef } from "react";
import * as tus from "tus-js-client";
import "./App.css";
import { Button, Input, Stepper, UploadField, GifTile, Toast, Divider, TabBar, Select } from "./design-system";

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

// ── TUS chunked upload ────────────────────────────────────────────────────────
// Splits large video files into 6 MB chunks, uploads resumably, and reports
// real byte-level progress. Works with Supabase Storage's TUS endpoint.

function uploadVideoTus(id, file, onProgress) {
  const ext = file.name.split(".").pop() || "mp4";
  const path = `${id}.${ext}`;

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      // Supabase does NOT support the creation-with-upload TUS extension
      // so this must be false or the server rejects with 400 immediately
      uploadDataDuringCreation: false,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: "videos",
        objectName: path,
        contentType: file.type || "video/mp4",
        cacheControl: "3600",
        // x-upsert must be in metadata for Supabase TUS, not in headers
        "x-upsert": "true",
      },
      // 6 MB chunks — Supabase minimum is 5 MB for multipart
      chunkSize: 6 * 1024 * 1024,
      onError: (err) => reject(new Error(`Upload failed: ${err.message || err}`)),
      onProgress: (bytesUploaded, bytesTotal) => {
        const pct = Math.round((bytesUploaded / bytesTotal) * 100);
        onProgress?.(pct);
      },
      onSuccess: () => resolve(path),
    });

    upload.findPreviousUploads().then((prev) => {
      if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
      upload.start();
    });
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

// ── App ───────────────────────────────────────────────────────────────────────

export default function HotdogTracker() {
  const [tab, setTab] = useState("log");    // "log" | "standings" | "gallery"
  const [step, setStep] = useState("name"); // "name" | "pin" | "entry"

  // Auth state
  const [selectedName, setSelectedName] = useState("");
  const [customName, setCustomName] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isNewUser, setIsNewUser] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [authedName, setAuthedName] = useState(null);

  // Log form state
  const [count, setCount] = useState(1);
  const [videoFile, setVideoFile] = useState(null);
  const [videoState, setVideoState] = useState("default");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [toast, setToast] = useState(null);

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

  // ── Auth ──────────────────────────────────────────────────────────────────

  const activeName = selectedName === NEW_USER_SENTINEL ? customName.trim() : selectedName;

  const nameOptions = [
    ...users.map(u => ({ value: u, label: u })),
    { value: NEW_USER_SENTINEL, label: "New contestant" },
  ];

  const handleNameConfirm = async () => {
    if (!activeName) return;
    setConfirming(true);
    try {
      const existingUser = await sb.getUser(activeName);

      // If they picked "New contestant" but the name is already taken, block it
      if (selectedName === NEW_USER_SENTINEL && existingUser) {
        setLoginError(`"${activeName}" is already taken — select them from the list instead.`);
        setConfirming(false);
        return;
      }

      setIsNewUser(!existingUser);
    } catch {
      setIsNewUser(selectedName === NEW_USER_SENTINEL);
    }
    setLoginPin("");
    setLoginError("");
    setConfirming(false);
    setStep("pin");
  };

  const handlePinConfirm = async () => {
    if (!loginPin || loginPin.length < 4) {
      setLoginError("Enter your 4-digit PIN");
      return;
    }
    setConfirming(true);
    setLoginError("");
    try {
      const existingUser = await sb.getUser(activeName);
      if (existingUser) {
        if (existingUser.pin !== loginPin) {
          setLoginError("Wrong PIN — try again");
          setLoginPin("");
          setConfirming(false);
          return;
        }
      } else {
        await sb.createUser(activeName, loginPin);
        setUsers(prev => [...prev, activeName].sort());
      }
      setAuthedName(activeName);
      setStep("entry");
      setSelectedName("");
      setCustomName("");
      setLoginPin("");
      setIsNewUser(null);
    } catch {
      setLoginError("Something went wrong");
    }
    setConfirming(false);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  // File selected by user — mark as ready, upload happens on submit
  const handleFileSelect = (file) => {
    setVideoFile(file);
    setVideoState("filled");
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
      showToast("Uploading video...");

      // Chunked TUS upload — real byte-level progress 0→100
      const video_path = await uploadVideoTus(id, videoFile, (pct) => {
        setUploadProgress(pct);
        setVideoState("uploading");
      });
      setUploadProgress(100);
      setVideoState("filled");

      // Insert entry row
      const entry = {
        id,
        name: authedName,
        count: Number(count),
        timestamp: Date.now(),
        gif_url: null,
        video_path,
      };
      await sb.insertEntry(entry);

      // Kick off background GIF conversion via edge function
      await sb.triggerGifConversion(id, video_path);
      setProcessingIds(prev => new Set([...prev, id]));
      setEntries(prev => [entry, ...prev]);

      showToast("Logged! 🌭 GIF converting in the background...");

      // Reset form and navigate to standings
      setCount(1);
      setVideoFile(null);
      setVideoState("default");
      setUploadProgress(0);
      setTab("standings");
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
    }, {})
  ).sort((a, b) => b.count - a.count);

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
          onChange={val => setTab(val)}
          style={{ width: "100%", flexShrink: 0 }}
        />

        <div className="app-body">

          {/* ══ LOG TAB ══════════════════════════════════════════════════════ */}
          {tab === "log" && (
            <>

              {/* Step 1 — Name selection */}
              {step === "name" && (
                <div className="ds-card ds-card-overflow">
                  <div className="ds-card-header">
                    <span className="ds-card-title">Who ate?</span>
                  </div>
                  <div className="ds-card-body">
                    <Select
                      label="Name"
                      options={nameOptions}
                      value={selectedName}
                      onChange={val => {
                        setSelectedName(val);
                        setCustomName("");
                        setLoginError("");
                      }}
                      placeholder="— Choose —"
                    />

                    {selectedName === NEW_USER_SENTINEL && (
                      <div style={{ marginTop: 16 }}>
                        <Input
                          label="Your name"
                          placeholder="Enter your name"
                          value={customName}
                          onChange={e => { setCustomName(e.target.value); setLoginError(""); }}
                          state={loginError ? "error" : "default"}
                          hint={loginError}
                          showHint={!!loginError}
                          autoFocus
                        />
                      </div>
                    )}

                    <div style={{ marginTop: 24 }}>
                      <Button
                        buttonStyle="primary"
                        size="medium"
                        label={confirming ? "Checking…" : "Confirm"}
                        loading={confirming}
                        disabled={!activeName || confirming}
                        onClick={handleNameConfirm}
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 — PIN entry */}
              {step === "pin" && (
                <div className="ds-card">
                  <div className="ds-card-header">
                    <span className="ds-card-title">Who ate?</span>
                  </div>
                  <div className="ds-card-body">
                    {/* Selected name — tap to go back */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span className="ds-field-label">Name</span>
                      <div
                        className="ds-name-field"
                        onClick={() => { setStep("name"); setLoginPin(""); setLoginError(""); }}
                      >
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "var(--text\\/primary, #f0ede6)" }}>
                          {activeName}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--text\\/tertiary, #6b6882)" }}>▾</span>
                      </div>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <Input
                        label={isNewUser ? "Create a four-digit PIN" : "Enter your four-digit PIN"}
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={loginPin}
                        onChange={e => {
                          setLoginPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                          setLoginError("");
                        }}
                        state={loginError ? "error" : "default"}
                        hint={loginError}
                        autoFocus
                      />
                    </div>

                    <div style={{ marginTop: 24 }}>
                      <Button
                        buttonStyle="primary"
                        size="medium"
                        label={confirming ? "Confirming…" : "Confirm"}
                        loading={confirming}
                        disabled={loginPin.length < 4 || confirming}
                        onClick={handlePinConfirm}
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 — Dog entry form */}
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
                        Videos will be auto-converted to sped up gifs and added to the gallery wall.
                      </span>
                    </div>
                    <div className="ds-card-body">
                      <UploadField
                        state={videoState}
                        progress={uploadProgress}
                        filename={videoFile?.name}
                        onFile={handleFileSelect}
                        accept="video/*"
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
              <div className="ds-card-body" style={{ padding: "8px 20px" }}>
                {loadingData ? (
                  <p className="ds-empty">Loading…</p>
                ) : standings.length === 0 ? (
                  <p className="ds-empty">No entries yet — be the first! 🌭</p>
                ) : (
                  standings.map((p, i) => (
                    <div key={p.name}>
                      {i > 0 && <Divider />}
                      <div className="ds-standings-row">
                        <span className="ds-standings-name">{p.name}</span>
                        <span className="ds-standings-count">{p.count} dog{p.count !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  ))
                )}
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
                gallery.map(e => (
                  <GifTile
                    key={e.id}
                    state={e.gif_url ? "default" : "loading"}
                    gifUrl={e.gif_url}
                    name={e.name}
                    count={e.count}
                    date={formatDate(e.timestamp)}
                    progress={processingIds.has(e.id) ? 50 : undefined}
                    style={{ width: "100%" }}
                  />
                ))
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
