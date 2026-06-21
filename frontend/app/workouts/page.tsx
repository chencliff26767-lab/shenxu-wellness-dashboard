import { CalendarClock, ChevronDown, Edit3, Plus, Trash2 } from "lucide-react";
import { createWorkout, deleteWorkout, updateWorkout, updateWorkoutSet } from "@/app/actions/workouts";
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
  planned_intensity: number | string | null;
  actual_intensity: number | string | null;
  note: string | null;
  completed_at: string | null;
};

type WorkoutExercise = {
  id: string;
  position: number;
  exercise_type: string;
  name: string;
  note: string | null;
  pain_note: string | null;
  workout_sets: WorkoutSet[];
};

type WorkoutSession = {
  id: string;
  scheduled_at: string;
  status: string;
  title: string;
  session_type: string;
  note: string | null;
  pain_note: string | null;
  workout_exercises: WorkoutExercise[];
};

type WorkoutsPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
    updated?: string;
    setUpdated?: string;
  }>;
};

const statusLabels: Record<string, string> = {
  planned: "已安排",
  completed: "已完成",
  skipped: "已略過",
  draft: "草稿",
};

export default async function WorkoutsPage({ searchParams }: WorkoutsPageProps) {
  const params = await searchParams;
  const workouts = await getWorkouts();
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(new Date());
  const todayWorkouts = workouts.filter((workout) => workout.scheduled_at.slice(0, 10) === today);
  const recentWorkouts = workouts.filter((workout) => workout.scheduled_at.slice(0, 10) !== today);

  return (
    <main className="min-h-dvh pb-[calc(88px+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-md px-5 pt-[calc(24px+env(safe-area-inset-top))]">
        <p className="text-sm text-muted-foreground">計畫 / 紀錄</p>
        <h1 className="mt-1 text-3xl font-semibold">訓練</h1>

        {params?.saved || params?.updated || params?.setUpdated ? (
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
      "id, scheduled_at, status, title, session_type, note, pain_note, workout_exercises(id, position, exercise_type, name, note, pain_note, workout_sets(id, position, planned_weight_kg, actual_weight_kg, planned_reps, actual_reps, planned_duration_min, actual_duration_min, planned_intensity, actual_intensity, note, completed_at))",
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

      {workout.pain_note ? <p className="mt-3 text-sm leading-6 text-muted-foreground">疼痛 / 舊傷：{workout.pain_note}</p> : null}
      {workout.note ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{workout.note}</p> : null}

      <details className="mt-3 rounded-md border border-border p-3">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground">
          <Edit3 aria-hidden="true" className="h-4 w-4" />
          編輯
        </summary>
        <div className="mt-3">
          <WorkoutForm action={updateWorkout} session={workout} submitLabel="更新訓練" />
        </div>
      </details>
    </article>
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
  const summaryParts = [
    summaryValues[0] != null ? `${Number(summaryValues[0]).toFixed(1)} kg` : null,
    summaryValues[1] != null ? `${summaryValues[1]} 次` : null,
    summaryValues[2] != null ? `${summaryValues[2]} 分` : null,
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
        {exercise.pain_note ? <p className="pb-2 text-sm text-muted-foreground">疼痛：{exercise.pain_note}</p> : null}
        {exercise.note ? <p className="pb-2 text-sm text-muted-foreground">{exercise.note}</p> : null}
      </div>
    </details>
  );
}
