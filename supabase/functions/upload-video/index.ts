// supabase/functions/upload-video/index.ts
// Upload-only — stores video using service key, returns video path.
// GIF conversion is triggered separately by the client via trigger-gif.
// Deploy with: npx supabase functions deploy upload-video --no-verify-jwt

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function err(msg: string, status = 500) {
  return new Response(JSON.stringify({ error: msg }), { headers: CORS, status });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS, status: 204 });

  try {
    const SUPABASE_URL  = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL) return err("Missing SUPABASE_URL");
    if (!SERVICE_KEY)  return err("Missing SUPABASE_SERVICE_ROLE_KEY");

    const u    = new URL(req.url);
    const id   = u.searchParams.get("id");
    const ext  = u.searchParams.get("ext") || "mp4";
    const mime = u.searchParams.get("mime") || "video/mp4";
    if (!id) return err("Missing id query param", 400);

    const path        = `${id}.${ext}`;
    const contentType = req.headers.get("content-type") || "video/mp4";

    const body = await req.arrayBuffer();
    if (!body || body.byteLength === 0) return err("Empty body", 400);

    const storageRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/videos/${path}`,
      {
        method: "POST",
        headers: {
          "apikey": SERVICE_KEY,
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body,
      }
    );

    if (!storageRes.ok) {
      const detail = await storageRes.text();
      return err(`Storage ${storageRes.status}: ${detail}`);
    }

    return new Response(
      JSON.stringify({ success: true, videoPath: path }),
      { headers: CORS, status: 200 }
    );

  } catch (e) {
    return err(`Unhandled: ${e}`);
  }
});
