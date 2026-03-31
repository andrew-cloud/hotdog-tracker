import React, { useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────

export type UploadFieldState =
  | "default"
  | "hover"
  | "uploading"
  | "filled"
  | "error";

export interface UploadFieldProps {
  /** Controlled state — omit to let the component manage its own state */
  state?:          UploadFieldState;
  /** Upload progress 0–100 (used when state="uploading") */
  progress?:       number;
  /** Filename shown in the filled state */
  filename?:       string;
  /** Filesize string shown in the filled state */
  filesize?:       string;
  /** Error message shown in the error state */
  errorMessage?:   string;
  /** Accept attribute forwarded to the hidden file input */
  accept?:         string;
  /** Called when the user selects a file */
  onFile?:         (file: File) => void;
  className?:      string;
  style?:          React.CSSProperties;
}

// ── Token helpers ─────────────────────────────────────

const ZONE_BG: Record<UploadFieldState, string> = {
  default:   "var(--surface\\/bg-secondary, #16161d)",
  hover:     "var(--surface\\/bg-surface, #242432)",
  uploading: "var(--surface\\/bg-secondary, #16161d)",
  filled:    "var(--semantic\\/success-subtle, #0a1f0d)",
  error:     "var(--semantic\\/danger-subtle, #2a0808)",
};

const BORDER_COLOR: Record<UploadFieldState, string> = {
  default:   "var(--surface\\/border-strong, #3a3a52)",
  hover:     "var(--brand\\/amber, #e8a44a)",
  uploading: "var(--brand\\/amber, #e8a44a)",
  filled:    "var(--semantic\\/success, #5bba6f)",
  error:     "var(--semantic\\/danger, #e85c5c)",
};

const LABEL_COLOR: Record<UploadFieldState, string> = {
  default:   "var(--text\\/secondary, #6b6882)",
  hover:     "var(--text\\/primary, #f0ede6)",
  uploading: "var(--brand\\/amber, #e8a44a)",
  filled:    "var(--text\\/primary, #f0ede6)",
  error:     "var(--semantic\\/danger, #e85c5c)",
};

const SUBLABEL_COLOR: Record<UploadFieldState, string> = {
  default:   "var(--text\\/tertiary, #6b6882)",
  hover:     "var(--text\\/secondary, #6b6882)",
  uploading: "var(--text\\/tertiary, #6b6882)",
  filled:    "var(--semantic\\/success, #5bba6f)",
  error:     "var(--text\\/tertiary, #6b6882)",
};

// ── Helpers ───────────────────────────────────────────

function Icon({ state }: { state: UploadFieldState }) {
  if (state === "filled") {
    return (
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        flexShrink:     0,
        width:          "36px",
        height:         "36px",
        borderRadius:   "50%",
        background:     "var(--semantic\\/success, #5bba6f)",
      }}>
        <span style={{
          fontFamily: "Inter, sans-serif",
          fontSize:   "14px",
          fontWeight: 600,
          lineHeight: "16px",
          color:      "var(--surface\\/bg-primary, #0f0f13)",
        }}>✓</span>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        flexShrink:     0,
        width:          "36px",
        height:         "36px",
        borderRadius:   "50%",
        background:     "var(--semantic\\/danger, #e85c5c)",
      }}>
        <span style={{
          fontFamily: "Inter, sans-serif",
          fontSize:   "14px",
          fontWeight: 600,
          lineHeight: "16px",
          color:      "var(--surface\\/bg-primary, #0f0f13)",
        }}>✕</span>
      </div>
    );
  }
  // default / hover / uploading — emoji
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
  progress    = 0,
  filename    = "hotdog_slam.mp4",
  filesize    = "47.2 MB · Uploaded",
  errorMessage = "File too large or unsupported",
  accept      = "video/mp4,video/quicktime",
  onFile,
  className,
  style,
}: UploadFieldProps) {
  const [internalState, setInternalState] = useState<UploadFieldState>("default");
  const inputRef = useRef<HTMLInputElement>(null);

  const state = controlledState ?? internalState;
  const isDashed = state === "default" || state === "hover" || state === "uploading";

  const handleClick = () => {
    if (state === "uploading" || state === "filled") return;
    inputRef.current?.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onFile?.(file);
    if (!controlledState) setInternalState("uploading");
  };

  const handleMouseEnter = () => {
    if (!controlledState && state === "default") setInternalState("hover");
  };

  const handleMouseLeave = () => {
    if (!controlledState && state === "hover") setInternalState("default");
  };

  // Labels
  const label = state === "uploading" ? "Uploading…"
    : state === "filled"    ? filename
    : state === "error"     ? "Upload failed"
    : "Tap to upload video";

  const sublabel = state === "uploading" ? `${progress}% — please wait`
    : state === "filled"    ? filesize
    : state === "error"     ? errorMessage
    : "MP4 or MOV · Max 100MB";

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
        width:          "280px",
        height:         "160px",
        borderRadius:   "8px",
        border:         `1.5px ${isDashed ? "dashed" : "solid"} ${BORDER_COLOR[state]}`,
        background:     ZONE_BG[state],
        cursor:         state === "uploading" || state === "filled" ? "default" : "pointer",
        transition:     "background 0.15s ease, border-color 0.15s ease",
        boxSizing:      "border-box",
        outline:        "none",
        ...style,
      }}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={handleFile}
      />

      {/* Content */}
      <div style={{
        display:       "flex",
        flexDirection: "column",
        alignItems:    "center",
        gap:           "6px",
        padding:       "0 24px",
      }}>
        <Icon state={state} />

        <span style={{
          fontFamily: "Inter, sans-serif",
          fontSize:   "13px",
          fontWeight: 600,
          lineHeight: "18px",
          color:      LABEL_COLOR[state],
          textAlign:  "center",
          whiteSpace: "nowrap",
        }}>
          {label}
        </span>

        <span style={{
          fontFamily: "Inter, sans-serif",
          fontSize:   "11px",
          fontWeight: 400,
          lineHeight: "16px",
          color:      SUBLABEL_COLOR[state],
          textAlign:  "center",
          whiteSpace: "nowrap",
        }}>
          {sublabel}
        </span>

        {/* Progress bar — uploading state only */}
        {state === "uploading" && (
          <div style={{
            width:        "200px",
            height:       "4px",
            borderRadius: "2px",
            background:   "var(--surface\\/border-default, #2e2e40)",
            overflow:     "hidden",
            flexShrink:   0,
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
