import Link from "next/link";
import { CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, Clock3, Copy, Play, Plus } from "lucide-react";
import {
  clonePreviousWeek,
  cloneWorkoutPlan,
  rescheduleWorkoutPlan,
  startWorkoutPlan,
  updateWorkoutPlanStatus,
} from "@/app/actions/workout-plans";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type PlannedSet = {
  id: string;
  position: number;
  target_weight_kg: number | string | null;
  target_reps: number | null;
  target_duration_seconds: number | null;
  target_distance_m: number | string | null;
  target_rpe: number | null;
  target_rir: number | null;
  rest_seconds: number | null;
};

type PlannedExercise = {
  id: string;
  position: number;
  name: string;
  variation: string | null;
  is_required: boolean;
  planned_sets: PlannedSet[];
};

type WorkoutPlan = {
  id: string;
  owner_id: string;
  title: string;
  workout_type: string;
  scheduled_date: string;
  scheduled_time: string | null;
  target_duration_minutes: number | null;
  status: string;
  focus_text: string | null;
  preparation_notes: string | null;
  skipped_reason: string | null;
  reschedule_count: number;
  locked_at: string | null;
  workout_sessions: Array<{ id: string; status: string; scheduled_at: string }>;
  planned_exercises: PlannedExercise[];
};

type WorkoutRecord = {
  id: string;
  owner_id: string;
  scheduled_at: string;
  status: string;
  title: string;
  session_type: string;
  workout_exercises: Array<{
    id: string;
    position: number;
    name: string;
    workout_sets: Array<{ id: string; completed_at: string | null }>;
  }>;
};

type PlansPageProps = {
  searchParams?: Promise<{ week?: string; day?: string; saved?: string; cloned?: string; updated?: string; error?: string }>;
};

const weekdayLabels = ["一", "二", "三", "四", "五", "六", "日"];
const statusLabels: Record<string, string> = {
  planned: "已安排",
  in_progress: "進行中",
  completed: "已完成",
  partial: "部分完成",
  skipped: "已略過",
  cancelled: "已取消",
};
const recordStatusLabels: Record<string, string> = {
  planned: "舊版安排",
  in_progress: "進行中",
  paused: "已暫停",
  completed: "已完成",
  partial: "部分完成",
  skipped: "已略過",
  draft: "草稿",
};

export default async function PlansPage({ searchParams }: PlansPageProps) {
  const params = await searchParams;
  const today = taipeiToday();
  const requestedWeek = validDate(params?.week) ? params.week! : null;
  const selectedDay = validDate(params?.day) ? params.day! : requestedWeek ? startOfWeek(requestedWeek) : today;
  const weekStart = startOfWeek(requestedWeek || selectedDay);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const [plans, workoutRecords] = await Promise.all([getPlans(weekStart, days[6]), getWorkoutRecords(weekStart, days[6])]);
  const selectedPlans = plans.filter((plan) => plan.scheduled_date === selectedDay);
  const linkedSessionIds = new Set(plans.flatMap((plan) => plan.workout_sessions || []).map((session) => session.id));
  // ponytail: plans outside the visible week cannot be de-duplicated here — ceiling: rare cross-week starts — upgrade: query sessions with their plan relation.
  const selectedRecords = workoutRecords.filter(
    (record) => record.scheduled_at.slice(0, 10) === selectedDay && !linkedSessionIds.has(record.id),
  );
  const ownerId = await getDefaultOwnerId(plans, workoutRecords);

  return (
    <main className="min-h-dvh pb-[calc(88px+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-md px-5 pt-[calc(24px+env(safe-area-inset-top))]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">計畫與紀錄</p>
            <h1 className="mt-1 text-3xl font-semibold">訓練週覽</h1>
          </div>
          <Link className="flex min-h-11 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground" href={`/plans/new?date=${selectedDay}${ownerId ? `&owner=${ownerId}` : ""}`}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            新增
          </Link>
        </div>

        {params?.saved || params?.cloned || params?.updated ? <p aria-live="polite" className="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground" role="status">計畫已更新。</p> : null}
        {params?.error ? <p className="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground" role="alert">操作失敗：{params.error}</p> : null}

        <section className="mt-6 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <Link aria-label="上一週" className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-muted" href={`/plans?week=${addDays(weekStart, -7)}&day=${addDays(selectedDay, -7)}`}>
              <ChevronLeft aria-hidden="true" className="h-5 w-5" />
            </Link>
            <p className="text-sm font-medium">{formatMonthDay(weekStart)}－{formatMonthDay(days[6])}</p>
            <Link aria-label="下一週" className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-muted" href={`/plans?week=${addDays(weekStart, 7)}&day=${addDays(selectedDay, 7)}`}>
              <ChevronRight aria-hidden="true" className="h-5 w-5" />
            </Link>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const dayPlans = plans.filter((plan) => plan.scheduled_date === day);
              const dayRecords = workoutRecords.filter((record) => record.scheduled_at.slice(0, 10) === day);
              const selected = day === selectedDay;
              return (
                <Link
                  aria-current={selected ? "date" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center rounded-md text-xs ${selected ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  href={`/plans?week=${weekStart}&day=${day}`}
                  key={day}
                >
                  <span>{weekdayLabels[index]}</span>
                  <span className="mt-1 text-base font-semibold">{Number(day.slice(8, 10))}</span>
                  <span className="mt-1 flex h-1.5 gap-0.5" aria-label={`${dayPlans.length} 個計畫，${dayRecords.length} 筆紀錄`}>
                    {dayPlans.length ? <span className={`h-1.5 w-1.5 rounded-full ${selected ? "bg-primary-foreground" : "bg-primary"}`} /> : null}
                    {dayRecords.length ? <span className={`h-1.5 w-1.5 rounded-full border ${selected ? "border-primary-foreground" : "border-primary"}`} /> : null}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{selectedDay === today ? "今天" : selectedDay}</p>
              <h2 className="text-xl font-semibold">{daySummary(selectedPlans.length, selectedRecords.length)}</h2>
            </div>
            <Link className="text-sm text-muted-foreground underline underline-offset-4" href="/workouts">訓練紀錄</Link>
          </div>

          <div className="mt-3 space-y-3">
            {selectedPlans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
            {selectedRecords.length ? (
              <div className="pt-1">
                <p className="mb-2 text-sm font-medium text-muted-foreground">當日訓練紀錄</p>
                <div className="space-y-3">
                  {selectedRecords.map((record) => <WorkoutRecordCard key={record.id} record={record} />)}
                </div>
              </div>
            ) : null}
            {!selectedPlans.length && !selectedRecords.length ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
                這天沒有計畫。休息也很好，或新增一個訓練安排。
              </div>
            ) : null}
          </div>
        </section>

        <form action={clonePreviousWeek} className="mt-4">
          <input name="week_start" type="hidden" value={weekStart} />
          <input name="owner_id" type="hidden" value={ownerId} />
          <Button className="w-full" type="submit" variant="secondary">
            <Copy aria-hidden="true" className="h-4 w-4" />
            複製前一週到本週
          </Button>
        </form>
      </div>
      <BottomNav />
    </main>
  );
}

async function getDefaultOwnerId(plans: WorkoutPlan[], records: WorkoutRecord[]) {
  if (plans[0]?.owner_id) return plans[0].owner_id;
  if (records[0]?.owner_id) return records[0].owner_id;
  if (!isSupabaseConfigured()) return "";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "";
  const { data: owner } = await supabase.from("app_owners").select("user_id").eq("user_id", user.id).maybeSingle();
  if (owner) return user.id;
  const { data: relationship } = await supabase
    .from("coach_relationships")
    .select("owner_id")
    .eq("coach_id", user.id)
    .eq("status", "active")
    .eq("manage_plans", true)
    .limit(1)
    .maybeSingle();
  return relationship?.owner_id || user.id;
}

async function getWorkoutRecords(start: string, end: string): Promise<WorkoutRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id, owner_id, scheduled_at, status, title, session_type, workout_exercises(id, position, name, workout_sets(id, completed_at))")
    .gte("scheduled_at", `${start}T00:00:00`)
    .lte("scheduled_at", `${end}T23:59:59`)
    .order("scheduled_at");
  if (error || !data) return [];
  return data as WorkoutRecord[];
}

async function getPlans(start: string, end: string): Promise<WorkoutPlan[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_plans")
    .select("id, owner_id, title, workout_type, scheduled_date, scheduled_time, target_duration_minutes, status, focus_text, preparation_notes, skipped_reason, reschedule_count, locked_at, workout_sessions(id, status, scheduled_at), planned_exercises(id, position, name, variation, is_required, planned_sets(id, position, target_weight_kg, target_reps, target_duration_seconds, target_distance_m, target_rpe, target_rir, rest_seconds))")
    .gte("scheduled_date", start)
    .lte("scheduled_date", end)
    .neq("status", "cancelled")
    .order("scheduled_date")
    .order("scheduled_time");
  if (error || !data) return [];
  return data as WorkoutPlan[];
}

function PlanCard({ plan }: { plan: WorkoutPlan }) {
  const exercises = [...(plan.planned_exercises || [])].sort((a, b) => a.position - b.position);
  const setCount = exercises.reduce((total, exercise) => total + (exercise.planned_sets?.length || 0), 0);
  const editable = plan.status === "planned" && !plan.locked_at;
  const session = plan.workout_sessions?.[0];

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
            {statusLabels[plan.status] || plan.status}{plan.reschedule_count ? ` · 改期 ${plan.reschedule_count} 次` : ""}
          </p>
          <h3 className="mt-1 truncate text-xl font-semibold">{plan.title}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Clock3 aria-hidden="true" className="h-4 w-4" />
            {plan.scheduled_time?.slice(0, 5) || "時間未定"}{plan.target_duration_minutes ? ` · ${plan.target_duration_minutes} 分鐘` : ""} · {setCount} 組
          </p>
        </div>
        <span className="rounded-full bg-muted px-2 py-1 text-xs">{exercises.length} 動作</span>
      </div>

      {plan.focus_text ? <p className="mt-3 text-sm text-muted-foreground">重點：{plan.focus_text}</p> : null}
      <ol className="mt-3 space-y-2">
        {exercises.map((exercise, index) => <ExerciseRow exercise={exercise} index={index} key={exercise.id} />)}
      </ol>

      {editable ? (
        <form action={startWorkoutPlan} className="mt-3">
          <input name="id" type="hidden" value={plan.id} />
          <Button className="w-full" type="submit">
            <Play aria-hidden="true" className="h-4 w-4" />
            開始訓練
          </Button>
        </form>
      ) : session && plan.status === "in_progress" ? (
        <Link className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" href={`/workouts?session=${session.id}`}>
          <Play aria-hidden="true" className="h-4 w-4" />
          繼續訓練
        </Link>
      ) : null}

      {editable ? (
        <details className="mt-3 rounded-md border border-border">
          <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-muted-foreground">計畫操作</summary>
          <div className="space-y-3 border-t border-border p-3">
            <form action={rescheduleWorkoutPlan} className="flex items-end gap-2">
              <input name="id" type="hidden" value={plan.id} />
              <label className="min-w-0 flex-1 text-sm font-medium">改期
                <input className="mt-1 min-h-11 w-full rounded-md border border-border bg-card px-2" defaultValue={plan.scheduled_date} name="scheduled_date" required type="date" />
              </label>
              <Button type="submit" variant="secondary">儲存</Button>
            </form>
            <form action={cloneWorkoutPlan} className="flex items-end gap-2">
              <input name="id" type="hidden" value={plan.id} />
              <label className="min-w-0 flex-1 text-sm font-medium">複製到
                <input className="mt-1 min-h-11 w-full rounded-md border border-border bg-card px-2" defaultValue={addDays(plan.scheduled_date, 7)} name="target_date" required type="date" />
              </label>
              <Button type="submit" variant="secondary">複製</Button>
            </form>
            <form action={updateWorkoutPlanStatus} className="space-y-2">
              <input name="id" type="hidden" value={plan.id} />
              <input name="return_date" type="hidden" value={plan.scheduled_date} />
              <input name="status" type="hidden" value="skipped" />
              <input className="min-h-11 w-full rounded-md border border-border bg-card px-3" name="reason" placeholder="略過原因，可選" />
              <Button className="w-full" type="submit" variant="secondary">今天略過</Button>
            </form>
            <form action={updateWorkoutPlanStatus}>
              <input name="id" type="hidden" value={plan.id} />
              <input name="return_date" type="hidden" value={plan.scheduled_date} />
              <input name="status" type="hidden" value="cancelled" />
              <Button className="w-full" type="submit" variant="ghost">取消計畫</Button>
            </form>
          </div>
        </details>
      ) : null}
    </article>
  );
}

function WorkoutRecordCard({ record }: { record: WorkoutRecord }) {
  const exercises = [...(record.workout_exercises || [])].sort((a, b) => a.position - b.position);
  const totalSets = exercises.reduce((total, exercise) => total + (exercise.workout_sets?.length || 0), 0);
  const completedSets = exercises.reduce(
    (total, exercise) => total + (exercise.workout_sets || []).filter((set) => set.completed_at).length,
    0,
  );

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <CalendarCheck aria-hidden="true" className="h-3.5 w-3.5" />
        {recordStatusLabels[record.status] || record.status} · {record.scheduled_at.slice(11, 16)}
      </p>
      <h3 className="mt-1 text-xl font-semibold">{record.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{completedSets}/{totalSets} 組完成 · {exercises.length} 個動作</p>
      {exercises.length ? (
        <ol className="mt-3 flex flex-wrap gap-2">
          {exercises.map((exercise, index) => (
            <li className="rounded-full bg-muted px-3 py-1 text-xs" key={exercise.id}>{index + 1}. {exercise.name}</li>
          ))}
        </ol>
      ) : null}
      <Link className="mt-3 inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4" href="/workouts">查看與編輯紀錄</Link>
    </article>
  );
}

function ExerciseRow({ exercise, index }: { exercise: PlannedExercise; index: number }) {
  const sets = [...(exercise.planned_sets || [])].sort((a, b) => a.position - b.position);
  const first = sets[0];
  const parts = [
    `${sets.length} 組`,
    first?.target_weight_kg != null ? `${Number(first.target_weight_kg).toFixed(1)} kg` : null,
    first?.target_reps != null ? `${first.target_reps} 次` : null,
    first?.target_duration_seconds != null ? `${first.target_duration_seconds} 秒` : null,
    first?.target_rpe != null ? `RPE ${first.target_rpe}` : null,
  ].filter(Boolean);
  return (
    <li className="flex items-center gap-3 rounded-md bg-muted p-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card text-xs font-semibold">{index + 1}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{exercise.name}{exercise.variation ? ` · ${exercise.variation}` : ""}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{parts.join(" / ")}</span>
      </span>
      {!exercise.is_required ? <span className="text-xs text-muted-foreground">選做</span> : null}
    </li>
  );
}

function validDate(value?: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)));
}

function taipeiToday() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(new Date());
}

function startOfWeek(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  const offset = (value.getUTCDay() + 6) % 7;
  value.setUTCDate(value.getUTCDate() - offset);
  return value.toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function formatMonthDay(date: string) {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
}

function daySummary(planCount: number, recordCount: number) {
  if (planCount && recordCount) return `${planCount} 個計畫 · ${recordCount} 筆紀錄`;
  if (planCount) return `${planCount} 個計畫`;
  if (recordCount) return `${recordCount} 筆訓練紀錄`;
  return "尚未安排";
}
