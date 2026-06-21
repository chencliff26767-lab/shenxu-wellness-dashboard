"use client";

import { Check, RotateCcw, Save } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

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

type WorkoutSetEditorProps = {
  action: (formData: FormData) => void | Promise<void>;
  set: WorkoutSet;
};

export function WorkoutSetEditor({ action, set }: WorkoutSetEditorProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [completed, setCompleted] = useState(Boolean(set.completed_at));
  const [undoValue, setUndoValue] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  function submit(nextCompleted = completed) {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    formData.set("completed", String(nextCompleted));
    startTransition(async () => action(formData));
  }

  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => submit(), 800);
  }

  function toggleCompleted() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const previous = completed;
    const next = !previous;
    setCompleted(next);
    setUndoValue(previous);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoValue(null), 5000);
    submit(next);
  }

  function undo() {
    if (undoValue == null) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setCompleted(undoValue);
    submit(undoValue);
    setUndoValue(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }

  const showMinutes = set.planned_duration_seconds == null && set.actual_duration_seconds == null;
  const showIntensity = set.planned_rpe == null && set.actual_rpe == null;

  return (
    <form
      action={(formData) => {
        formData.set("completed", String(completed));
        return action(formData);
      }}
      className="border-t border-border py-2 first:border-t-0"
      ref={formRef}
    >
      <input name="id" type="hidden" value={set.id} />
      <div aria-label={`第 ${set.position} 組`} className={`flex items-end gap-1.5 ${completed ? "opacity-60" : ""}`} role="group">
        <span className="flex h-11 w-7 shrink-0 items-center justify-center text-sm font-semibold">{set.position}</span>
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5">
          <SetInput label="kg" name="actual_weight_kg" onChange={scheduleSave} planned={set.planned_weight_kg} value={set.actual_weight_kg} />
          <SetInput label="次" name="actual_reps" onChange={scheduleSave} planned={set.planned_reps} step="1" value={set.actual_reps} />
          {showMinutes ? <SetInput label="分鐘" name="actual_duration_min" onChange={scheduleSave} planned={set.planned_duration_min} step="1" value={set.actual_duration_min} /> : null}
          {!showMinutes ? <SetInput label="秒" name="actual_duration_seconds" onChange={scheduleSave} planned={set.planned_duration_seconds} step="1" value={set.actual_duration_seconds} /> : null}
          {set.planned_distance_m != null || set.actual_distance_m != null ? <SetInput label="公尺" name="actual_distance_m" onChange={scheduleSave} planned={set.planned_distance_m} value={set.actual_distance_m} /> : null}
          {showIntensity ? <SetInput label="強度" max="10" name="actual_intensity" onChange={scheduleSave} planned={set.planned_intensity} value={set.actual_intensity} /> : null}
          {!showIntensity ? <SetInput label="RPE" max="10" min="1" name="actual_rpe" onChange={scheduleSave} planned={set.planned_rpe} step="1" value={set.actual_rpe} /> : null}
          {set.planned_rir != null || set.actual_rir != null ? <SetInput label="RIR" max="10" name="actual_rir" onChange={scheduleSave} planned={set.planned_rir} step="1" value={set.actual_rir} /> : null}
        </div>
        <button aria-label={`儲存第 ${set.position} 組`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground disabled:opacity-40" disabled={pending} type="submit">
          <Save aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          aria-label={`第 ${set.position} 組${completed ? "取消完成" : "完成"}`}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border transition-colors ${completed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}
          disabled={pending}
          onClick={toggleCompleted}
          type="button"
        >
          <Check aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>

      {undoValue != null ? (
        <button className="mt-1 flex min-h-11 items-center gap-1 text-xs text-muted-foreground underline underline-offset-4" onClick={undo} type="button">
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
          復原剛才的完成狀態
        </button>
      ) : null}

      <details className="mt-1">
        <summary className="min-h-11 cursor-pointer py-3 text-xs text-muted-foreground">組別備註</summary>
        <div className="grid grid-cols-2 gap-2 pb-2">
          <NoteInput defaultValue={set.note} label="一般" name="note" onChange={scheduleSave} />
          <NoteInput defaultValue={set.pain_note} label="疼痛／舊傷" name="pain_note" onChange={scheduleSave} />
          <NoteInput defaultValue={set.fatigue_note} label="疲勞" name="fatigue_note" onChange={scheduleSave} />
          <NoteInput defaultValue={set.equipment_note} label="器材限制" name="equipment_note" onChange={scheduleSave} />
        </div>
      </details>
    </form>
  );
}

function SetInput({ label, max, min = "0", name, onChange, planned, step = "0.5", value }: { label: string; max?: string; min?: string; name: string; onChange: () => void; planned: number | string | null; step?: string; value: number | string | null }) {
  return (
    <label className="w-14 shrink-0 text-center text-[10px] leading-none text-muted-foreground">
      {label}
      <input aria-label={label} className="mt-1 h-11 w-full rounded-md border border-border bg-card px-1 text-center text-sm text-foreground outline-none focus:ring-2 focus:ring-primary" defaultValue={value ?? planned ?? ""} inputMode="decimal" max={max} min={min} name={name} onChange={onChange} placeholder="—" step={step} type="number" />
    </label>
  );
}

function NoteInput({ defaultValue, label, name, onChange }: { defaultValue: string | null; label: string; name: string; onChange: () => void }) {
  return (
    <label className="text-xs text-muted-foreground">
      {label}
      <textarea className="mt-1 min-h-16 w-full rounded-md border border-border bg-card p-2 text-sm text-foreground" defaultValue={defaultValue || ""} name={name} onChange={onChange} />
    </label>
  );
}
