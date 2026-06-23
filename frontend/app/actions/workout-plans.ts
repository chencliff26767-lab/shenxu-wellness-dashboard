"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const WORKOUT_TYPES = new Set(["strength", "cardio", "running", "tennis", "pilates", "other"]);
const PLAN_STATUSES = new Set(["skipped", "cancelled"]);

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type PlanSetInput = {
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distanceM: number | null;
  rpe: number | null;
  rir: number | null;
  restSeconds: number | null;
};

type PlanExerciseInput = {
  name: string;
  type: string;
  variation: string | null;
  equipment: string | null;
  required: boolean;
  setCount: number;
  note: string | null;
  set: PlanSetInput;
};

type PlanWithExercises = {
  id: string;
  owner_id: string;
  title: string;
  workout_type: string;
  scheduled_date: string;
  scheduled_time: string | null;
  target_duration_minutes: number | null;
  focus_text: string | null;
  preparation_notes: string | null;
  planned_exercises: Array<{
    name: string;
    variation: string | null;
    exercise_type: string;
    equipment: string | null;
    body_part: string | null;
    laterality: string | null;
    multiply_unilateral_volume_by_two: boolean;
    spring_or_resistance: string | null;
    is_required: boolean;
    position: number;
    note: string | null;
    planned_sets: Array<{
      position: number;
      target_weight_kg: number | string | null;
      target_reps: number | null;
      target_duration_seconds: number | null;
      target_distance_m: number | string | null;
      target_rpe: number | null;
      target_rir: number | null;
      rest_seconds: number | null;
      side: string | null;
      note: string | null;
    }>;
  }>;
};

function text(value: FormDataEntryValue | null) {
  const result = String(value ?? "").trim();
  return result || null;
}

function number(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function integer(value: FormDataEntryValue | null) {
  const parsed = number(value);
  return parsed != null && Number.isInteger(parsed) ? parsed : null;
}

function all(formData: FormData, name: string) {
  return formData.getAll(name);
}

function exerciseInputs(formData: FormData): PlanExerciseInput[] {
  const names = all(formData, "exercise_name");
  const types = all(formData, "exercise_type");
  const variations = all(formData, "variation");
  const equipment = all(formData, "equipment");
  const required = all(formData, "is_required");
  const setCounts = all(formData, "set_count");
  const weights = all(formData, "target_weight_kg");
  const reps = all(formData, "target_reps");
  const durations = all(formData, "target_duration_seconds");
  const distances = all(formData, "target_distance_m");
  const rpes = all(formData, "target_rpe");
  const rirs = all(formData, "target_rir");
  const rests = all(formData, "rest_seconds");
  const notes = all(formData, "exercise_note");

  return names
    .map((name, index) => ({
      name: String(name ?? "").trim(),
      type: String(types[index] ?? ""),
      variation: text(variations[index] ?? null),
      equipment: text(equipment[index] ?? null),
      required: String(required[index] ?? "true") === "true",
      setCount: Math.max(1, Math.min(20, integer(setCounts[index] ?? null) || 1)),
      note: text(notes[index] ?? null),
      set: {
        weight: number(weights[index] ?? null),
        reps: integer(reps[index] ?? null),
        durationSeconds: integer(durations[index] ?? null),
        distanceM: number(distances[index] ?? null),
        rpe: integer(rpes[index] ?? null),
        rir: integer(rirs[index] ?? null),
        restSeconds: integer(rests[index] ?? null),
      },
    }))
    .filter((exercise) => exercise.name && WORKOUT_TYPES.has(exercise.type));
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function insertExercises(supabase: SupabaseClient, planId: string, exercises: PlanExerciseInput[]) {
  for (const [index, exercise] of exercises.entries()) {
    const { data, error } = await supabase
      .from("planned_exercises")
      .insert({
        workout_plan_id: planId,
        position: index + 1,
        name: exercise.name,
        variation: exercise.variation,
        exercise_type: exercise.type,
        equipment: exercise.equipment,
        is_required: exercise.required,
        note: exercise.note,
      })
      .select("id")
      .single();

    if (error || !data) throw new Error(error?.message || "exercise-insert-failed");

    const rows = Array.from({ length: exercise.setCount }, (_, setIndex) => ({
      planned_exercise_id: data.id,
      position: setIndex + 1,
      target_weight_kg: exercise.set.weight,
      target_reps: exercise.set.reps,
      target_duration_seconds: exercise.set.durationSeconds,
      target_distance_m: exercise.set.distanceM,
      target_rpe: exercise.set.rpe,
      target_rir: exercise.set.rir,
      rest_seconds: exercise.set.restSeconds,
    }));
    const { error: setError } = await supabase.from("planned_sets").insert(rows);
    if (setError) throw new Error(setError.message);
  }
}

async function findActiveDuplicatePlan(
  supabase: SupabaseClient,
  {
    excludeId,
    ownerId,
    scheduledDate,
    scheduledTime,
    title,
    workoutType,
  }: {
    excludeId?: string;
    ownerId: string;
    scheduledDate: string;
    scheduledTime: string | null;
    title: string;
    workoutType: string;
  },
) {
  let query = supabase
    .from("workout_plans")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("scheduled_date", scheduledDate)
    .eq("title", title)
    .eq("workout_type", workoutType)
    .in("status", ["planned", "in_progress"])
    .order("created_at", { ascending: true })
    .limit(1);

  query = scheduledTime ? query.eq("scheduled_time", scheduledTime) : query.is("scheduled_time", null);
  if (excludeId) query = query.neq("id", excludeId);

  const { data } = await query.maybeSingle();
  return data?.id || null;
}

export async function createWorkoutPlan(formData: FormData) {
  const { supabase, user } = await requireUser();
  const title = text(formData.get("title"));
  const workoutType = String(formData.get("workout_type") ?? "");
  const scheduledDate = text(formData.get("scheduled_date"));
  const exercises = exerciseInputs(formData);

  if (!title || !scheduledDate || !WORKOUT_TYPES.has(workoutType) || exercises.length === 0) {
    redirect("/plans/new?error=invalid");
  }

  const ownerId = text(formData.get("owner_id")) || user.id;
  const scheduledTime = text(formData.get("scheduled_time"));
  const duplicateId = await findActiveDuplicatePlan(supabase, {
    ownerId,
    scheduledDate,
    scheduledTime,
    title,
    workoutType,
  });
  if (duplicateId) {
    revalidatePath("/plans");
    revalidatePath("/today");
    redirect(`/plans?day=${scheduledDate}&saved=1`);
  }

  const { data, error } = await supabase
    .from("workout_plans")
    .insert({
      owner_id: ownerId,
      created_by: user.id,
      title,
      workout_type: workoutType,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      target_duration_minutes: integer(formData.get("target_duration_minutes")),
      focus_text: text(formData.get("focus_text")),
      preparation_notes: text(formData.get("preparation_notes")),
    })
    .select("id")
    .single();

  if (error || !data) redirect(`/plans/new?error=${encodeURIComponent(error?.message || "insert-failed")}`);

  const concurrentDuplicateId = await findActiveDuplicatePlan(supabase, {
    excludeId: data.id,
    ownerId,
    scheduledDate,
    scheduledTime,
    title,
    workoutType,
  });
  if (concurrentDuplicateId) {
    await supabase.from("workout_plans").delete().eq("id", data.id);
    revalidatePath("/plans");
    revalidatePath("/today");
    redirect(`/plans?day=${scheduledDate}&saved=1`);
  }

  try {
    // ponytail: child inserts are compensated by deleting the parent — ceiling: not a true transaction — upgrade: create_plan RPC.
    await insertExercises(supabase, data.id, exercises);
  } catch (caught) {
    await supabase.from("workout_plans").delete().eq("id", data.id);
    redirect(`/plans/new?error=${encodeURIComponent(caught instanceof Error ? caught.message : "child-insert-failed")}`);
  }

  revalidatePath("/plans");
  revalidatePath("/today");
  redirect(`/plans?day=${scheduledDate}&saved=1`);
}

async function getPlan(supabase: SupabaseClient, id: string): Promise<PlanWithExercises | null> {
  const { data } = await supabase
    .from("workout_plans")
    .select(
      "id, owner_id, title, workout_type, scheduled_date, scheduled_time, target_duration_minutes, focus_text, preparation_notes, planned_exercises(name, variation, exercise_type, equipment, body_part, laterality, multiply_unilateral_volume_by_two, spring_or_resistance, is_required, position, note, planned_sets(position, target_weight_kg, target_reps, target_duration_seconds, target_distance_m, target_rpe, target_rir, rest_seconds, side, note))",
    )
    .eq("id", id)
    .single();
  return (data as PlanWithExercises | null) || null;
}

async function clonePlanToDate(supabase: SupabaseClient, userId: string, source: PlanWithExercises, targetDate: string) {
  const duplicateId = await findActiveDuplicatePlan(supabase, {
    ownerId: source.owner_id,
    scheduledDate: targetDate,
    scheduledTime: source.scheduled_time,
    title: source.title,
    workoutType: source.workout_type,
  });
  if (duplicateId) return;

  const { data, error } = await supabase
    .from("workout_plans")
    .insert({
      owner_id: source.owner_id,
      created_by: userId,
      title: source.title,
      workout_type: source.workout_type,
      scheduled_date: targetDate,
      scheduled_time: source.scheduled_time,
      target_duration_minutes: source.target_duration_minutes,
      focus_text: source.focus_text,
      preparation_notes: source.preparation_notes,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message || "clone-insert-failed");

  try {
    for (const exercise of [...source.planned_exercises].sort((a, b) => a.position - b.position)) {
      const { data: clonedExercise, error: exerciseError } = await supabase
        .from("planned_exercises")
        .insert({
          workout_plan_id: data.id,
          position: exercise.position,
          name: exercise.name,
          variation: exercise.variation,
          exercise_type: exercise.exercise_type,
          equipment: exercise.equipment,
          body_part: exercise.body_part,
          laterality: exercise.laterality,
          multiply_unilateral_volume_by_two: exercise.multiply_unilateral_volume_by_two,
          spring_or_resistance: exercise.spring_or_resistance,
          is_required: exercise.is_required,
          note: exercise.note,
        })
        .select("id")
        .single();
      if (exerciseError || !clonedExercise) throw new Error(exerciseError?.message || "clone-exercise-failed");
      const sets = [...exercise.planned_sets].sort((a, b) => a.position - b.position).map((set) => ({
        planned_exercise_id: clonedExercise.id,
        position: set.position,
        target_weight_kg: set.target_weight_kg,
        target_reps: set.target_reps,
        target_duration_seconds: set.target_duration_seconds,
        target_distance_m: set.target_distance_m,
        target_rpe: set.target_rpe,
        target_rir: set.target_rir,
        rest_seconds: set.rest_seconds,
        side: set.side,
        note: set.note,
      }));
      if (sets.length) {
        const { error: setError } = await supabase.from("planned_sets").insert(sets);
        if (setError) throw new Error(setError.message);
      }
    }
  } catch (caught) {
    await supabase.from("workout_plans").delete().eq("id", data.id);
    throw caught;
  }
}

export async function cloneWorkoutPlan(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = text(formData.get("id"));
  const targetDate = text(formData.get("target_date"));
  if (!id || !targetDate) redirect("/plans?error=invalid-clone");
  const source = await getPlan(supabase, id);
  if (!source) redirect("/plans?error=plan-not-found");
  try {
    await clonePlanToDate(supabase, user.id, source, targetDate);
  } catch (caught) {
    redirect(`/plans?error=${encodeURIComponent(caught instanceof Error ? caught.message : "clone-failed")}`);
  }
  revalidatePath("/plans");
  revalidatePath("/today");
  redirect(`/plans?day=${targetDate}&cloned=1`);
}

export async function clonePreviousWeek(formData: FormData) {
  const { supabase, user } = await requireUser();
  const weekStart = text(formData.get("week_start"));
  const ownerId = text(formData.get("owner_id")) || user.id;
  if (!weekStart) redirect("/plans?error=invalid-week");
  const start = addDays(weekStart, -7);
  const end = addDays(weekStart, -1);
  const { data } = await supabase
    .from("workout_plans")
    .select("id, scheduled_date")
    .gte("scheduled_date", start)
    .lte("scheduled_date", end)
    .eq("owner_id", ownerId)
    .order("scheduled_date");

  for (const row of data || []) {
    const source = await getPlan(supabase, row.id);
    if (!source) continue;
    const targetDate = addDays(row.scheduled_date, 7);
    const { count } = await supabase
      .from("workout_plans")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", source.owner_id)
      .eq("scheduled_date", targetDate)
      .eq("title", source.title);
    if (!count) await clonePlanToDate(supabase, user.id, source, targetDate);
  }
  revalidatePath("/plans");
  revalidatePath("/today");
  redirect(`/plans?week=${weekStart}&cloned=1`);
}

export async function rescheduleWorkoutPlan(formData: FormData) {
  const { supabase } = await requireUser();
  const id = text(formData.get("id"));
  const scheduledDate = text(formData.get("scheduled_date"));
  if (!id || !scheduledDate) redirect("/plans?error=invalid-reschedule");
  const { data } = await supabase.from("workout_plans").select("reschedule_count").eq("id", id).single();
  if (!data) redirect("/plans?error=plan-not-found");
  const { error } = await supabase
    .from("workout_plans")
    .update({
      scheduled_date: scheduledDate,
      reschedule_count: data.reschedule_count + 1,
      last_rescheduled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) redirect(`/plans?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/plans");
  revalidatePath("/today");
  redirect(`/plans?day=${scheduledDate}&updated=1`);
}

export async function updateWorkoutPlanStatus(formData: FormData) {
  const { supabase } = await requireUser();
  const id = text(formData.get("id"));
  const status = String(formData.get("status") ?? "");
  const returnDate = text(formData.get("return_date"));
  if (!id || !PLAN_STATUSES.has(status)) redirect("/plans?error=invalid-status");
  const { error } = await supabase
    .from("workout_plans")
    .update({
      status,
      skipped_reason: status === "skipped" ? text(formData.get("reason")) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) redirect(`/plans?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/plans");
  revalidatePath("/today");
  redirect(`/plans?updated=1${returnDate ? `&day=${returnDate}` : ""}`);
}

export async function startWorkoutPlan(formData: FormData) {
  const { supabase } = await requireUser();
  const id = text(formData.get("id"));
  if (!id) redirect("/plans?error=missing-plan-id");

  const { data, error } = await supabase.rpc("start_workout_plan", { target_plan_id: id });
  if (error || !data) {
    redirect(`/plans?error=${encodeURIComponent(error?.message || "start-workout-failed")}`);
  }

  revalidatePath("/plans");
  revalidatePath("/workouts");
  revalidatePath("/today");
  redirect(`/workouts?session=${data}&started=1`);
}

async function getOrStartWorkoutSession(supabase: SupabaseClient, planId: string) {
  const { data: existing } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("workout_plan_id", planId)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  const { data, error } = await supabase.rpc("start_workout_plan", { target_plan_id: planId });
  if (error || !data) {
    throw new Error(error?.message || "start-workout-failed");
  }

  return data as string;
}

async function workoutSetIds(supabase: SupabaseClient, sessionId: string) {
  const { data: exercises, error } = await supabase
    .from("workout_exercises")
    .select("id")
    .eq("session_id", sessionId);

  if (error) {
    throw new Error(error.message);
  }

  const exerciseIds = (exercises || []).map((exercise) => exercise.id);
  if (!exerciseIds.length) {
    return [];
  }

  const { data: sets, error: setError } = await supabase
    .from("workout_sets")
    .select("id, completed_at")
    .in("exercise_id", exerciseIds);

  if (setError) {
    throw new Error(setError.message);
  }

  return sets || [];
}

async function syncPlanProgress(supabase: SupabaseClient, sessionId: string, planId: string) {
  const sets = await workoutSetIds(supabase, sessionId);
  const completedSets = sets.filter((set) => set.completed_at).length;
  const now = new Date().toISOString();
  const status = sets.length > 0 && completedSets === sets.length ? "completed" : completedSets > 0 ? "partial" : "in_progress";
  const completedAt = status === "completed" ? now : null;

  const { error: sessionError } = await supabase
    .from("workout_sessions")
    .update({
      status,
      completed_at: completedAt,
      paused_at: null,
      updated_at: now,
    })
    .eq("id", sessionId);

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const { error: planError } = await supabase
    .from("workout_plans")
    .update({
      status,
      completed_at: completedAt,
      updated_at: now,
    })
    .eq("id", planId);

  if (planError) {
    throw new Error(planError.message);
  }
}

export async function quickCompleteWorkoutPlan(formData: FormData) {
  const { supabase } = await requireUser();
  const planId = text(formData.get("id"));
  if (!planId) redirect("/today?error=missing-plan-id");
  const overallRpe = integer(formData.get("overall_rpe"));
  const painScore = integer(formData.get("pain_score"));
  if ((overallRpe != null && (overallRpe < 1 || overallRpe > 10)) || (painScore != null && painScore > 10)) {
    redirect("/today?error=invalid-feedback");
  }

  try {
    const sessionId = await getOrStartWorkoutSession(supabase, planId);
    const sets = await workoutSetIds(supabase, sessionId);
    const now = new Date().toISOString();
    if (sets.length) {
      const { error: setError } = await supabase
        .from("workout_sets")
        .update({ completed_at: now })
        .in("id", sets.map((set) => set.id));
      if (setError) throw new Error(setError.message);
    }

    const { error: summaryError } = await supabase
      .from("workout_sessions")
      .update({
        overall_rpe: overallRpe,
        pain_score: painScore,
        note: text(formData.get("note")),
        pain_note: text(formData.get("pain_note")),
        updated_at: now,
      })
      .eq("id", sessionId);
    if (summaryError) throw new Error(summaryError.message);

    await syncPlanProgress(supabase, sessionId, planId);
  } catch (caught) {
    redirect(`/today?error=${encodeURIComponent(caught instanceof Error ? caught.message : "quick-complete-failed")}`);
  }

  revalidatePath("/today");
  revalidatePath("/plans");
  revalidatePath("/workouts");
}

export async function quickToggleWorkoutSet(formData: FormData) {
  const { supabase } = await requireUser();
  const planId = text(formData.get("plan_id"));
  const setId = text(formData.get("set_id"));
  const plannedSetId = text(formData.get("planned_set_id"));
  const completed = String(formData.get("completed")) === "true";
  if (!planId || (!setId && !plannedSetId)) redirect("/today?error=missing-set-id");

  try {
    const sessionId = await getOrStartWorkoutSession(supabase, planId);
    let targetSetId = setId;

    if (!targetSetId && plannedSetId) {
      const { data, error } = await supabase
        .from("workout_sets")
        .select("id")
        .eq("planned_set_id", plannedSetId)
        .single();
      if (error || !data) throw new Error(error?.message || "set-not-found");
      targetSetId = data.id;
    }

    const { error } = await supabase
      .from("workout_sets")
      .update({ completed_at: completed ? new Date().toISOString() : null })
      .eq("id", targetSetId);
    if (error) throw new Error(error.message);

    await syncPlanProgress(supabase, sessionId, planId);
  } catch (caught) {
    redirect(`/today?error=${encodeURIComponent(caught instanceof Error ? caught.message : "toggle-set-failed")}`);
  }

  revalidatePath("/today");
  revalidatePath("/plans");
  revalidatePath("/workouts");
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
