import { createClient } from "@/lib/supabase/server";
import { csvDatasets, exportOwnerData, toCsv, type CsvDataset } from "@/lib/export-data";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const dataset = new URL(request.url).searchParams.get("dataset");
  if (!dataset || !csvDatasets.includes(dataset as CsvDataset)) return new Response("Invalid dataset", { status: 400 });
  try {
    const bundle = await exportOwnerData(supabase, user.id);
    const csv = toCsv(bundle[dataset as CsvDataset]);
    return new Response(csv, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${dataset}-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch {
    return new Response("Export failed", { status: 500 });
  }
}
