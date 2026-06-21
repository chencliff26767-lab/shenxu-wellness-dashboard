import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type Row = Record<string, unknown>;

export type ExportBundle = {
  schema_version: 1;
  exported_at: string;
  owner_id: string;
  profile: Row[];
  body_metrics: Row[];
  meal_entries: Row[];
  workout_plans: Row[];
  planned_exercises: Row[];
  planned_sets: Row[];
  workout_sessions: Row[];
  workout_exercises: Row[];
  workout_sets: Row[];
  weekly_goals: Row[];
  coach_feedback: Row[];
  coach_relationships: Row[];
};

export const csvDatasets = [
  "body_metrics",
  "meal_entries",
  "workout_plans",
  "planned_exercises",
  "planned_sets",
  "workout_sessions",
  "workout_exercises",
  "workout_sets",
  "weekly_goals",
  "coach_feedback",
] as const;

export type CsvDataset = (typeof csvDatasets)[number];

export async function exportOwnerData(supabase: SupabaseClient, ownerId: string): Promise<ExportBundle> {
  // ponytail: each table uses Supabase's 1,000-row response cap — ceiling: large long-term journals — upgrade: paginate and stream each dataset.
  const [profile, body, meals, plans, sessions, goals, feedback, relationships] = await Promise.all([
    supabase.from("app_owners").select("user_id, display_name, created_at").eq("user_id", ownerId),
    supabase.from("body_metrics").select("*").eq("owner_id", ownerId).order("measured_on"),
    supabase.from("meal_entries").select("*").eq("owner_id", ownerId).order("eaten_on"),
    supabase.from("workout_plans").select("*").eq("owner_id", ownerId).order("scheduled_date"),
    supabase.from("workout_sessions").select("*").eq("owner_id", ownerId).order("scheduled_at"),
    supabase.from("weekly_goals").select("*").eq("owner_id", ownerId).order("week_start"),
    supabase.from("coach_feedback").select("*").eq("owner_id", ownerId).order("created_at"),
    supabase.from("coach_relationships").select("id, owner_id, coach_id, status, manage_plans, invited_email, accepted_at, revoked_at, created_at, updated_at").eq("owner_id", ownerId),
  ]);
  const baseResults = [profile, body, meals, plans, sessions, goals, feedback, relationships];
  const baseError = baseResults.find((result) => result.error)?.error;
  if (baseError) throw baseError;

  const planIds = (plans.data || []).map((row) => row.id);
  const sessionIds = (sessions.data || []).map((row) => row.id);
  const plannedExercises = planIds.length
    ? await supabase.from("planned_exercises").select("*").in("workout_plan_id", planIds).order("position")
    : { data: [], error: null };
  const workoutExercises = sessionIds.length
    ? await supabase.from("workout_exercises").select("*").in("session_id", sessionIds).order("position")
    : { data: [], error: null };
  if (plannedExercises.error) throw plannedExercises.error;
  if (workoutExercises.error) throw workoutExercises.error;

  const plannedExerciseIds = (plannedExercises.data || []).map((row) => row.id);
  const workoutExerciseIds = (workoutExercises.data || []).map((row) => row.id);
  const [plannedSets, workoutSets] = await Promise.all([
    plannedExerciseIds.length
      ? supabase.from("planned_sets").select("*").in("planned_exercise_id", plannedExerciseIds).order("position")
      : Promise.resolve({ data: [], error: null }),
    workoutExerciseIds.length
      ? supabase.from("workout_sets").select("*").in("exercise_id", workoutExerciseIds).order("position")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (plannedSets.error) throw plannedSets.error;
  if (workoutSets.error) throw workoutSets.error;

  return {
    schema_version: 1,
    exported_at: new Date().toISOString(),
    owner_id: ownerId,
    profile: asRows(profile.data),
    body_metrics: asRows(body.data),
    meal_entries: asRows(meals.data),
    workout_plans: asRows(plans.data),
    planned_exercises: asRows(plannedExercises.data),
    planned_sets: asRows(plannedSets.data),
    workout_sessions: asRows(sessions.data),
    workout_exercises: asRows(workoutExercises.data),
    workout_sets: asRows(workoutSets.data),
    weekly_goals: asRows(goals.data),
    coach_feedback: asRows(feedback.data),
    coach_relationships: asRows(relationships.data),
  };
}

export function toCsv(rows: Row[]) {
  if (!rows.length) return "\uFEFF";
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(headers.map((header) => csvCell(row[header])).join(","));
  return `\uFEFF${lines.join("\r\n")}`;
}

function csvCell(value: unknown) {
  if (value == null) return '""';
  let output = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/^[=+\-@]/.test(output)) output = `'${output}`;
  return `"${output.replaceAll('"', '""')}"`;
}

function asRows(value: unknown[] | null) {
  return (value || []) as Row[];
}
