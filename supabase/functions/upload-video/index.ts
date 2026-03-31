// supabase/functions/upload-video/index.ts
//
// Receives raw video bytes + metadata via query params.
// Raw binary body avoids multipart CORS preflight entirely.
// verify_jwt must be disabled on this function (--no-verify-jwt).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TRIGGER_SECRET_KEY = Deno.env.get("TRIGGER_SECRET_KEY")!;
const TRIGGER_PROJECT_REF = Deno.env.get("TRIGGER_PROJECT_REF")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS, status: 204 });
  }

  try {
    // Read id and ext from query params
    const url = new URL(req.url);
    const id  = url.searchParams.get("id");
    const ext = url.searchParams.get("ext") || "mp4";

    if (!id) {
      return new Response(
        JSON.stringify({ error: "Missing id query param" }),
        { headers: CORS_HEADERS, status: 400 }
      );
    }

    const path        = `${id}.${ext}`;
    const contentType = req.headers.get("content-type") || "video/mp4";

    // Read raw binary body
    const body = await req.arrayBuffer();
    if (!body || body.byteLength === 0) {
      return new Response(
        JSON.stringify({ error: "Empty body" }),
        { headers: CORS_HEADERS, status: 400 }
      );
    }

    // Upload to Supabase Storage using service key
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/videos/${path}`,
      {
        method: "POST",
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return new Response(
        JSON.stringify({ error: `Storage upload failed: ${err}` }),
        { headers: CORS_HEADERS, status: 500 }
      );
    }

    // Trigger GIF conversion
    const triggerRes = await fetch(
      `https://api.trigger.dev/api/v1/projects/${TRIGGER_PROJECT_REF}/tasks/convert-video-to-gif/trigger`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${TRIGGER_SECRET_KEY}`,
        },
        body: JSON.stringify({ payload: { entryId: id, videoPath: path } }),
      }
    );

    const triggerData = await triggerRes.json();
    if (!triggerRes.ok) {
      return new Response(
        JSON.stringify({ error: triggerData }),
        { headers: CORS_HEADERS, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, videoPath: path, runId: triggerData.id }),
      { headers: CORS_HEADERS, status: 200 }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { headers: CORS_HEADERS, status: 500 }
    );
  }
});
