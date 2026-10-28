import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("KIWIFY_WEBHOOK_SECRET");
  const supplied = new URL(request.url).searchParams.get("token") ?? "";
  if (!secret || !constantTimeEqual(supplied, secret)) return new Response("Unauthorized", { status: 401 });

  let payload: Record<string, unknown>;
  try { payload = await request.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return new Response("Server configuration error", { status: 500 });
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("apply_kiwify_subscription_event", { p_event: payload });
  if (error) {
    console.error("Kiwify event processing failed", { code: error.code, message: error.message });
    return new Response("Unable to process event", { status: 500 });
  }
  return Response.json({ received: true, result: data }, { headers: corsHeaders });
});

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}
