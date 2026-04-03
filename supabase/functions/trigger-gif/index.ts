Deno.serve(async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "https://andrew-cloud.github.io",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") return new Response(null, { headers, status: 204 });

  try {
    const { entryId, videoPath } = await req.json();
    if (!entryId || !videoPath) {
      return new Response(JSON.stringify({ error: "Missing params" }), { headers, status: 400 });
    }

    const TRIGGER_SECRET_KEY = Deno.env.get("TRIGGER_SECRET_KEY")!;

    // Trigger.dev v3 REST API endpoint
    const res = await fetch(
      `https://api.trigger.dev/api/v3/tasks/convert-video-to-gif/trigger`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${TRIGGER_SECRET_KEY}`,
        },
        body: JSON.stringify({ payload: { entryId, videoPath } }),
      }
    );

    // Read as text first to safely handle HTML error pages
    const body = await res.text();
    let data: any;
    try { data = JSON.parse(body); } catch { data = { raw: body.slice(0, 200) }; }

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data }), { headers, status: 500 });
    }

    return new Response(JSON.stringify({ success: true, runId: data.id }), { headers, status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { headers, status: 500 });
  }
});
