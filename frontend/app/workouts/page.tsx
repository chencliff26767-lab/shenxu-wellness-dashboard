import { CalendarClock, Dumbbell, Edit3, Trash2 } from "lucide-react";
import { createWorkout, deleteWorkout, updateWorkout } from "@/app/actions/workouts";
import { BottomNav } from "@/components/bottom-nav";
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
  }>;
};

const statusLabels: Record<string, string> = {
  planned: "已安排",
  completed: "已完成",
  skipped: "已略過",
  draft: "草稿",
};

const typeLabels: Record<string, string> = {
  strength: "重訓",
  cardio: "有氧",
  running: "跑步",
  tennis: "網球",
  pilates: "皮拉提斯",
  other: "其他",
};

export default async function WorkoutsPage({ searchParams }: WorkoutsPageProps) {
  const params = await searchParams;
  const workouts = await getWorkouts();

  return (
    <main className="min-h-dvh pb-[calc(88px+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-md px-5 pt-[calc(24px+env(safe-area-inset-top))]">
        <p className="text-sm text-muted-foreground">計畫 / 紀錄</p>
        <h1 className="mt-1 text-3xl font-semibold">訓練</h1>

        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Dumbbell aria-hidden="true" className="h-4 w-4" />
            記錄現在或安排訓練
          </div>

          {params?.saved ? <p className="mb-3 rounded-md bg-muted p-3 text-sm text-muted-foreground">已儲存。</p> : null}
          {params?.updated ? <p className="mb-3 rounded-md bg-muted p-3 text-sm text-muted-foreground">已更新。</p> : null}
          {params?.error ? (
            <p className="mb-3 rounded-md bg-muted p-3 text-sm text-muted-foreground">儲存失敗：{params.error}</p>
          ) : null}

          <WorkoutForm action={createWorkout} submitLabel="儲存訓練" />
        </section>

        <section className="mt-4 space-y-3">
          <h2 className="text-xl font-semibold">最近訓練</h2>
          {workouts.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-5 text-muted-foreground">還沒有訓練紀錄。</div>
          ) : (
            workouts.map((workout) => <WorkoutCard key={workout.id} workout={workout} />)
          )}
        </section>
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
      "id, scheduled_at, status, title, session_type, note, pain_note, workout_exercises(id, position, exercise_type, name, note, pain_note, workout_sets(id, position, planned_weight_kg, actual_weight_kg, planned_reps, actual_reps, planned_duration_min, actual_duration_min, planned_intensity, actual_intensity, note))",
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
            {statusLabels[workout.status] || workout.status} · {typeLabels[workout.session_type] || workout.session_type}
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

      <div className="mt-3 space-y-2">
        {exercises.map((exercise) => (
          <ExerciseSummary exercise={exercise} key={exercise.id} />
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

function ExerciseSummary({ exercise }: { exercise: WorkoutExercise }) {
  const sets = [...(exercise.workout_sets || [])].sort((a, b) => a.position - b.position);
  const firstSet = sets[0];
  const weight = firstSet?.actual_weight_kg ?? firstSet?.planned_weight_kg;
  const reps = firstSet?.actual_reps ?? firstSet?.planned_reps;
  const duration = firstSet?.actual_duration_min ?? firstSet?.planned_duration_min;
  const intensity = firstSet?.actual_intensity ?? firstSet?.planned_intensity;
  const parts = [
    sets.length ? `${sets.length} 組` : null,
    weight != null ? `${Number(weight).toFixed(1)} kg` : null,
    reps != null ? `${reps} 次` : null,
    duration != null ? `${duration} 分` : null,
    intensity != null ? `強度 ${Number(intensity).toFixed(1)}` : null,
  ].filter(Boolean);

  return (
    <div className="rounded-md bg-muted p-3 text-sm">
      <p className="font-medium">{exercise.name}</p>
      <p className="mt-1 text-muted-foreground">{parts.length ? parts.join(" / ") : typeLabels[exercise.exercise_type]}</p>
      {exercise.pain_note ? <p className="mt-1 text-muted-foreground">疼痛：{exercise.pain_note}</p> : null}
      {exercise.note ? <p className="mt-1 text-muted-foreground">{exercise.note}</p> : null}
    </div>
  );
}
