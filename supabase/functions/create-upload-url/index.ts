// supabase/functions/create-upload-url/index.ts
// Generates a signed upload URL so the client can upload directly
// to Supabase Storage without needing auth headers.
// Deploy: npx supabase functions deploy create-upload-url --no-verify-jwt

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS, status: 204 });

  try {
    const SUPABASE_URL  = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return new Response(JSON.stringify({ error: "Missing env vars" }), { headers: CORS, status: 500 });
    }

    const u   = new URL(req.url);
    const id  = u.searchParams.get("id");
    const ext = u.searchParams.get("ext") || "mp4";
    if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { headers: CORS, status: 400 });

    const path = `${id}.${ext}`;

    // Create a signed upload URL using the service key
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sign/upload/videos/${path}`,
      {
        method: "POST",
        headers: {
          "apikey": SERVICE_KEY,
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: `Sign failed: ${err}` }), { headers: CORS, status: 500 });
    }

    const { signedURL } = await res.json();

    return new Response(
      JSON.stringify({ signedURL, path }),
      { headers: CORS, status: 200 }
    );

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { headers: CORS, status: 500 });
  }
});
