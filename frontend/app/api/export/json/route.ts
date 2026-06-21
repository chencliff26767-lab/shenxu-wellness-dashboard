import { createClient } from "@/lib/supabase/server";
import { exportOwnerData } from "@/lib/export-data";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  try {
    const bundle = await exportOwnerData(supabase, user.id);
    return new Response(JSON.stringify(bundle, null, 2), {
      headers: downloadHeaders(`wellness-backup-${dateStamp()}.json`, "application/json; charset=utf-8"),
    });
  } catch {
    return new Response("Export failed", { status: 500 });
  }
}

function downloadHeaders(filename: string, contentType: string) {
  return { "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="${filename}"`, "Content-Type": contentType };
}

function dateStamp() { return new Date().toISOString().slice(0, 10); }
