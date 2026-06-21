import Link from "next/link";
import { ArrowLeft, Database, Download, FileJson, Table2 } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";

const datasets = [
  ["body_metrics", "身材紀錄"],
  ["meal_entries", "飲食紀錄"],
  ["workout_plans", "訓練計畫"],
  ["planned_exercises", "計畫動作"],
  ["planned_sets", "計畫組別"],
  ["workout_sessions", "實際訓練"],
  ["workout_exercises", "實際動作"],
  ["workout_sets", "實際組別"],
  ["weekly_goals", "每週目標"],
  ["coach_feedback", "教練回饋"],
] as const;

export default function ExportPage() {
  return (
    <main className="min-h-dvh pb-[calc(88px+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-md px-5 pt-[calc(24px+env(safe-area-inset-top))]">
        <Link className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground" href="/settings/access"><ArrowLeft aria-hidden="true" className="h-4 w-4" />返回設定</Link>
        <p className="mt-2 text-sm text-muted-foreground">設定</p>
        <h1 className="mt-1 text-3xl font-semibold">匯出與備份</h1>

        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <FileJson aria-hidden="true" className="h-7 w-7 text-primary" />
          <h2 className="mt-3 text-xl font-semibold">完整 JSON 備份</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">包含所有文字與數值資料及 Storage 路徑；照片檔案本身不會包進備份。</p>
          <a className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" href="/api/export/json"><Download aria-hidden="true" className="h-4 w-4" />下載完整備份</a>
        </section>

        <section className="mt-6">
          <div className="flex items-center gap-2"><Table2 aria-hidden="true" className="h-5 w-5 text-primary" /><h2 className="text-xl font-semibold">CSV 資料表</h2></div>
          <p className="mt-2 text-sm text-muted-foreground">UTF-8 格式，可用 Excel、Numbers 或試算表開啟。</p>
          <div className="mt-3 space-y-2">
            {datasets.map(([dataset, label]) => (
              <a className="flex min-h-12 items-center justify-between rounded-lg border border-border bg-card px-4 text-sm font-medium" href={`/api/export/csv?dataset=${dataset}`} key={dataset}>
                <span className="flex items-center gap-2"><Database aria-hidden="true" className="h-4 w-4 text-muted-foreground" />{label}</span>
                <Download aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
              </a>
            ))}
          </div>
        </section>

        <p className="mt-6 rounded-lg bg-muted p-4 text-xs leading-5 text-muted-foreground">備份可能包含健康與教練資料。下載後請存放在受保護的位置，不要直接分享公開連結。</p>
      </div>
      <BottomNav />
    </main>
  );
}
