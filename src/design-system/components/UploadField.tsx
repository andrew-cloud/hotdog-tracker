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
  /** Override the default-state primary label (default: "Tap to upload video") */
  label?:          string;
  /** Override the default-state sublabel (default: "MP4 or MOV · Max 1 GB") */
  sublabel?:       string;
  /** Icon shown in default/selected states — emoji string (default: "📹") */
  icon?:           string;
}

// ── Token helpers ─────────────────────────────────────

const ZONE_BG: Record<UploadFieldState, string> = {
  default:   "var(--component\\/upload-bg-default, #FFFFFF)",
  hover:     "var(--component\\/upload-bg-hover, #FDF6EF)",
  selected:  "var(--component\\/upload-bg-default, #FFFFFF)",
  uploading: "var(--component\\/upload-bg-default, #FFFFFF)",
  filled:    "var(--component\\/upload-bg-success, #EAF6EC)",
  error:     "var(--component\\/upload-bg-error, #FDEAEA)",
};

const BORDER_COLOR: Record<UploadFieldState, string> = {
  default:   "var(--component\\/upload-border-default, #E4D6C7)",
  hover:     "var(--component\\/upload-border-hover, #F06705)",
  selected:  "var(--component\\/upload-border-hover, #F06705)",
  uploading: "var(--component\\/upload-border-hover, #F06705)",
  filled:    "var(--component\\/upload-border-success, #5bba6f)",
  error:     "var(--component\\/upload-border-error, #e85c5c)",
};

const LABEL_COLOR: Record<UploadFieldState, string> = {
  default:   "var(--text\\/secondary, #727272)",
  hover:     "var(--component\\/upload-text, #121212)",
  selected:  "var(--component\\/upload-text, #121212)",
  uploading: "var(--brand\\/orange, #F06705)",
  filled:    "var(--component\\/upload-text, #121212)",
  error:     "var(--semantic\\/danger, #e85c5c)",
};

const SUBLABEL_COLOR: Record<UploadFieldState, string> = {
  default:   "var(--text\\/tertiary, #727272)",
  hover:     "var(--text\\/secondary, #727272)",
  selected:  "var(--brand\\/orange, #F06705)",
  uploading: "var(--text\\/tertiary, #727272)",
  filled:    "var(--semantic\\/success, #5bba6f)",
  error:     "var(--text\\/tertiary, #727272)",
};

// ── Icon ──────────────────────────────────────────────

function Icon({ state, icon = "📹" }: { state: UploadFieldState; icon?: string }) {
  if (state === "filled") {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, width: "36px", height: "36px", borderRadius: "50%",
        background: "var(--semantic\\/success, #5bba6f)",
      }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "14px", fontWeight: 600, color: "var(--surface\\/bg-primary, #101010)" }}>✓</span>
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
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "14px", fontWeight: 600, color: "var(--surface\\/bg-primary, #101010)" }}>✕</span>
      </div>
    );
  }
  if (state === "selected") {
    return <span style={{ fontSize: "28px", lineHeight: "32px", userSelect: "none" }}>{icon}</span>;
  }
  return (
    <span style={{
      fontSize:   state === "uploading" ? "24px" : "28px",
      lineHeight: state === "uploading" ? "28px" : "32px",
      userSelect: "none",
    }}>
      {state === "uploading" ? "⏳" : icon}
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
  label:    defaultLabel    = "Tap to upload video",
  sublabel: defaultSublabel = "MP4 or MOV · Max 1 GB",
  icon      = "📹",
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
    : defaultLabel;

  const sublabel = state === "uploading" ? `${progress}% — please wait`
    : state === "selected"  ? (filesize ? `${filesize} · Ready to upload` : "Ready to upload")
    : state === "filled"    ? (filesize ? `${filesize} · Uploaded` : "Uploaded")
    : state === "error"     ? errorMessage
    : defaultSublabel;

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
        <Icon state={state} icon={icon} />

        {/* Primary label — wraps for long filenames */}
        <span style={{
          fontFamily:  "'Space Grotesk', sans-serif",
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
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize:   "16px",
          fontWeight: 500,
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
            background: "var(--component\\/upload-border-default, #E4D6C7)",
            overflow: "hidden", flexShrink: 0,
          }}>
            <div style={{
              width:        `${Math.min(Math.max(progress, 0), 100)}%`,
              height:       "100%",
              borderRadius: "2px",
              background:   "var(--brand\\/orange, #F06705)",
              transition:   "width 0.3s ease",
            }} />
          </div>
        )}
      </div>
    </div>
  );
}
