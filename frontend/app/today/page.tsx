import Link from "next/link";
import { CheckCircle2, Circle, Clock3, Dumbbell, MessageCircle, Plus } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { quickCompleteWorkoutPlan, quickToggleWorkoutSet } from "@/app/actions/workout-plans";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { WellnessMascot } from "@/components/wellness-mascot";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type PlannedSet = {
  id: string;
  position: number;
  target_weight_kg: number | string | null;
  target_reps: number | null;
  target_duration_seconds: number | null;
  target_distance_m: number | string | null;
};

type PlannedExercise = {
  id: string;
  position: number;
  name: string;
  variation: string | null;
  planned_sets: PlannedSet[];
};

type WorkoutSet = {
  id: string;
  planned_set_id: string | null;
  position: number;
  completed_at: string | null;
  planned_weight_kg: number | string | null;
  planned_reps: number | null;
  planned_duration_seconds: number | null;
  planned_distance_m: number | string | null;
};

type WorkoutExercise = {
  id: string;
  planned_exercise_id: string | null;
  position: number;
  name: string;
  workout_sets: WorkoutSet[];
};

type WorkoutSession = {
  id: string;
  status: string;
  overall_rpe: number | null;
  pain_score: number | null;
  note: string | null;
  pain_note: string | null;
  workout_exercises: WorkoutExercise[];
};

type TodayPlan = {
  id: string;
  scheduled_time: string | null;
  status: string;
  target_duration_minutes: number | null;
  title: string;
  planned_exercises: PlannedExercise[];
  workout_sessions: WorkoutSession[];
};

const statusLabels: Record<string, string> = {
  planned: "已安排",
  in_progress: "進行中",
  completed: "已完成",
  partial: "部分完成",
  skipped: "已略過",
};

export default async function TodayPage() {
  const [userEmail, todayPlans] = await Promise.all([getUserEmail(), getTodayPlans()]);
  const firstPlan = todayPlans[0];

  return (
    <main className="min-h-dvh pb-[calc(88px+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-md px-5 pt-[calc(24px+env(safe-area-inset-top))]">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">今天</p>
            <h1 className="text-3xl font-semibold">先完成最重要的一件事</h1>
          </div>
          <form action={signOut}>
            <Button size="sm" type="submit" variant="ghost">
              登出
            </Button>
          </form>
        </header>

        <section className="relative mt-6 overflow-hidden rounded-lg border border-border bg-card p-5">
          <WellnessMascot className="pointer-events-none absolute right-3 top-4 h-32 w-24 opacity-[0.69]" />
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Dumbbell aria-hidden="true" className="h-4 w-4" />
            今日預排訓練
          </div>
          <div className="relative z-10 max-w-[78%]">
            <h2 className="text-2xl font-semibold">
              {todayPlans.length ? `今天有 ${todayPlans.length} 個訓練安排` : "今天還沒有安排訓練"}
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              {firstPlan
                ? `${firstPlan.scheduled_time?.slice(0, 5) || "時間未定"} · ${firstPlan.title}`
                : "先替未來的自己準備好，到了現場就不用再想。"}
            </p>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-2">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
              href="/workouts?new=1"
            >
              記錄現在
            </Link>
          </div>
        </section>

        {todayPlans.length ? (
          <section className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">今日計畫狀態</h2>
              <Link className="text-sm text-muted-foreground underline underline-offset-4" href="/plans">
                查看計畫
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              {todayPlans.map((plan) => (
                <TodayPlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-4 grid grid-cols-2 gap-3">
          <QuickCard href="/body" icon={<Plus className="h-5 w-5" />} label="身材紀錄" value="體重 / 腰圍 / InBody" />
          <QuickCard href="/meals" icon={<Plus className="h-5 w-5" />} label="飲食紀錄" value="餐點 / 照片 / 備註" />
          <QuickCard href="/workouts?new=1" icon={<Dumbbell className="h-5 w-5" />} label="訓練紀錄" value="記錄現在 / 查看紀錄" />
          <QuickCard icon={<MessageCircle className="h-5 w-5" />} label="登入帳號" value={userEmail} />
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

async function getUserEmail() {
  if (!isSupabaseConfigured()) {
    return "local-demo";
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.email || "尚未登入";
}

async function getTodayPlans(): Promise<TodayPlan[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(new Date());
  const { data, error } = await supabase
    .from("workout_plans")
    .select("id, scheduled_time, status, target_duration_minutes, title, planned_exercises(id, position, name, variation, planned_sets(id, position, target_weight_kg, target_reps, target_duration_seconds, target_distance_m)), workout_sessions(id, status, overall_rpe, pain_score, note, pain_note, workout_exercises(id, planned_exercise_id, position, name, workout_sets(id, planned_set_id, position, completed_at, planned_weight_kg, planned_reps, planned_duration_seconds, planned_distance_m)))")
    .eq("scheduled_date", today)
    .neq("status", "cancelled")
    .order("scheduled_time", { ascending: true, nullsFirst: false });

  if (error || !data) {
    return [];
  }

  return data as TodayPlan[];
}

function TodayPlanCard({ plan }: { plan: TodayPlan }) {
  const session = plan.workout_sessions?.[0] || null;
  const completed = plan.status === "completed";
  const editable = plan.status !== "skipped";
  const exercises = mergeExercises(plan, session);

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 text-primary ${completed ? "" : "text-muted-foreground"}`}>
          {completed ? <CheckCircle2 aria-hidden="true" className="h-6 w-6" /> : <Circle aria-hidden="true" className="h-6 w-6" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`text-lg font-semibold ${completed ? "text-muted-foreground line-through decoration-2" : ""}`}>
              {plan.title}
            </h3>
            <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
              {statusLabels[plan.status] || plan.status}
            </span>
          </div>
          <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
            <Clock3 aria-hidden="true" className="h-4 w-4" />
            {plan.scheduled_time?.slice(0, 5) || "時間未定"}
            {plan.target_duration_minutes ? ` · ${plan.target_duration_minutes} 分鐘` : ""}
          </p>
        </div>
      </div>

      {exercises.length ? (
        <div className="mt-4 space-y-2">
          {exercises.map((exercise, index) => (
            <div className="rounded-md bg-muted p-3" key={exercise.key}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{index + 1}. {exercise.name}</p>
                  {exercise.detail ? <p className="mt-1 text-xs text-muted-foreground">{exercise.detail}</p> : null}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {exercise.completedSets}/{exercise.totalSets} 組
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {exercise.sets.map((set) => (
                  <form action={quickToggleWorkoutSet} key={set.key}>
                    <input name="plan_id" type="hidden" value={plan.id} />
                    <input name="planned_set_id" type="hidden" value={set.plannedSetId || ""} />
                    <input name="set_id" type="hidden" value={set.actualSetId || ""} />
                    <input name="completed" type="hidden" value={String(!set.completed)} />
                    <button
                      aria-label={`${exercise.name} 第 ${set.position} 組${set.completed ? "取消完成" : "標記完成"}`}
                      className={`flex min-h-10 min-w-10 items-center justify-center rounded-full border text-sm font-semibold ${
                        set.completed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
                      }`}
                      disabled={!editable}
                      type="submit"
                    >
                      {set.completed ? <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> : set.position}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {editable ? (
        <details className="mt-3 rounded-md border border-border">
          <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-muted-foreground">
            {completed ? "更新訓練後回報" : "完成並回報"}
          </summary>
          <form action={quickCompleteWorkoutPlan} className="space-y-3 border-t border-border p-3">
            <input name="id" type="hidden" value={plan.id} />
            <div className="grid grid-cols-2 gap-2">
              <NumberField defaultValue={session?.overall_rpe} label="RPE" max="10" min="1" name="overall_rpe" />
              <NumberField defaultValue={session?.pain_score} label="疼痛" max="10" min="0" name="pain_score" />
            </div>
            <label className="block text-sm font-medium">
              備註
              <textarea
                className="mt-1 min-h-20 w-full rounded-md border border-border bg-card p-2 text-base outline-none focus:ring-2 focus:ring-primary"
                defaultValue={session?.note || ""}
                name="note"
                placeholder="今天狀態、重量感受、需要調整的地方"
              />
            </label>
            <label className="block text-sm font-medium">
              疼痛／不適
              <textarea
                className="mt-1 min-h-16 w-full rounded-md border border-border bg-card p-2 text-base outline-none focus:ring-2 focus:ring-primary"
                defaultValue={session?.pain_note || ""}
                name="pain_note"
                placeholder="沒有可留空"
              />
            </label>
            <Button className="w-full" type="submit">
              {completed ? "更新回報" : "完成訓練"}
            </Button>
          </form>
        </details>
      ) : null}
    </article>
  );
}

function NumberField({
  defaultValue,
  label,
  max,
  min,
  name,
}: {
  defaultValue?: number | null;
  label: string;
  max: string;
  min: string;
  name: string;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        className="mt-1 min-h-11 w-full rounded-md border border-border bg-card px-3 text-base outline-none focus:ring-2 focus:ring-primary"
        defaultValue={defaultValue ?? ""}
        inputMode="numeric"
        max={max}
        min={min}
        name={name}
        type="number"
      />
    </label>
  );
}

function mergeExercises(plan: TodayPlan, session: WorkoutSession | null) {
  const sessionExercises = [...(session?.workout_exercises || [])].sort((a, b) => a.position - b.position);
  const sessionByPlannedId = new Map(sessionExercises.map((exercise) => [exercise.planned_exercise_id, exercise]));

  return [...(plan.planned_exercises || [])]
    .sort((a, b) => a.position - b.position)
    .map((plannedExercise) => {
      const sessionExercise = sessionByPlannedId.get(plannedExercise.id);
      const actualSets = [...(sessionExercise?.workout_sets || [])].sort((a, b) => a.position - b.position);
      const actualByPlannedSetId = new Map(actualSets.map((set) => [set.planned_set_id, set]));
      const sets = [...(plannedExercise.planned_sets || [])]
        .sort((a, b) => a.position - b.position)
        .map((plannedSet) => {
          const actualSet = actualByPlannedSetId.get(plannedSet.id);
          return {
            actualSetId: actualSet?.id || null,
            completed: Boolean(actualSet?.completed_at),
            key: actualSet?.id || plannedSet.id,
            plannedSetId: plannedSet.id,
            position: plannedSet.position,
            summary: setSummary(plannedSet, actualSet),
          };
        });

      return {
        completedSets: sets.filter((set) => set.completed).length,
        detail: sets[0]?.summary || null,
        key: plannedExercise.id,
        name: plannedExercise.variation ? `${plannedExercise.name} · ${plannedExercise.variation}` : plannedExercise.name,
        sets,
        totalSets: sets.length,
      };
    });
}

function setSummary(plannedSet: PlannedSet, actualSet?: WorkoutSet) {
  const weight = actualSet?.planned_weight_kg ?? plannedSet.target_weight_kg;
  const reps = actualSet?.planned_reps ?? plannedSet.target_reps;
  const durationSeconds = actualSet?.planned_duration_seconds ?? plannedSet.target_duration_seconds;
  const distanceM = actualSet?.planned_distance_m ?? plannedSet.target_distance_m;
  const parts = [
    weight != null ? `${Number(weight).toFixed(1)} kg` : null,
    reps != null ? `${reps} 次` : null,
    durationSeconds != null ? `${durationSeconds} 秒` : null,
    distanceM != null ? `${distanceM} 公尺` : null,
  ].filter(Boolean);

  return parts.join(" / ");
}

function QuickCard({
  href,
  icon,
  label,
  value,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  const content = (
    <>
      <div className="text-primary">{icon}</div>
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </>
  );

  if (href) {
    return (
      <Link className="min-h-28 rounded-lg border border-border bg-card p-4" href={href}>
        {content}
      </Link>
    );
  }

  return <div className="min-h-28 rounded-lg border border-border bg-card p-4">{content}</div>;
}
