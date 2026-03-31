// supabase/functions/upload-video/index.ts
//
// Receives a raw video file from the browser, writes it to Supabase Storage
// using the service key (server-side), then triggers GIF conversion.
// This bypasses the iOS Safari issue where Authorization headers are stripped
// from cross-origin XHR requests.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TRIGGER_SECRET_KEY = Deno.env.get("TRIGGER_SECRET_KEY")!;
const TRIGGER_PROJECT_REF = Deno.env.get("TRIGGER_PROJECT_REF")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://andrew-cloud.github.io",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS, status: 204 });
  }

  try {
    // Expect multipart/form-data with:
    //   file  — the video file
    //   id    — the entry ID (used as the storage filename)
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const id   = form.get("id") as string | null;

    if (!file || !id) {
      return new Response(
        JSON.stringify({ error: "Missing file or id" }),
        { headers: CORS_HEADERS, status: 400 }
      );
    }

    const ext  = file.name.split(".").pop() || "mp4";
    const path = `${id}.${ext}`;

    // Upload to Supabase Storage using the service key — no browser auth needed
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/videos/${path}`,
      {
        method: "POST",
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": file.type || "video/mp4",
          "x-upsert": "true",
        },
        body: await file.arrayBuffer(),
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
