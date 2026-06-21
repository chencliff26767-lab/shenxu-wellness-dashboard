"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const SESSION_STATUSES = new Set(["planned", "completed", "skipped", "draft"]);
const WORKOUT_TYPES = new Set(["strength", "cardio", "running", "tennis", "pilates", "other"]);

function asOptionalText(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text || null;
}

function asNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function asInteger(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function values(formData: FormData, name: string) {
  return formData.getAll(name);
}

function sessionPayload(formData: FormData, userId: string) {
  const status = String(formData.get("status") || "");
  const sessionType = String(formData.get("session_type") || "");
  const scheduledAt = String(formData.get("scheduled_at") || "").trim();
  const title = String(formData.get("title") || "").trim();

  if (!SESSION_STATUSES.has(status) || !WORKOUT_TYPES.has(sessionType) || !scheduledAt || !title) {
    redirect("/workouts?error=invalid");
  }

  return {
    owner_id: userId,
    scheduled_at: scheduledAt,
    status,
    title,
    session_type: sessionType,
    note: asOptionalText(formData.get("note")),
    pain_note: asOptionalText(formData.get("pain_note")),
  };
}

function exerciseInputs(formData: FormData) {
  const names = values(formData, "exercise_name");
  const types = values(formData, "exercise_type");
  const setCounts = values(formData, "set_count");
  const weights = values(formData, "weight_kg");
  const reps = values(formData, "reps");
  const durations = values(formData, "duration_min");
  const intensities = values(formData, "intensity");
  const notes = values(formData, "exercise_note");
  const painNotes = values(formData, "exercise_pain_note");

  return names
    .map((name, index) => ({
      name: String(name || "").trim(),
      type: String(types[index] || "").trim(),
      setCount: Math.max(1, Math.min(20, asInteger(setCounts[index]) || 1)),
      weight: asNumber(weights[index]),
      reps: asInteger(reps[index]),
      duration: asInteger(durations[index]),
      intensity: asNumber(intensities[index]),
      note: asOptionalText(notes[index] || null),
      painNote: asOptionalText(painNotes[index] || null),
    }))
    .filter((exercise) => exercise.name && WORKOUT_TYPES.has(exercise.type));
}

async function replaceExercises(sessionId: string, status: string, formData: FormData) {
  const supabase = await createClient();
  const exercises = exerciseInputs(formData);

  // ponytail: replacing child rows is the shortest reliable edit path — ceiling: loses per-set audit history — upgrade: diff rows by stable ids.
  await supabase.from("workout_exercises").delete().eq("session_id", sessionId);

  for (const [index, exercise] of exercises.entries()) {
    const { data, error } = await supabase
      .from("workout_exercises")
      .insert({
        session_id: sessionId,
        position: index + 1,
        exercise_type: exercise.type,
        name: exercise.name,
        note: exercise.note,
        pain_note: exercise.painNote,
      })
      .select("id")
      .single();

    if (error || !data) {
      redirect(`/workouts?error=${encodeURIComponent(error?.message || "exercise-insert-failed")}`);
    }

    const rows = Array.from({ length: exercise.setCount }, (_, setIndex) => ({
      exercise_id: data.id,
      position: setIndex + 1,
      planned_weight_kg: status === "planned" ? exercise.weight : null,
      actual_weight_kg: status !== "planned" ? exercise.weight : null,
      planned_reps: status === "planned" ? exercise.reps : null,
      actual_reps: status !== "planned" ? exercise.reps : null,
      planned_duration_min: status === "planned" ? exercise.duration : null,
      actual_duration_min: status !== "planned" ? exercise.duration : null,
      planned_intensity: status === "planned" ? exercise.intensity : null,
      actual_intensity: status !== "planned" ? exercise.intensity : null,
      note: exercise.note,
    }));

    const { error: setError } = await supabase.from("workout_sets").insert(rows);
    if (setError) {
      redirect(`/workouts?error=${encodeURIComponent(setError.message)}`);
    }
  }
}

export async function createWorkout(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const payload = sessionPayload(formData, user.id);
  const { data, error } = await supabase.from("workout_sessions").insert(payload).select("id").single();

  if (error || !data) {
    redirect(`/workouts?error=${encodeURIComponent(error?.message || "insert-failed")}`);
  }

  await replaceExercises(data.id, payload.status, formData);
  revalidatePath("/workouts");
  redirect("/workouts?saved=1");
}

export async function updateWorkout(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const id = String(formData.get("id") || "");
  if (!id) {
    redirect("/workouts?error=missing-id");
  }

  const payload = sessionPayload(formData, user.id);
  const { error } = await supabase.from("workout_sessions").update(payload).eq("id", id);

  if (error) {
    redirect(`/workouts?error=${encodeURIComponent(error.message)}`);
  }

  await replaceExercises(id, payload.status, formData);
  revalidatePath("/workouts");
  redirect("/workouts?updated=1");
}

export async function deleteWorkout(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") || "");

  if (!id) {
    redirect("/workouts?error=missing-id");
  }

  const { error } = await supabase.from("workout_sessions").delete().eq("id", id);
  if (error) {
    redirect(`/workouts?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/workouts");
}

export async function updateWorkoutSet(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const id = String(formData.get("id") || "");
  if (!id) {
    redirect("/workouts?error=missing-set-id");
  }

  const intensity = asNumber(formData.get("actual_intensity"));
  if (intensity != null && intensity > 10) {
    redirect("/workouts?error=invalid-set-intensity");
  }

  const { error } = await supabase
    .from("workout_sets")
    .update({
      actual_weight_kg: asNumber(formData.get("actual_weight_kg")),
      actual_reps: asInteger(formData.get("actual_reps")),
      actual_duration_min: asInteger(formData.get("actual_duration_min")),
      actual_intensity: intensity,
      completed_at: formData.has("completed") ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) {
    redirect(`/workouts?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/workouts");
}
