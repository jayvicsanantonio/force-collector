import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve((_req) => {
  const body = {
    ok: true,
    service: "force-collector",
    time: new Date().toISOString(),
  };

  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
});
