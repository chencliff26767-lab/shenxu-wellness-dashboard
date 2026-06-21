"use client";

import { Check, Save } from "lucide-react";
import { useFormStatus } from "react-dom";

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
  completed_at: string | null;
};

type WorkoutSetEditorProps = {
  action: (formData: FormData) => void | Promise<void>;
  set: WorkoutSet;
};

export function WorkoutSetEditor({ action, set }: WorkoutSetEditorProps) {
  return (
    <form action={action} className="border-t border-border py-2 first:border-t-0">
      <input name="id" type="hidden" value={set.id} />
      <SetRow set={set} />
    </form>
  );
}

function SetRow({ set }: { set: WorkoutSet }) {
  const { pending } = useFormStatus();
  const completed = Boolean(set.completed_at);

  return (
    <div className={`flex items-end gap-1.5 ${completed ? "opacity-60" : ""}`}>
      <span className="flex h-11 w-7 shrink-0 items-center justify-center text-sm font-semibold">{set.position}</span>
      <SetInput
        label="kg"
        name="actual_weight_kg"
        planned={set.planned_weight_kg}
        value={set.actual_weight_kg}
      />
      <SetInput label="次" name="actual_reps" planned={set.planned_reps} step="1" value={set.actual_reps} />
      <SetInput
        label="分鐘"
        name="actual_duration_min"
        planned={set.planned_duration_min}
        step="1"
        value={set.actual_duration_min}
      />
      <SetInput
        label="強度"
        max="10"
        name="actual_intensity"
        planned={set.planned_intensity}
        value={set.actual_intensity}
      />
      <button
        aria-label={`儲存第 ${set.position} 組`}
        className="flex h-11 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground disabled:opacity-40"
        disabled={pending}
        type="submit"
      >
        <Save aria-hidden="true" className="h-4 w-4" />
      </button>
      <label
        className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors ${
          completed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
        }`}
      >
        <span className="sr-only">第 {set.position} 組完成</span>
        <input
          className="sr-only"
          defaultChecked={completed}
          disabled={pending}
          name="completed"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          type="checkbox"
        />
        <Check aria-hidden="true" className="h-5 w-5" />
      </label>
    </div>
  );
}

function SetInput({
  label,
  max,
  name,
  planned,
  step = "0.5",
  value,
}: {
  label: string;
  max?: string;
  name: string;
  planned: number | string | null;
  step?: string;
  value: number | string | null;
}) {
  return (
    <label className="min-w-0 flex-1 text-center text-[10px] leading-none text-muted-foreground">
      {label}
      <input
        aria-label={label}
        className="mt-1 h-9 w-full min-w-0 rounded-md border border-border bg-card px-1 text-center text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
        defaultValue={value ?? planned ?? ""}
        inputMode="decimal"
        max={max}
        min="0"
        name={name}
        placeholder="—"
        step={step}
        type="number"
      />
    </label>
  );
}
