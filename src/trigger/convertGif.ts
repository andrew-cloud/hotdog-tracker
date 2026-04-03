import { task, logger } from "@trigger.dev/sdk";
import ffmpeg from "fluent-ffmpeg";
import { createWriteStream, createReadStream } from "fs";
import { unlink, stat } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { pipeline } from "stream/promises";

const SUPABASE_URL = process.env.SUPABASE_URL!;
// Trigger.dev secrets use SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;

const sbHeaders = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
};

async function downloadFile(bucket: string, path: string, destPath: string) {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,
    { headers: sbHeaders }
  );
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const writer = createWriteStream(destPath);
  await pipeline(res.body as any, writer);
}

async function uploadFile(
  bucket: string,
  path: string,
  filePath: string,
  contentType: string
) {
  const stream = createReadStream(filePath);
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,
    {
      method: "POST",
      headers: {
        ...sbHeaders,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: stream as any,
      duplex: "half",
    } as any
  );
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

async function updateEntryGifUrl(entryId: string, gifUrl: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/entries?id=eq.${entryId}`,
    {
      method: "PATCH",
      headers: {
        ...sbHeaders,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ gif_url: gifUrl }),
    }
  );
  if (!res.ok) throw new Error(`DB update failed: ${res.status} ${res.statusText}`);
}

export const convertVideoToGif = task({
  id: "convert-video-to-gif",

  // 15 minutes — enough headroom for a 10-minute video at 5x speed
  maxDuration: 900,

  // Medium machine (2GB RAM) — GIF conversion is memory-intensive
  machine: "medium-1x",

  run: async (payload: { entryId: string; videoPath: string }) => {
    const { entryId, videoPath } = payload;

    logger.log("Starting GIF conversion", { entryId, videoPath });

    const tmpVideo = join(tmpdir(), `${entryId}-input.mp4`);
    const tmpGif   = join(tmpdir(), `${entryId}-output.gif`);

    try {
      // ── 1. Download video from Supabase Storage ──────────────────────────
      logger.log("Downloading video...");
      await downloadFile("videos", videoPath, tmpVideo);

      const { size: videoBytes } = await stat(tmpVideo);
      logger.log("Download complete", { sizeMB: (videoBytes / 1024 / 1024).toFixed(1) });

      // ── 2. Convert to GIF ────────────────────────────────────────────────
      //
      // Filter chain:
      //   setpts=0.2*PTS        → 5x speed (presentation timestamps ÷ 5)
      //   scale=480:-1          → 480px wide, height auto (keeps aspect ratio)
      //   flags=lanczos         → high-quality downscale
      //   fps=12                → 12fps output (smooth at 5x)
      //   split[s0][s1]         → duplicate stream for palette pass
      //   palettegen            → build optimised 128-colour palette
      //     max_colors=128      → half the 256 max — smaller GIF
      //     stats_mode=diff     → palette built from frame differences (better for video)
      //   paletteuse            → apply palette with dithering
      //     dither=bayer        → ordered dither (fast, small file)
      //     bayer_scale=5       → dither scale (1–5, higher = less banding)
      //     diff_mode=rectangle → only re-encode changed regions per frame
      //
      // Result: a 10-minute video becomes a ~2-minute GIF at 5x,
      // typically 20–80 MB depending on content complexity.

      logger.log("Converting to GIF (5x speed, 4fps)...");

      await new Promise<void>((resolve, reject) => {
        ffmpeg(tmpVideo)
          // Cap input to 10 minutes as a safety guard
          .inputOptions(["-t", "600"])
          .outputOptions([
            "-vf",
            [
              "setpts=0.2*PTS",          // 5x speed
              "scale=360:-1:flags=lanczos",
              "fps=4",                   // 4fps
              "split[s0][s1]",
              "[s0]palettegen=max_colors=64:stats_mode=diff[p]",
              "[s1][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle",
            ].join(","),
            "-loop", "0",
          ])
          .output(tmpGif)
          .on("progress", (p) => {
            logger.log("FFmpeg progress", { timemark: p.timemark, percent: p.percent });
          })
          .on("end", () => resolve())
          .on("error", (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
          .run();
      });

      const { size: gifBytes } = await stat(tmpGif);
      logger.log("Conversion complete", { sizeMB: (gifBytes / 1024 / 1024).toFixed(1) });

      // ── 3. Upload GIF to Supabase Storage ───────────────────────────────
      logger.log("Uploading GIF...");
      const gifUrl = await uploadFile("gifs", `${entryId}.gif`, tmpGif, "image/gif");

      // ── 4. Update entry row with public GIF URL ──────────────────────────
      logger.log("Updating entry...", { gifUrl });
      await updateEntryGifUrl(entryId, gifUrl);

      // ── 5. Delete the original video — no longer needed ─────────────────
      logger.log("Deleting source video...", { videoPath });
      const deleteRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/videos/${videoPath}`,
        { method: "DELETE", headers: sbHeaders }
      );
      if (!deleteRes.ok) {
        // Non-fatal — log but don't throw. GIF is already saved.
        logger.warn("Video delete failed (non-fatal)", { status: deleteRes.status });
      } else {
        logger.log("Source video deleted");
      }

      return { success: true, gifUrl, gifSizeMB: (gifBytes / 1024 / 1024).toFixed(1) };

    } finally {
      // Always clean up temp files
      await unlink(tmpVideo).catch(() => {});
      await unlink(tmpGif).catch(() => {});
    }
  },
});
