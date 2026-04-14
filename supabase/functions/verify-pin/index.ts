// supabase/functions/verify-pin/index.ts
// Server-side PIN verification — PIN is never sent to the client.
// Deploy with: npx supabase functions deploy verify-pin --no-verify-jwt

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function resp(body: object, status = 200) {
  return new Response(JSON.stringify(body), { headers: CORS, status });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS, status: 204 });
  if (req.method !== "POST") return resp({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL  = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_KEY) return resp({ error: "Server misconfigured" }, 500);

    const { displayName, pin } = await req.json();

    if (!displayName || !pin) return resp({ error: "Missing displayName or pin" }, 400);
    if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) return resp({ error: "Invalid PIN format" }, 400);

    // Look up user using service role key — pin column never leaves this function
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/users?display_name=eq.${encodeURIComponent(displayName)}&select=pin&limit=1`,
      {
        headers: {
          "apikey":        SERVICE_KEY,
          "Authorization": `Bearer ${SERVICE_KEY}`,
        },
      }
    );

    if (!res.ok) return resp({ error: "Database error" }, 500);

    const rows = await res.json();
    if (!rows.length) return resp({ valid: false });

    const valid = rows[0].pin === pin;
    return resp({ valid });

  } catch (e) {
    return resp({ error: `Unhandled: ${e}` }, 500);
  }
});
