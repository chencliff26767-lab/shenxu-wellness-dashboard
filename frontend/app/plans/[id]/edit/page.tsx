import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { updateWorkoutPlan } from "@/app/actions/workout-plans";
import { BottomNav } from "@/components/bottom-nav";
import {
  WorkoutPlanWizard,
  type WorkoutPlanWizardInitialExercise,
  type WorkoutPlanWizardInitialPlan,
} from "@/components/workout-plan-wizard";
import { createClient } from "@/lib/supabase/server";

type EditPlanPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

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
  exercise_type: string;
  equipment: string | null;
  is_required: boolean;
  note: string | null;
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
  locked_at: string | null;
  focus_text: string | null;
  preparation_notes: string | null;
  planned_exercises: PlannedExercise[];
};

export default async function EditPlanPage({ params, searchParams }: EditPlanPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("workout_plans")
    .select(
      "id, owner_id, title, workout_type, scheduled_date, scheduled_time, target_duration_minutes, status, locked_at, focus_text, preparation_notes, planned_exercises(id, position, name, variation, exercise_type, equipment, is_required, note, planned_sets(id, position, target_weight_kg, target_reps, target_duration_seconds, target_distance_m, target_rpe, target_rir, rest_seconds))",
    )
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  const plan = data as WorkoutPlan;
  const editable = plan.status === "planned" && !plan.locked_at;
  const backHref = `/plans?day=${plan.scheduled_date}`;

  return (
    <main className="min-h-dvh pb-[calc(88px+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-md px-5 pt-[calc(24px+env(safe-area-inset-top))]">
        <Link className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground" href={backHref}>
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          返回計畫
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">更新計畫</h1>
        {query?.error ? <p className="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">更新失敗：{query.error}</p> : null}
        {!editable ? (
          <div className="mt-6 rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
            這個計畫已開始或已鎖定，無法再編輯。請回到計畫列表查看或建立新的計畫。
          </div>
        ) : (
          <div className="mt-6">
            <WorkoutPlanWizard
              action={updateWorkoutPlan}
              initialDate={plan.scheduled_date}
              initialExercises={initialExercises(plan)}
              initialPlan={initialPlan(plan)}
              ownerId={plan.owner_id}
              pendingLabel="更新中..."
              planId={plan.id}
              submitLabel="更新計畫"
            />
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}

function initialPlan(plan: WorkoutPlan): WorkoutPlanWizardInitialPlan {
  return {
    title: plan.title,
    workoutType: plan.workout_type,
    scheduledDate: plan.scheduled_date,
    scheduledTime: plan.scheduled_time?.slice(0, 5) ?? "",
    durationMinutes: value(plan.target_duration_minutes),
    focus: plan.focus_text ?? "",
    preparation: plan.preparation_notes ?? "",
  };
}

function initialExercises(plan: WorkoutPlan): WorkoutPlanWizardInitialExercise[] {
  return [...(plan.planned_exercises || [])]
    .sort((a, b) => a.position - b.position)
    .map((exercise) => {
      const sets = [...(exercise.planned_sets || [])].sort((a, b) => a.position - b.position);
      // ponytail: the wizard edits one shared target per exercise. Upgrade path: add per-set target editing when plans need varied set targets.
      const firstSet = sets[0];
      return {
        key: exercise.id,
        name: exercise.name,
        type: exercise.exercise_type,
        variation: exercise.variation ?? "",
        equipment: exercise.equipment ?? "",
        required: exercise.is_required,
        setCount: String(Math.max(1, sets.length)),
        weight: value(firstSet?.target_weight_kg),
        reps: value(firstSet?.target_reps),
        durationSeconds: value(firstSet?.target_duration_seconds),
        distanceM: value(firstSet?.target_distance_m),
        rpe: value(firstSet?.target_rpe),
        rir: value(firstSet?.target_rir),
        restSeconds: value(firstSet?.rest_seconds),
        note: exercise.note ?? "",
      };
    });
}

function value(input: number | string | null | undefined) {
  return input == null ? "" : String(input);
}
