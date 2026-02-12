import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });
}

function normalizePath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const v1Index = segments.indexOf("v1");
  if (v1Index >= 0) {
    return `/${segments.slice(v1Index).join("/")}`;
  }
  if (segments.length >= 2) {
    return `/${segments.slice(-2).join("/")}`;
  }
  return pathname;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = normalizePath(url.pathname);

  if (path === "/v1/push/register" && req.method === "POST") {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ message: "Supabase env not configured." }, 500);
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ message: "Unauthorized." }, 401);
    }

    let payload: { expo_push_token?: string; device_id?: string } | null = null;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ message: "Invalid JSON body." }, 400);
    }

    const expoPushToken = payload?.expo_push_token?.trim();
    if (!expoPushToken) {
      return jsonResponse({ message: "expo_push_token is required." }, 400);
    }

    const now = new Date().toISOString();
    const record = {
      user_id: user.id,
      expo_push_token: expoPushToken,
      device_id: payload?.device_id ?? null,
      updated_at: now,
      last_seen_at: now,
    };

    const onConflict = record.device_id
      ? "user_id,device_id"
      : "expo_push_token";

    const { error: upsertError } = await supabase
      .from("push_tokens")
      .upsert(record, { onConflict });

    if (upsertError) {
      return jsonResponse({ message: upsertError.message }, 500);
    }

    return jsonResponse({ success: true });
  }

  return jsonResponse({ message: "Not found." }, 404);
});
