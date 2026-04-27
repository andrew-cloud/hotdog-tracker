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

  // 1 hour — long clips (6–10 min) take time to compress + convert to GIF
  maxDuration: 3600,

  // Large-2x machine (8 vCPU, 16GB RAM) — faster palette generation on long clips
  machine: "large-2x",

  run: async (payload: { entryId: string; videoPath: string }) => {
    const { entryId, videoPath } = payload;

    logger.log("Starting GIF conversion", { entryId, videoPath });

    const tmpVideo = join(tmpdir(), `${entryId}-input.mp4`);
    const tmpGif   = join(tmpdir(), `${entryId}-output.gif`);

    try {
      // ── 1. Download video from Supabase Storage ──────────────────────────
      // The Mac Mini already compressed to H.264 before uploading, so we can
      // go straight to GIF conversion without a second compression pass.
      logger.log("Downloading video...");
      await downloadFile("videos", videoPath, tmpVideo);

      const { size: videoBytes } = await stat(tmpVideo);
      logger.log("Download complete", { sizeMB: (videoBytes / 1024 / 1024).toFixed(1) });

      // ── 2. Convert to GIF ────────────────────────────────────────────────
      //
      // Filter chain:
      //   setpts=0.2*PTS        → 5x speed (presentation timestamps ÷ 5)
      //   scale=320:-1          → 320px wide (down from 360) — fewer pixels = faster palette gen
      //   fps=4                 → 4fps (unchanged — already minimal)
      //   split[s0][s1]         → duplicate stream for palette pass
      //   palettegen            → build optimised palette
      //     max_colors=32       → down from 64 — halves palette work, visible but acceptable
      //     stats_mode=diff     → palette built from frame differences (better for video)
      //   paletteuse            → apply palette with dithering
      //     dither=bayer        → ordered dither (fast, small file)
      //     bayer_scale=3       → dither scale
      //     diff_mode=rectangle → only re-encode changed regions per frame

      logger.log("Converting to GIF (5x speed, 4fps, 320px, 32 colors)...");

      await new Promise<void>((resolve, reject) => {
        ffmpeg(tmpVideo)
          .inputOptions(["-t", "600"])
          .outputOptions([
            "-vf",
            [
              "setpts=0.2*PTS",
              "scale=320:-1:flags=lanczos",
              "fps=4",
              "split[s0][s1]",
              "[s0]palettegen=max_colors=32:stats_mode=diff[p]",
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
