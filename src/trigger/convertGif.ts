import { task, logger } from "@trigger.dev/sdk";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { createWriteStream, createReadStream } from "fs";
import { unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { pipeline } from "stream/promises";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const sbHeaders = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
};

async function downloadFile(bucket: string, path: string, destPath: string) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, { headers: sbHeaders });
  if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);
  const writer = createWriteStream(destPath);
  await pipeline(res.body as any, writer);
}

async function uploadFile(bucket: string, path: string, filePath: string, contentType: string) {
  const stream = createReadStream(filePath);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { ...sbHeaders, "Content-Type": contentType, "x-upsert": "true" },
    body: stream as any,
    duplex: "half",
  } as any);
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

async function updateEntryGifUrl(entryId: string, gifUrl: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/entries?id=eq.${entryId}`, {
    method: "PATCH",
    headers: { ...sbHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ gif_url: gifUrl }),
  });
  if (!res.ok) throw new Error(`DB update failed: ${res.statusText}`);
}

export const convertVideoToGif = task({
  id: "convert-video-to-gif",
  maxDuration: 300,
  run: async (payload: { entryId: string; videoPath: string }) => {
    const { entryId, videoPath } = payload;
    logger.log("Starting GIF conversion", { entryId, videoPath });

    const tmpVideo = join(tmpdir(), `${entryId}-input.mp4`);
    const tmpGif = join(tmpdir(), `${entryId}-output.gif`);

    try {
      logger.log("Downloading video...");
      await downloadFile("videos", videoPath, tmpVideo);

      logger.log("Converting to GIF...");
      ffmpeg.setFfmpegPath(ffmpegPath as string);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(tmpVideo)
          .outputOptions(["-vf", "fps=10,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse", "-loop", "0"])
          .output(tmpGif)
          .on("end", () => resolve())
          .on("error", (err) => reject(err))
          .run();
      });

      logger.log("Uploading GIF...");
      const gifUrl = await uploadFile("gifs", `${entryId}.gif`, tmpGif, "image/gif");

      logger.log("Updating entry...", { gifUrl });
      await updateEntryGifUrl(entryId, gifUrl);

      return { success: true, gifUrl };
    } finally {
      await unlink(tmpVideo).catch(() => {});
      await unlink(tmpGif).catch(() => {});
    }
  },
});
