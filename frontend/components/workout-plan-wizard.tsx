"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ExerciseState = {
  key: string;
  name: string;
  type: string;
  variation: string;
  equipment: string;
  required: boolean;
  setCount: string;
  weight: string;
  reps: string;
  durationSeconds: string;
  distanceM: string;
  rpe: string;
  rir: string;
  restSeconds: string;
  note: string;
};

type PlanState = {
  title: string;
  workoutType: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: string;
  focus: string;
  preparation: string;
};

type WorkoutPlanWizardProps = {
  action: (formData: FormData) => void | Promise<void>;
  initialDate: string;
  ownerId: string;
};

const steps = ["基本資料", "訓練動作", "目標設定", "確認計畫"];
const typeOptions = [
  ["strength", "重訓"],
  ["cardio", "有氧"],
  ["running", "跑步"],
  ["tennis", "網球"],
  ["pilates", "皮拉提斯"],
  ["other", "其他"],
];

export function WorkoutPlanWizard({ action, initialDate, ownerId }: WorkoutPlanWizardProps) {
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState<PlanState>({
    title: "",
    workoutType: "strength",
    scheduledDate: initialDate,
    scheduledTime: "",
    durationMinutes: "",
    focus: "",
    preparation: "",
  });
  const [exercises, setExercises] = useState<ExerciseState[]>([blankExercise("strength", "exercise-1")]);

  function updatePlan(field: keyof PlanState, value: string) {
    setPlan((current) => ({ ...current, [field]: value }));
  }

  function updateWorkoutType(value: string) {
    const defaults = defaultsForType(value);
    setPlan((current) => ({
      ...current,
      workoutType: value,
      durationMinutes: defaults.durationMinutes || current.durationMinutes,
    }));
    setExercises((current) =>
      current.map((exercise) => ({
        ...exercise,
        type: value,
        setCount: defaults.setCount,
        reps: defaults.reps,
      })),
    );
  }

  function updateExercise(key: string, field: keyof ExerciseState, value: string | boolean) {
    setExercises((current) => current.map((exercise) => (exercise.key === key ? { ...exercise, [field]: value } : exercise)));
  }

  function addExercise() {
    setExercises((current) => [...current, blankExercise(plan.workoutType)]);
  }

  function removeExercise(key: string) {
    setExercises((current) => (current.length === 1 ? current : current.filter((exercise) => exercise.key !== key)));
  }

  const canContinue =
    step === 0
      ? Boolean(plan.title.trim() && plan.scheduledDate)
      : step === 1
        ? exercises.every((exercise) => exercise.name.trim())
        : true;

  return (
    <form action={action} className="space-y-5">
      <input name="owner_id" type="hidden" value={ownerId} />
      <input name="title" type="hidden" value={plan.title} />
      <input name="workout_type" type="hidden" value={plan.workoutType} />
      <input name="scheduled_date" type="hidden" value={plan.scheduledDate} />
      <input name="scheduled_time" type="hidden" value={plan.scheduledTime} />
      <input name="target_duration_minutes" type="hidden" value={plan.durationMinutes} />
      <input name="focus_text" type="hidden" value={plan.focus} />
      <input name="preparation_notes" type="hidden" value={plan.preparation} />
      {exercises.map((exercise) => (
        <div key={`hidden-${exercise.key}`}>
          <input name="exercise_name" type="hidden" value={exercise.name} />
          <input name="exercise_type" type="hidden" value={exercise.type} />
          <input name="variation" type="hidden" value={exercise.variation} />
          <input name="equipment" type="hidden" value={exercise.equipment} />
          <input name="is_required" type="hidden" value={String(exercise.required)} />
          <input name="set_count" type="hidden" value={exercise.setCount} />
          <input name="target_weight_kg" type="hidden" value={exercise.weight} />
          <input name="target_reps" type="hidden" value={exercise.reps} />
          <input name="target_duration_seconds" type="hidden" value={exercise.durationSeconds} />
          <input name="target_distance_m" type="hidden" value={exercise.distanceM} />
          <input name="target_rpe" type="hidden" value={exercise.rpe} />
          <input name="target_rir" type="hidden" value={exercise.rir} />
          <input name="rest_seconds" type="hidden" value={exercise.restSeconds} />
          <input name="exercise_note" type="hidden" value={exercise.note} />
        </div>
      ))}

      <ol className="grid grid-cols-4 gap-1" aria-label="建立進度">
        {steps.map((label, index) => (
          <li className="text-center" key={label}>
            <span
              aria-current={index === step ? "step" : undefined}
              className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                index <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {index < step ? <Check aria-hidden="true" className="h-4 w-4" /> : index + 1}
            </span>
            <span className="mt-1 block text-[10px] text-muted-foreground">{label}</span>
          </li>
        ))}
      </ol>

      {step === 0 ? <PlanBasics plan={plan} update={updatePlan} updateWorkoutType={updateWorkoutType} /> : null}
      {step === 1 ? (
        <ExerciseList exercises={exercises} add={addExercise} remove={removeExercise} update={updateExercise} />
      ) : null}
      {step === 2 ? <TargetList exercises={exercises} update={updateExercise} /> : null}
      {step === 3 ? <PlanReview exercises={exercises} plan={plan} /> : null}

      <div className="grid grid-cols-2 gap-2">
        <Button disabled={step === 0} onClick={() => setStep((current) => current - 1)} type="button" variant="secondary">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          上一步
        </Button>
        {step < steps.length - 1 ? (
          <Button disabled={!canContinue} onClick={() => setStep((current) => current + 1)} type="button">
            下一步
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        ) : (
          <SubmitButton />
        )}
      </div>
    </form>
  );
}

function PlanBasics({
  plan,
  update,
  updateWorkoutType,
}: {
  plan: PlanState;
  update: (field: keyof PlanState, value: string) => void;
  updateWorkoutType: (value: string) => void;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-lg font-semibold">何時要做什麼？</h2>
      <TextInput label="計畫名稱" onChange={(value) => update("title", value)} placeholder="例如 下肢力量" required value={plan.title} />
      <SelectInput label="訓練類型" onChange={updateWorkoutType} value={plan.workoutType} />
      <div className="grid grid-cols-2 gap-2">
        <TextInput label="日期" onChange={(value) => update("scheduledDate", value)} required type="date" value={plan.scheduledDate} />
        <TextInput label="時間" onChange={(value) => update("scheduledTime", value)} type="time" value={plan.scheduledTime} />
      </div>
      <TextInput label="預計分鐘" min="0" onChange={(value) => update("durationMinutes", value)} type="number" value={plan.durationMinutes} />
      <TextArea label="本次重點" onChange={(value) => update("focus", value)} value={plan.focus} />
      <TextArea label="事前準備" onChange={(value) => update("preparation", value)} value={plan.preparation} />
    </section>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit">
      {pending ? "儲存中..." : "建立計畫"}
    </Button>
  );
}

function ExerciseList({
  add,
  exercises,
  remove,
  update,
}: {
  add: () => void;
  exercises: ExerciseState[];
  remove: (key: string) => void;
  update: (key: string, field: keyof ExerciseState, value: string | boolean) => void;
}) {
  return (
    <section className="space-y-3">
      {exercises.map((exercise, index) => (
        <div className="rounded-lg border border-border bg-card p-4" key={exercise.key}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">動作 {index + 1}</h2>
            <button
              aria-label={`移除動作 ${index + 1}`}
              className="flex h-11 w-11 items-center justify-center text-muted-foreground disabled:opacity-30"
              disabled={exercises.length === 1}
              onClick={() => remove(exercise.key)}
              type="button"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <TextInput label="動作名稱" onChange={(value) => update(exercise.key, "name", value)} placeholder="例如 深蹲" required value={exercise.name} />
          <div className="mt-3">
            <SelectInput label="類型" onChange={(value) => update(exercise.key, "type", value)} value={exercise.type} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <TextInput label="變化／種類" onChange={(value) => update(exercise.key, "variation", value)} placeholder="例如 高槓" value={exercise.variation} />
            <TextInput label="器材" onChange={(value) => update(exercise.key, "equipment", value)} placeholder="例如 槓鈴" value={exercise.equipment} />
          </div>
          <label className="mt-3 flex min-h-11 items-center gap-2 text-sm">
            <input
              checked={exercise.required}
              className="h-5 w-5 accent-primary"
              onChange={(event) => update(exercise.key, "required", event.target.checked)}
              type="checkbox"
            />
            必做動作
          </label>
          <TextArea label="動作備註" onChange={(value) => update(exercise.key, "note", value)} value={exercise.note} />
        </div>
      ))}
      <Button className="w-full" onClick={add} type="button" variant="secondary">
        <Plus aria-hidden="true" className="h-4 w-4" />
        新增動作
      </Button>
    </section>
  );
}

function TargetList({
  exercises,
  update,
}: {
  exercises: ExerciseState[];
  update: (key: string, field: keyof ExerciseState, value: string | boolean) => void;
}) {
  return (
    <section className="space-y-3">
      {exercises.map((exercise, index) => (
        <div className="rounded-lg border border-border bg-card p-4" key={exercise.key}>
          <p className="text-xs text-muted-foreground">動作 {index + 1}</p>
          <h2 className="mt-1 font-semibold">{exercise.name}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <TextInput label="組數" min="1" onChange={(value) => update(exercise.key, "setCount", value)} required type="number" value={exercise.setCount} />
            <TextInput label="重量 kg" min="0" onChange={(value) => update(exercise.key, "weight", value)} step="0.5" type="number" value={exercise.weight} />
            <TextInput label="次數" min="0" onChange={(value) => update(exercise.key, "reps", value)} type="number" value={exercise.reps} />
            <TextInput label="時間（秒）" min="0" onChange={(value) => update(exercise.key, "durationSeconds", value)} type="number" value={exercise.durationSeconds} />
            <TextInput label="距離（公尺）" min="0" onChange={(value) => update(exercise.key, "distanceM", value)} type="number" value={exercise.distanceM} />
            <TextInput label="RPE 1-10" max="10" min="1" onChange={(value) => update(exercise.key, "rpe", value)} type="number" value={exercise.rpe} />
            <TextInput label="RIR 0-10" max="10" min="0" onChange={(value) => update(exercise.key, "rir", value)} type="number" value={exercise.rir} />
            <TextInput label="休息（秒）" min="0" onChange={(value) => update(exercise.key, "restSeconds", value)} type="number" value={exercise.restSeconds} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">目前會將相同目標套用到每一組，建立後仍保留逐組資料。</p>
        </div>
      ))}
    </section>
  );
}

function PlanReview({ exercises, plan }: { exercises: ExerciseState[]; plan: PlanState }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{plan.scheduledDate} {plan.scheduledTime}</p>
      <h2 className="mt-1 text-xl font-semibold">{plan.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{exercises.length} 個動作 · {exercises.reduce((sum, exercise) => sum + (Number(exercise.setCount) || 0), 0)} 組</p>
      <ol className="mt-4 space-y-2">
        {exercises.map((exercise, index) => (
          <li className="rounded-md bg-muted p-3" key={exercise.key}>
            <p className="font-medium">{index + 1}. {exercise.name}{exercise.variation ? ` · ${exercise.variation}` : ""}</p>
            <p className="mt-1 text-sm text-muted-foreground">{exercise.setCount} 組{exercise.weight ? ` · ${exercise.weight} kg` : ""}{exercise.reps ? ` · ${exercise.reps} 次` : ""}{exercise.durationSeconds ? ` · ${exercise.durationSeconds} 秒` : ""}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SelectInput({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="block min-w-0 text-sm font-medium">
      {label}
      <select className="mt-1 min-h-11 w-full rounded-md border border-border bg-card px-3 text-base" onChange={(event) => onChange(event.target.value)} value={value}>
        {typeOptions.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function TextInput({ label, max, min, onChange, placeholder, required, step, type = "text", value }: { label: string; max?: string; min?: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; step?: string; type?: string; value: string }) {
  return (
    <label className="block min-w-0 text-sm font-medium">
      {label}
      <input className="mt-1 min-h-11 w-full rounded-md border border-border bg-card px-3 text-base outline-none focus:ring-2 focus:ring-primary" max={max} min={min} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} step={step} type={type} value={value} />
    </label>
  );
}

function TextArea({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <textarea className="mt-1 min-h-20 w-full rounded-md border border-border bg-card px-3 py-2 text-base outline-none focus:ring-2 focus:ring-primary" onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}

function blankExercise(type: string, key = crypto.randomUUID()): ExerciseState {
  const defaults = defaultsForType(type);
  return {
    key,
    name: "",
    type,
    variation: "",
    equipment: "",
    required: true,
    setCount: defaults.setCount,
    weight: "",
    reps: defaults.reps,
    durationSeconds: "",
    distanceM: "",
    rpe: "",
    rir: "",
    restSeconds: "",
    note: "",
  };
}

function defaultsForType(type: string) {
  if (type === "strength") {
    return { setCount: "4", reps: "12", durationMinutes: "" };
  }
  if (type === "pilates") {
    return { setCount: "2", reps: "10", durationMinutes: "60" };
  }
  if (type === "cardio" || type === "running" || type === "tennis") {
    return { setCount: "1", reps: "", durationMinutes: "30" };
  }
  return { setCount: "1", reps: "", durationMinutes: "" };
}
