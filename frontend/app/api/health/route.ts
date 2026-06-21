import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export function GET() {
  const configured = isSupabaseConfigured();
  return Response.json(
    {
      status: configured ? "ok" : "misconfigured",
      service: "wellness-journal",
      timestamp: new Date().toISOString(),
    },
    {
      status: configured ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
