import { Edit3, FileImage, Scale, Trash2 } from "lucide-react";
import { createBodyMetric, deleteBodyMetric, updateBodyMetric } from "@/app/actions/body-metrics";
import { BottomNav } from "@/components/bottom-nav";
import { PhotoPicker } from "@/components/photo-picker";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const HEIGHT_M = 1.68;

type BodyMetric = {
  id: string;
  measured_on: string;
  weight_kg: number | string;
  waist_cm: number | string | null;
  note: string | null;
  body_fat_percent: number | string | null;
  skeletal_muscle_mass_kg: number | string | null;
  body_fat_mass_kg: number | string | null;
  waist_hip_ratio: number | string | null;
  visceral_fat_level: number | string | null;
  basal_metabolic_rate_kcal: number | string | null;
  inbody_report_path: string | null;
};

type BodyPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
    updated?: string;
  }>;
};

export default async function BodyPage({ searchParams }: BodyPageProps) {
  const params = await searchParams;
  const metrics = await getMetrics();
  const summary = getSummary(metrics);

  return (
    <main className="min-h-dvh pb-[calc(88px+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-md px-5 pt-[calc(24px+env(safe-area-inset-top))]">
        <p className="text-sm text-muted-foreground">紀錄</p>
        <h1 className="mt-1 text-3xl font-semibold">身材紀錄</h1>

        <SummaryCards summary={summary} />

        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Scale aria-hidden="true" className="h-4 w-4" />
            體重、腰圍與 BMI
          </div>

          {params?.saved ? (
            <p aria-live="polite" className="mb-3 rounded-md bg-muted p-3 text-sm text-muted-foreground" role="status">已儲存。</p>
          ) : null}
          {params?.updated ? (
            <p aria-live="polite" className="mb-3 rounded-md bg-muted p-3 text-sm text-muted-foreground" role="status">已更新。</p>
          ) : null}
          {params?.error ? (
            <p className="mb-3 rounded-md bg-muted p-3 text-sm text-muted-foreground" role="alert">
              儲存失敗：{params.error}
            </p>
          ) : null}

          <MetricForm action={createBodyMetric} submitLabel="儲存身材紀錄" />
        </section>

        <section className="mt-4 space-y-3">
          <h2 className="text-xl font-semibold">最近紀錄</h2>
          {metrics.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-5 text-muted-foreground">還沒有身材紀錄。</div>
          ) : (
            metrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

function SummaryCards({ summary }: { summary: ReturnType<typeof getSummary> }) {
  const inBodyDate = summary.latestInBodyDate ? ` (${formatDate(summary.latestInBodyDate)})` : "";

  return (
    <section className="mt-6 grid grid-cols-2 gap-2 text-sm">
      <SummaryCard label="最新體重" value={summary.latestWeight ? `${summary.latestWeight.toFixed(1)} kg` : "尚無"} />
      <SummaryCard label="最新腰圍" value={summary.latestWaist ? `${summary.latestWaist.toFixed(1)} cm` : "尚無"} />
      <SummaryCard label="七日平均體重" value={summary.avgWeight ? `${summary.avgWeight.toFixed(1)} kg` : "尚無"} />
      <SummaryCard label="七日平均腰圍" value={summary.avgWaist ? `${summary.avgWaist.toFixed(1)} cm` : "尚無"} />
      <SummaryCard label={`最新體脂${inBodyDate}`} value={summary.latestBodyFat ? `${summary.latestBodyFat.toFixed(1)} %` : "尚無"} />
      <SummaryCard
        label={`最新骨骼肌${inBodyDate}`}
        value={summary.latestSkeletalMuscle ? `${summary.latestSkeletalMuscle.toFixed(1)} kg` : "尚無"}
      />
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function MetricForm({
  action,
  metric,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  metric?: BodyMetric;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-3">
      {metric ? <input name="id" type="hidden" value={metric.id} /> : null}
      <Field
        defaultValue={metric?.measured_on || new Date().toISOString().slice(0, 10)}
        label="日期"
        name="measured_on"
        type="date"
      />
      <Field
        defaultValue={toInputValue(metric?.weight_kg)}
        label="體重 kg"
        name="weight_kg"
        placeholder="例如 75.9"
        required
        step="0.1"
        type="number"
      />
      <Field
        defaultValue={toInputValue(metric?.waist_cm)}
        label="腰圍 cm"
        name="waist_cm"
        placeholder="可選"
        step="0.1"
        type="number"
      />

      <label className="block text-sm font-medium" htmlFor={metric ? `note-${metric.id}` : "note"}>
        備註
      </label>
      <textarea
        className="min-h-24 w-full rounded-md border border-border bg-card px-3 py-2 text-base outline-none focus:ring-2 focus:ring-primary"
        defaultValue={metric?.note || ""}
        id={metric ? `note-${metric.id}` : "note"}
        name="note"
        placeholder="睡眠、水腫、量測狀態..."
      />

      <details className="rounded-lg border border-border bg-card p-4">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground">InBody 紀錄，可選</summary>
        <div className="mt-4 space-y-3">
          <Field
            defaultValue={toInputValue(metric?.body_fat_percent)}
            label="體脂肪率 %"
            name="body_fat_percent"
            placeholder="例如 30.1"
            step="0.1"
            type="number"
          />
          <Field
            defaultValue={toInputValue(metric?.skeletal_muscle_mass_kg)}
            label="骨骼肌重 kg"
            name="skeletal_muscle_mass_kg"
            placeholder="例如 29.9"
            step="0.1"
            type="number"
          />
          <Field
            defaultValue={toInputValue(metric?.body_fat_mass_kg)}
            label="體脂肪重 kg"
            name="body_fat_mass_kg"
            placeholder="例如 22.8"
            step="0.1"
            type="number"
          />
          <Field
            defaultValue={toInputValue(metric?.waist_hip_ratio)}
            label="腰臀比"
            name="waist_hip_ratio"
            placeholder="例如 0.90"
            step="0.01"
            type="number"
          />
          <Field
            defaultValue={toInputValue(metric?.visceral_fat_level)}
            label="內臟脂肪級別"
            name="visceral_fat_level"
            placeholder="例如 8"
            step="0.1"
            type="number"
          />
          <Field
            defaultValue={toInputValue(metric?.basal_metabolic_rate_kcal)}
            label="基礎代謝率 kcal"
            name="basal_metabolic_rate_kcal"
            placeholder="例如 1516"
            step="1"
            type="number"
          />

          <label className="block text-sm font-medium" htmlFor={metric ? `inbody_report-${metric.id}` : "inbody_report"}>
            InBody 報告 JPG
          </label>
          {metric?.inbody_report_path ? <p className="text-sm text-muted-foreground">已上傳報告；重新選檔會覆蓋。</p> : null}
          <PhotoPicker
            accept="image/jpeg"
            id={metric ? `inbody_report-${metric.id}` : "inbody_report"}
            name="inbody_report"
          />
        </div>
      </details>

      <Button className="w-full" type="submit">
        {submitLabel}
      </Button>
    </form>
  );
}

function Field({
  defaultValue,
  label,
  name,
  placeholder,
  required,
  step,
  type,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
  type: "date" | "number";
}) {
  return (
    <label className="block min-w-0 text-sm font-medium">
        {label}
      <input
        className="mt-1 min-h-11 w-full rounded-md border border-border bg-card px-3 text-base outline-none focus:ring-2 focus:ring-primary"
        defaultValue={defaultValue}
        inputMode={type === "number" ? "decimal" : undefined}
        min={type === "number" ? "0" : undefined}
        name={name}
        placeholder={placeholder}
        required={required}
        step={step}
        type={type}
      />
    </label>
  );
}

async function getMetrics(): Promise<BodyMetric[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("body_metrics")
    .select(
      "id, measured_on, weight_kg, waist_cm, note, body_fat_percent, skeletal_muscle_mass_kg, body_fat_mass_kg, waist_hip_ratio, visceral_fat_level, basal_metabolic_rate_kcal, inbody_report_path",
    )
    .order("measured_on", { ascending: false })
    .limit(30);

  if (error) {
    return [];
  }

  return data || [];
}

function MetricCard({ metric }: { metric: BodyMetric }) {
  const weight = Number(metric.weight_kg);
  const waist = metric.waist_cm == null ? null : Number(metric.waist_cm);
  const bmi = weight / (HEIGHT_M * HEIGHT_M);
  const inbodyItems = [
    labelValue("體脂", metric.body_fat_percent, "%"),
    labelValue("骨骼肌", metric.skeletal_muscle_mass_kg, "kg"),
    labelValue("脂肪重", metric.body_fat_mass_kg, "kg"),
    labelValue("腰臀比", metric.waist_hip_ratio, ""),
    labelValue("內臟脂肪", metric.visceral_fat_level, ""),
    labelValue("BMR", metric.basal_metabolic_rate_kcal, "kcal"),
  ].filter(Boolean);

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{metric.measured_on}</p>
          <p className="mt-1 text-2xl font-semibold">{weight.toFixed(1)} kg</p>
        </div>
        <form action={deleteBodyMetric}>
          <input name="id" type="hidden" value={metric.id} />
          <input name="report_path" type="hidden" value={metric.inbody_report_path || ""} />
          <button
            aria-label="刪除身材紀錄"
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            type="submit"
          >
            <Trash2 aria-hidden="true" className="h-5 w-5" />
          </button>
        </form>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <p className="rounded-md bg-muted p-3">BMI {bmi.toFixed(1)}</p>
        <p className="rounded-md bg-muted p-3">腰圍 {waist ? `${waist.toFixed(1)} cm` : "未填"}</p>
      </div>
      {inbodyItems.length > 0 || metric.inbody_report_path ? (
        <div className="mt-3 rounded-md bg-muted p-3 text-sm">
          <p className="font-medium">InBody</p>
          {inbodyItems.length > 0 ? (
            <div className="mt-2 grid grid-cols-2 gap-2">{inbodyItems.map((item) => item)}</div>
          ) : null}
          {metric.inbody_report_path ? (
            <p className="mt-2 flex items-center gap-2 text-muted-foreground">
              <FileImage aria-hidden="true" className="h-4 w-4" />
              已上傳報告
            </p>
          ) : null}
        </div>
      ) : null}
      {metric.note ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{metric.note}</p> : null}

      <details className="mt-3 rounded-md border border-border p-3">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground">
          <Edit3 aria-hidden="true" className="h-4 w-4" />
          編輯
        </summary>
        <div className="mt-3">
          <MetricForm action={updateBodyMetric} metric={metric} submitLabel="更新紀錄" />
        </div>
      </details>
    </article>
  );
}

function labelValue(label: string, value: number | string | null, unit: string) {
  if (value == null) {
    return null;
  }
  const numberValue = Number(value);
  const displayValue = Number.isInteger(numberValue) ? numberValue.toFixed(0) : numberValue.toFixed(1);

  return (
    <p className="rounded bg-card p-2" key={label}>
      {label} {displayValue}
      {unit ? ` ${unit}` : ""}
    </p>
  );
}

function getSummary(metrics: BodyMetric[]) {
  const latest = metrics[0];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const recent = metrics.filter((metric) => new Date(`${metric.measured_on}T00:00:00`) >= startOfDay(sevenDaysAgo));
  const latestInBody = metrics.find((metric) => metric.body_fat_percent || metric.skeletal_muscle_mass_kg);

  return {
    latestWeight: latest ? Number(latest.weight_kg) : null,
    latestWaist: latest?.waist_cm ? Number(latest.waist_cm) : null,
    avgWeight: average(recent.map((metric) => Number(metric.weight_kg))),
    avgWaist: average(recent.map((metric) => (metric.waist_cm ? Number(metric.waist_cm) : null))),
    latestBodyFat: latestInBody?.body_fat_percent ? Number(latestInBody.body_fat_percent) : null,
    latestSkeletalMuscle: latestInBody?.skeletal_muscle_mass_kg ? Number(latestInBody.skeletal_muscle_mass_kg) : null,
    latestInBodyDate: latestInBody?.measured_on || null,
  };
}

function average(values: (number | null)[]) {
  const numbers = values.filter((value): value is number => Number.isFinite(value));
  if (numbers.length === 0) {
    return null;
  }
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(date: string) {
  return date.replaceAll("-", "/");
}

function toInputValue(value: number | string | null | undefined) {
  return value == null ? "" : String(value);
}
