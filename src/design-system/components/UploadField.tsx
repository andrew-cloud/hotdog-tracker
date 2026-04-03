import React, { useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────

export type UploadFieldState =
  | "default"
  | "hover"
  | "selected"   // file chosen, not yet uploaded
  | "uploading"
  | "filled"     // upload complete
  | "error";

export interface UploadFieldProps {
  state?:          UploadFieldState;
  progress?:       number;
  /** Filename shown in selected/filled states */
  filename?:       string;
  /** Filesize string — computed by caller from actual File.size */
  filesize?:       string;
  errorMessage?:   string;
  accept?:         string;
  onFile?:         (file: File) => void;
  className?:      string;
  style?:          React.CSSProperties;
}

// ── Token helpers ─────────────────────────────────────

const ZONE_BG: Record<UploadFieldState, string> = {
  default:   "var(--surface\\/bg-secondary, #16161d)",
  hover:     "var(--surface\\/bg-surface, #242432)",
  selected:  "var(--surface\\/bg-secondary, #16161d)",
  uploading: "var(--surface\\/bg-secondary, #16161d)",
  filled:    "var(--semantic\\/success-subtle, #0a1f0d)",
  error:     "var(--semantic\\/danger-subtle, #2a0808)",
};

const BORDER_COLOR: Record<UploadFieldState, string> = {
  default:   "var(--surface\\/border-strong, #3a3a52)",
  hover:     "var(--brand\\/amber, #e8a44a)",
  selected:  "var(--brand\\/amber, #e8a44a)",
  uploading: "var(--brand\\/amber, #e8a44a)",
  filled:    "var(--semantic\\/success, #5bba6f)",
  error:     "var(--semantic\\/danger, #e85c5c)",
};

const LABEL_COLOR: Record<UploadFieldState, string> = {
  default:   "var(--text\\/secondary, #6b6882)",
  hover:     "var(--text\\/primary, #f0ede6)",
  selected:  "var(--text\\/primary, #f0ede6)",
  uploading: "var(--brand\\/amber, #e8a44a)",
  filled:    "var(--text\\/primary, #f0ede6)",
  error:     "var(--semantic\\/danger, #e85c5c)",
};

const SUBLABEL_COLOR: Record<UploadFieldState, string> = {
  default:   "var(--text\\/tertiary, #6b6882)",
  hover:     "var(--text\\/secondary, #6b6882)",
  selected:  "var(--brand\\/amber, #e8a44a)",
  uploading: "var(--text\\/tertiary, #6b6882)",
  filled:    "var(--semantic\\/success, #5bba6f)",
  error:     "var(--text\\/tertiary, #6b6882)",
};

// ── Icon ──────────────────────────────────────────────

function Icon({ state }: { state: UploadFieldState }) {
  if (state === "filled") {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, width: "36px", height: "36px", borderRadius: "50%",
        background: "var(--semantic\\/success, #5bba6f)",
      }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "var(--surface\\/bg-primary, #0f0f13)" }}>✓</span>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, width: "36px", height: "36px", borderRadius: "50%",
        background: "var(--semantic\\/danger, #e85c5c)",
      }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 600, color: "var(--surface\\/bg-primary, #0f0f13)" }}>✕</span>
      </div>
    );
  }
  if (state === "selected") {
    return <span style={{ fontSize: "28px", lineHeight: "32px", userSelect: "none" }}>📹</span>;
  }
  return (
    <span style={{
      fontSize:   state === "uploading" ? "24px" : "28px",
      lineHeight: state === "uploading" ? "28px" : "32px",
      userSelect: "none",
    }}>
      {state === "uploading" ? "⏳" : "📹"}
    </span>
  );
}

// ── UploadField ───────────────────────────────────────

export default function UploadField({
  state: controlledState,
  progress     = 0,
  filename     = "video.mp4",
  filesize,
  errorMessage = "File too large or unsupported",
  accept       = "video/mp4,video/quicktime,video/*",
  onFile,
  className,
  style,
}: UploadFieldProps) {
  const [internalState, setInternalState] = useState<UploadFieldState>("default");
  const inputRef = useRef<HTMLInputElement>(null);

  const state    = controlledState ?? internalState;
  const isDashed = state === "default" || state === "hover" || state === "selected" || state === "uploading";
  const isLocked = state === "uploading" || state === "filled";

  const handleClick = () => {
    if (isLocked) return;
    inputRef.current?.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onFile?.(file);
    if (!controlledState) setInternalState("selected");
  };

  const handleMouseEnter = () => {
    if (!controlledState && state === "default") setInternalState("hover");
  };

  const handleMouseLeave = () => {
    if (!controlledState && state === "hover") setInternalState("default");
  };

  // Labels per state
  const label = state === "uploading" ? "Uploading…"
    : state === "selected"  ? filename
    : state === "filled"    ? filename
    : state === "error"     ? "Upload failed"
    : "Tap to upload video";

  const sublabel = state === "uploading" ? `${progress}% — please wait`
    : state === "selected"  ? (filesize ? `${filesize} · Ready to upload` : "Ready to upload")
    : state === "filled"    ? (filesize ? `${filesize} · Uploaded` : "Uploaded")
    : state === "error"     ? errorMessage
    : "MP4 or MOV · Max 100MB";

  // Height: auto when a filename is shown so long names can wrap
  const hasFilename = state === "selected" || state === "filled";

  return (
    <div
      className={className}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={0}
      aria-label="Upload video file"
      onKeyDown={e => e.key === "Enter" && handleClick()}
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        width:          "100%",
        minHeight:      "120px",
        height:         hasFilename ? "auto" : "160px",
        borderRadius:   "8px",
        border:         `2px ${isDashed ? "dashed" : "solid"} ${BORDER_COLOR[state]}`,
        background:     ZONE_BG[state],
        cursor:         isLocked ? "default" : "pointer",
        transition:     "background 0.15s ease, border-color 0.15s ease",
        boxSizing:      "border-box",
        outline:        "none",
        padding:        "16px",
        ...style,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={handleFile}
      />

      <div style={{
        display:       "flex",
        flexDirection: "column",
        alignItems:    "center",
        gap:           "6px",
        width:         "100%",
      }}>
        <Icon state={state} />

        {/* Primary label — wraps for long filenames */}
        <span style={{
          fontFamily:  "Inter, sans-serif",
          fontSize:    "16px",
          fontWeight:  600,
          lineHeight:  "22px",
          color:       LABEL_COLOR[state],
          textAlign:   "center",
          wordBreak:   "break-all",
          width:       "100%",
        }}>
          {label}
        </span>

        {/* Sublabel */}
        <span style={{
          fontFamily: "Inter, sans-serif",
          fontSize:   "16px",
          fontWeight: 400,
          lineHeight: "22px",
          color:      SUBLABEL_COLOR[state],
          textAlign:  "center",
          whiteSpace: "nowrap",
        }}>
          {sublabel}
        </span>

        {/* Progress bar */}
        {state === "uploading" && (
          <div style={{
            width: "100%", height: "4px", borderRadius: "2px",
            background: "var(--surface\\/border-default, #2e2e40)",
            overflow: "hidden", flexShrink: 0,
          }}>
            <div style={{
              width:        `${Math.min(Math.max(progress, 0), 100)}%`,
              height:       "100%",
              borderRadius: "2px",
              background:   "var(--brand\\/amber, #e8a44a)",
              transition:   "width 0.3s ease",
            }} />
          </div>
        )}
      </div>
    </div>
  );
}
