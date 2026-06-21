import { CalendarClock, ChevronDown, Edit3, LockKeyhole, Pause, Play, Plus, SquareCheckBig, Trash2 } from "lucide-react";
import {
  createWorkout,
  deleteWorkout,
  finishWorkoutSession,
  updateWorkout,
  updateWorkoutExerciseNotes,
  updateWorkoutSessionState,
  updateWorkoutSessionSummary,
  updateWorkoutSet,
} from "@/app/actions/workouts";
import { BottomNav } from "@/components/bottom-nav";
import { WorkoutSetEditor } from "@/components/workout-set-editor";
import { WorkoutForm } from "@/components/workout-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type WorkoutSet = {
  id: string;
  position: number;
  planned_weight_kg: number | string | null;
  actual_weight_kg: number | string | null;
  planned_reps: number | null;
  actual_reps: number | null;
  planned_duration_min: number | null;
  actual_duration_min: number | null;
  planned_duration_seconds: number | null;
  actual_duration_seconds: number | null;
  planned_distance_m: number | string | null;
  actual_distance_m: number | string | null;
  planned_intensity: number | string | null;
  actual_intensity: number | string | null;
  planned_rpe: number | null;
  actual_rpe: number | null;
  planned_rir: number | null;
  actual_rir: number | null;
  note: string | null;
  pain_note: string | null;
  fatigue_note: string | null;
  equipment_note: string | null;
  completed_at: string | null;
};

type WorkoutExercise = {
  id: string;
  position: number;
  exercise_type: string;
  name: string;
  note: string | null;
  pain_note: string | null;
  fatigue_note: string | null;
  equipment_note: string | null;
  workout_sets: WorkoutSet[];
};

type WorkoutSession = {
  id: string;
  workout_plan_id: string | null;
  scheduled_at: string;
  status: string;
  title: string;
  session_type: string;
  note: string | null;
  pain_note: string | null;
  overall_rpe: number | null;
  pain_score: number | null;
  duration_minutes: number | null;
  paused_at: string | null;
  completed_at: string | null;
  workout_exercises: WorkoutExercise[];
};

type WorkoutsPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
    updated?: string;
    setUpdated?: string;
    started?: string;
    session?: string;
    finished?: string;
  }>;
};

const statusLabels: Record<string, string> = {
  planned: "已安排",
  in_progress: "進行中",
  paused: "已暫停",
  completed: "已完成",
  partial: "部分完成",
  skipped: "已略過",
  draft: "草稿",
};

export default async function WorkoutsPage({ searchParams }: WorkoutsPageProps) {
  const params = await searchParams;
  const workouts = await getWorkouts();
  if (params?.session) workouts.sort((a, b) => Number(b.id === params.session) - Number(a.id === params.session));
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(new Date());
  const todayWorkouts = workouts.filter((workout) => workout.scheduled_at.slice(0, 10) === today);
  const recentWorkouts = workouts.filter((workout) => workout.scheduled_at.slice(0, 10) !== today);

  return (
    <main className="min-h-dvh pb-[calc(88px+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-md px-5 pt-[calc(24px+env(safe-area-inset-top))]">
        <p className="text-sm text-muted-foreground">計畫 / 紀錄</p>
        <h1 className="mt-1 text-3xl font-semibold">訓練</h1>

        {params?.saved || params?.updated || params?.setUpdated || params?.started || params?.finished ? (
          <p className="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">變更已儲存。</p>
        ) : null}
        {params?.error ? (
          <p className="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">儲存失敗：{params.error}</p>
        ) : null}

        <section className="mt-6 space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">依序完成，不用一次看完所有欄位</p>
            <h2 className="mt-1 text-xl font-semibold">今日訓練</h2>
          </div>
          {todayWorkouts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-5">
              <p className="font-medium">今天還沒有安排</p>
              <p className="mt-1 text-sm text-muted-foreground">可以從下方新增訓練，安排後會在這裡依順序顯示。</p>
            </div>
          ) : (
            todayWorkouts.map((workout) => <WorkoutCard key={workout.id} workout={workout} />)
          )}
        </section>

        <details className="mt-4 rounded-lg border border-border bg-card" open={Boolean(params?.error)}>
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 font-medium [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <Plus aria-hidden="true" className="h-4 w-4" />
              新增或安排訓練
            </span>
            <ChevronDown aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          </summary>
          <div className="border-t border-border p-4">
            <WorkoutForm action={createWorkout} submitLabel="儲存訓練" />
          </div>
        </details>

        {recentWorkouts.length ? (
          <section className="mt-6 space-y-3">
            <h2 className="text-xl font-semibold">過去紀錄</h2>
            {recentWorkouts.map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} />
            ))}
          </section>
        ) : null}
      </div>
      <BottomNav />
    </main>
  );
}

async function getWorkouts(): Promise<WorkoutSession[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(
      "id, workout_plan_id, scheduled_at, status, title, session_type, note, pain_note, overall_rpe, pain_score, duration_minutes, paused_at, completed_at, workout_exercises(id, position, exercise_type, name, note, pain_note, fatigue_note, equipment_note, workout_sets(id, position, planned_weight_kg, actual_weight_kg, planned_reps, actual_reps, planned_duration_min, actual_duration_min, planned_duration_seconds, actual_duration_seconds, planned_distance_m, actual_distance_m, planned_intensity, actual_intensity, planned_rpe, actual_rpe, planned_rir, actual_rir, note, pain_note, fatigue_note, equipment_note, completed_at))",
    )
    .order("scheduled_at", { ascending: false })
    .limit(30);

  if (error || !data) {
    return [];
  }

  return data as WorkoutSession[];
}

function WorkoutCard({ workout }: { workout: WorkoutSession }) {
  const exercises = [...(workout.workout_exercises || [])].sort((a, b) => a.position - b.position);
  const currentExerciseIndex = exercises.findIndex((exercise) =>
    (exercise.workout_sets || []).some((set) => !set.completed_at),
  );
  const totalSets = exercises.reduce((total, exercise) => total + (exercise.workout_sets?.length || 0), 0);
  const completedSets = exercises.reduce(
    (total, exercise) => total + (exercise.workout_sets || []).filter((set) => set.completed_at).length,
    0,
  );

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <CalendarClock aria-hidden="true" className="h-4 w-4" />
            {workout.scheduled_at.slice(0, 16).replace("T", " ")}
          </p>
          <h3 className="mt-1 text-xl font-semibold">{workout.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {statusLabels[workout.status] || workout.status} · {completedSets}/{totalSets} 組完成
          </p>
        </div>
        {workout.workout_plan_id ? (
          <span className="flex h-11 items-center gap-1 text-xs text-muted-foreground">
            <LockKeyhole aria-hidden="true" className="h-4 w-4" />
            計畫快照
          </span>
        ) : (
          <form action={deleteWorkout}>
            <input name="id" type="hidden" value={workout.id} />
            <button
              aria-label="刪除訓練"
              className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
              type="submit"
            >
              <Trash2 aria-hidden="true" className="h-5 w-5" />
            </button>
          </form>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {exercises.map((exercise, index) => (
          <ExerciseSummary
            defaultOpen={index === currentExerciseIndex}
            exercise={exercise}
            index={index}
            key={exercise.id}
          />
        ))}
      </div>

      {workout.workout_plan_id ? <SessionControls workout={workout} /> : null}

      {workout.pain_note ? <p className="mt-3 text-sm leading-6 text-muted-foreground">疼痛 / 舊傷：{workout.pain_note}</p> : null}
      {workout.note ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{workout.note}</p> : null}

      <details className="mt-3 rounded-md border border-border p-3">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground">訓練摘要與事後調整</summary>
        <form action={updateWorkoutSessionSummary} className="mt-3 space-y-3">
          <input name="id" type="hidden" value={workout.id} />
          <label className="block text-sm font-medium">實際時間
            <input className="mt-1 min-h-11 w-full rounded-md border border-border bg-card px-3" defaultValue={workout.scheduled_at.slice(0, 16)} name="scheduled_at" required type="datetime-local" />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <SummaryNumber defaultValue={workout.duration_minutes} label="分鐘" name="duration_minutes" />
            <SummaryNumber defaultValue={workout.overall_rpe} label="RPE" max="10" min="1" name="overall_rpe" />
            <SummaryNumber defaultValue={workout.pain_score} label="疼痛" max="10" name="pain_score" />
          </div>
          <SummaryText defaultValue={workout.note} label="訓練備註" name="note" />
          <SummaryText defaultValue={workout.pain_note} label="疼痛／舊傷" name="pain_note" />
          <button className="min-h-11 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" type="submit">儲存摘要</button>
        </form>
      </details>

      {!workout.workout_plan_id ? <details className="mt-3 rounded-md border border-border p-3">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground">
          <Edit3 aria-hidden="true" className="h-4 w-4" />
          編輯
        </summary>
        <div className="mt-3">
          <WorkoutForm action={updateWorkout} session={workout} submitLabel="更新訓練" />
        </div>
      </details> : null}
    </article>
  );
}

function SessionControls({ workout }: { workout: WorkoutSession }) {
  const active = workout.status === "in_progress" || workout.status === "paused";
  if (!active) return null;
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <form action={updateWorkoutSessionState}>
        <input name="id" type="hidden" value={workout.id} />
        <input name="intent" type="hidden" value={workout.status === "paused" ? "resume" : "pause"} />
        <button className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-card text-sm font-medium" type="submit">
          {workout.status === "paused" ? <Play aria-hidden="true" className="h-4 w-4" /> : <Pause aria-hidden="true" className="h-4 w-4" />}
          {workout.status === "paused" ? "繼續" : "暫停"}
        </button>
      </form>
      <form action={finishWorkoutSession}>
        <input name="id" type="hidden" value={workout.id} />
        <button className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground" type="submit">
          <SquareCheckBig aria-hidden="true" className="h-4 w-4" />
          結束訓練
        </button>
      </form>
    </div>
  );
}

function SummaryNumber({ defaultValue, label, max, min = "0", name }: { defaultValue: number | null; label: string; max?: string; min?: string; name: string }) {
  return (
    <label className="text-xs text-muted-foreground">{label}
      <input className="mt-1 min-h-11 w-full rounded-md border border-border bg-card px-2 text-base text-foreground" defaultValue={defaultValue ?? ""} max={max} min={min} name={name} type="number" />
    </label>
  );
}

function SummaryText({ defaultValue, label, name }: { defaultValue: string | null; label: string; name: string }) {
  return (
    <label className="block text-sm font-medium">{label}
      <textarea className="mt-1 min-h-20 w-full rounded-md border border-border bg-card p-2 text-base" defaultValue={defaultValue || ""} name={name} />
    </label>
  );
}

function ExerciseSummary({
  defaultOpen,
  exercise,
  index,
}: {
  defaultOpen: boolean;
  exercise: WorkoutExercise;
  index: number;
}) {
  const sets = [...(exercise.workout_sets || [])].sort((a, b) => a.position - b.position);
  const completedSets = sets.filter((set) => set.completed_at).length;
  const isComplete = sets.length > 0 && completedSets === sets.length;
  const firstSet = sets[0];
  const summaryValues = [
    firstSet?.actual_weight_kg ?? firstSet?.planned_weight_kg,
    firstSet?.actual_reps ?? firstSet?.planned_reps,
    firstSet?.actual_duration_min ?? firstSet?.planned_duration_min,
  ];
  const durationSeconds = firstSet?.actual_duration_seconds ?? firstSet?.planned_duration_seconds;
  const distanceM = firstSet?.actual_distance_m ?? firstSet?.planned_distance_m;
  const rpe = firstSet?.actual_rpe ?? firstSet?.planned_rpe;
  const summaryParts = [
    summaryValues[0] != null ? `${Number(summaryValues[0]).toFixed(1)} kg` : null,
    summaryValues[1] != null ? `${summaryValues[1]} 次` : null,
    summaryValues[2] != null ? `${summaryValues[2]} 分` : null,
    durationSeconds != null ? `${durationSeconds} 秒` : null,
    distanceM != null ? `${distanceM} 公尺` : null,
    rpe != null ? `RPE ${rpe}` : null,
  ].filter(Boolean);

  return (
    <details className="group rounded-md border border-border bg-card" open={defaultOpen}>
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-3 [&::-webkit-details-marker]:hidden">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
            isComplete ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
          }`}
        >
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{exercise.name}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {completedSets}/{sets.length} 組{summaryParts.length ? ` · ${summaryParts.join(" / ")}` : ""}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-border px-3 pb-2">
        {sets.length ? (
          sets.map((set) => <WorkoutSetEditor action={updateWorkoutSet} key={set.id} set={set} />)
        ) : (
          <p className="py-3 text-sm text-muted-foreground">尚未設定組數。</p>
        )}
        <details className="border-t border-border py-2">
          <summary className="min-h-9 cursor-pointer py-2 text-xs text-muted-foreground">動作備註</summary>
          <form action={updateWorkoutExerciseNotes} className="grid grid-cols-2 gap-2">
            <input name="id" type="hidden" value={exercise.id} />
            <ExerciseNote defaultValue={exercise.note} label="一般" name="note" />
            <ExerciseNote defaultValue={exercise.pain_note} label="疼痛／舊傷" name="pain_note" />
            <ExerciseNote defaultValue={exercise.fatigue_note} label="疲勞" name="fatigue_note" />
            <ExerciseNote defaultValue={exercise.equipment_note} label="器材限制" name="equipment_note" />
            <button className="col-span-2 min-h-11 rounded-md border border-border bg-card text-sm font-medium" type="submit">儲存動作備註</button>
          </form>
        </details>
      </div>
    </details>
  );
}

function ExerciseNote({ defaultValue, label, name }: { defaultValue: string | null; label: string; name: string }) {
  return (
    <label className="text-xs text-muted-foreground">{label}
      <textarea className="mt-1 min-h-16 w-full rounded-md border border-border bg-card p-2 text-sm text-foreground" defaultValue={defaultValue || ""} name={name} />
    </label>
  );
}
