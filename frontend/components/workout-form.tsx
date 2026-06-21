"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type WorkoutSet = {
  planned_weight_kg: number | string | null;
  actual_weight_kg: number | string | null;
  planned_reps: number | null;
  actual_reps: number | null;
  planned_duration_min: number | null;
  actual_duration_min: number | null;
  planned_intensity: number | string | null;
  actual_intensity: number | string | null;
};

type WorkoutExercise = {
  id: string;
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

type ExerciseFormState = {
  key: string;
  exercise_type: string;
  name: string;
  set_count: string;
  weight_kg: string;
  reps: string;
  duration_min: string;
  intensity: string;
  exercise_note: string;
  exercise_pain_note: string;
};

type WorkoutFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  session?: WorkoutSession;
  submitLabel: string;
};

const typeOptions = [
  ["strength", "重訓"],
  ["cardio", "有氧"],
  ["running", "跑步"],
  ["tennis", "網球"],
  ["pilates", "皮拉提斯"],
  ["other", "其他"],
];

export function WorkoutForm({ action, session, submitLabel }: WorkoutFormProps) {
  const [exercises, setExercises] = useState<ExerciseFormState[]>(() => initialExercises(session));

  function addExercise() {
    setExercises((current) => [...current, blankExercise()]);
  }

  function removeExercise(key: string) {
    setExercises((current) => (current.length === 1 ? current : current.filter((exercise) => exercise.key !== key)));
  }

  function updateExercise(key: string, field: keyof ExerciseFormState, value: string) {
    setExercises((current) => current.map((exercise) => (exercise.key === key ? { ...exercise, [field]: value } : exercise)));
  }

  return (
    <form action={action} className="space-y-3">
      {session ? <input name="id" type="hidden" value={session.id} /> : null}

      <label className="block text-sm font-medium" htmlFor={session ? `status-${session.id}` : "status"}>
        類型
      </label>
      <select
        className="min-h-11 w-full rounded-md border border-border bg-card px-3 text-base outline-none focus:ring-2 focus:ring-primary"
        defaultValue={session?.status || "completed"}
        id={session ? `status-${session.id}` : "status"}
        name="status"
      >
        <option value="completed">記錄現在</option>
        <option value="planned">安排訓練</option>
        <option value="draft">草稿</option>
        <option value="skipped">略過</option>
      </select>

      <Field
        defaultValue={toDateTimeLocal(session?.scheduled_at) || nowLocal()}
        label="日期時間"
        name="scheduled_at"
        required
        type="datetime-local"
      />

      <label className="block text-sm font-medium" htmlFor={session ? `session_type-${session.id}` : "session_type"}>
        訓練分類
      </label>
      <select
        className="min-h-11 w-full rounded-md border border-border bg-card px-3 text-base outline-none focus:ring-2 focus:ring-primary"
        defaultValue={session?.session_type || "strength"}
        id={session ? `session_type-${session.id}` : "session_type"}
        name="session_type"
      >
        {typeOptions.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <Field defaultValue={session?.title || ""} label="標題" name="title" placeholder="例如 胸推、有氧、爬樓梯機" required />

      <label className="block text-sm font-medium" htmlFor={session ? `note-${session.id}` : "note"}>
        備註
      </label>
      <textarea
        className="min-h-20 w-full rounded-md border border-border bg-card px-3 py-2 text-base outline-none focus:ring-2 focus:ring-primary"
        defaultValue={session?.note || ""}
        id={session ? `note-${session.id}` : "note"}
        name="note"
        placeholder="整體狀態、器材、當天調整..."
      />

      <label className="block text-sm font-medium" htmlFor={session ? `pain_note-${session.id}` : "pain_note"}>
        疼痛 / 舊傷
      </label>
      <textarea
        className="min-h-20 w-full rounded-md border border-border bg-card px-3 py-2 text-base outline-none focus:ring-2 focus:ring-primary"
        defaultValue={session?.pain_note || ""}
        id={session ? `pain_note-${session.id}` : "pain_note"}
        name="pain_note"
        placeholder="膝蓋、肩、腰、腳踝..."
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">訓練項目</h3>
          <Button onClick={addExercise} type="button" variant="secondary">
            新增項目
          </Button>
        </div>

        {exercises.map((exercise, index) => (
          <div className="rounded-lg border border-border bg-muted p-3" key={exercise.key}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-medium">項目 {index + 1}</p>
              <button
                className="text-sm text-muted-foreground"
                disabled={exercises.length === 1}
                onClick={() => removeExercise(exercise.key)}
                type="button"
              >
                移除
              </button>
            </div>

            <label className="block text-sm font-medium" htmlFor={`exercise_type-${exercise.key}`}>
              項目類型
            </label>
            <select
              className="mb-3 min-h-11 w-full rounded-md border border-border bg-card px-3 text-base outline-none focus:ring-2 focus:ring-primary"
              id={`exercise_type-${exercise.key}`}
              name="exercise_type"
              onChange={(event) => updateExercise(exercise.key, "exercise_type", event.target.value)}
              value={exercise.exercise_type}
            >
              {typeOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <Input
              label="名稱"
              name="exercise_name"
              onChange={(value) => updateExercise(exercise.key, "name", value)}
              placeholder="例如 槓鈴深蹲、爬樓梯機"
              required
              value={exercise.name}
            />

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="組數"
                name="set_count"
                onChange={(value) => updateExercise(exercise.key, "set_count", value)}
                type="number"
                value={exercise.set_count}
              />
              <Input
                label="次數"
                name="reps"
                onChange={(value) => updateExercise(exercise.key, "reps", value)}
                placeholder="可選"
                type="number"
                value={exercise.reps}
              />
              <Input
                label="重量 kg"
                name="weight_kg"
                onChange={(value) => updateExercise(exercise.key, "weight_kg", value)}
                placeholder="可選"
                step="0.5"
                type="number"
                value={exercise.weight_kg}
              />
              <Input
                label="時長 min"
                name="duration_min"
                onChange={(value) => updateExercise(exercise.key, "duration_min", value)}
                placeholder="可選"
                type="number"
                value={exercise.duration_min}
              />
            </div>

            <Input
              label="強度 0-10"
              name="intensity"
              onChange={(value) => updateExercise(exercise.key, "intensity", value)}
              placeholder="例如 9"
              step="0.5"
              type="number"
              value={exercise.intensity}
            />

            <label className="block text-sm font-medium" htmlFor={`exercise_note-${exercise.key}`}>
              項目備註
            </label>
            <textarea
              className="mb-3 min-h-16 w-full rounded-md border border-border bg-card px-3 py-2 text-base outline-none focus:ring-2 focus:ring-primary"
              id={`exercise_note-${exercise.key}`}
              name="exercise_note"
              onChange={(event) => updateExercise(exercise.key, "exercise_note", event.target.value)}
              value={exercise.exercise_note}
            />

            <label className="block text-sm font-medium" htmlFor={`exercise_pain_note-${exercise.key}`}>
              項目疼痛 / 舊傷
            </label>
            <textarea
              className="min-h-16 w-full rounded-md border border-border bg-card px-3 py-2 text-base outline-none focus:ring-2 focus:ring-primary"
              id={`exercise_pain_note-${exercise.key}`}
              name="exercise_pain_note"
              onChange={(event) => updateExercise(exercise.key, "exercise_pain_note", event.target.value)}
              value={exercise.exercise_pain_note}
            />
          </div>
        ))}
      </div>

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
  type = "text",
}: {
  defaultValue?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <>
      <label className="block text-sm font-medium" htmlFor={`${name}-${label}`}>
        {label}
      </label>
      <input
        className="min-h-11 w-full rounded-md border border-border bg-card px-3 text-base outline-none focus:ring-2 focus:ring-primary"
        defaultValue={defaultValue}
        id={`${name}-${label}`}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </>
  );
}

function Input({
  label,
  name,
  onChange,
  placeholder,
  required,
  step,
  type = "text",
  value,
}: {
  label: string;
  name: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  step?: string;
  type?: string;
  value: string;
}) {
  return (
    <>
      <label className="block text-sm font-medium" htmlFor={`${name}-${label}`}>
        {label}
      </label>
      <input
        className="mb-3 min-h-11 w-full rounded-md border border-border bg-card px-3 text-base outline-none focus:ring-2 focus:ring-primary"
        id={`${name}-${label}`}
        inputMode={type === "number" ? "decimal" : undefined}
        min={type === "number" ? "0" : undefined}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        step={step}
        type={type}
        value={value}
      />
    </>
  );
}

function initialExercises(session?: WorkoutSession) {
  if (!session?.workout_exercises?.length) {
    return [blankExercise(`exercise-${session?.id || "new"}-1`)];
  }

  return session.workout_exercises.map((exercise) => {
    const firstSet = exercise.workout_sets?.[0];
    return {
      key: exercise.id,
      exercise_type: exercise.exercise_type,
      name: exercise.name,
      set_count: String(Math.max(1, exercise.workout_sets?.length || 1)),
      weight_kg: toInputValue(firstSet?.actual_weight_kg ?? firstSet?.planned_weight_kg),
      reps: toInputValue(firstSet?.actual_reps ?? firstSet?.planned_reps),
      duration_min: toInputValue(firstSet?.actual_duration_min ?? firstSet?.planned_duration_min),
      intensity: toInputValue(firstSet?.actual_intensity ?? firstSet?.planned_intensity),
      exercise_note: exercise.note || "",
      exercise_pain_note: exercise.pain_note || "",
    };
  });
}

function blankExercise(key = crypto.randomUUID()): ExerciseFormState {
  return {
    key,
    exercise_type: "strength",
    name: "",
    set_count: "1",
    weight_kg: "",
    reps: "",
    duration_min: "",
    intensity: "",
    exercise_note: "",
    exercise_pain_note: "",
  };
}

function nowLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function toDateTimeLocal(value?: string) {
  return value ? value.slice(0, 16) : "";
}

function toInputValue(value: number | string | null | undefined) {
  return value == null ? "" : String(value);
}
