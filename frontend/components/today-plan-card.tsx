"use client";

import { CheckCircle2, Circle, Clock3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { quickToggleWorkoutSet, updateWorkoutPlanFeedback } from "@/app/actions/workout-plans";
import { Button } from "@/components/ui/button";

type TodaySet = {
  actualSetId: string | null;
  completed: boolean;
  key: string;
  plannedSetId: string;
  position: number;
};

type TodayExercise = {
  completedSets: number;
  detail: string | null;
  key: string;
  name: string;
  sets: TodaySet[];
  totalSets: number;
};

type TodayPlanCardProps = {
  plan: {
    id: string;
    scheduledTime: string | null;
    status: string;
    targetDurationMinutes: number | null;
    title: string;
    exercises: TodayExercise[];
    feedback: {
      note: string | null;
      overallRpe: number | null;
      painNote: string | null;
      painScore: number | null;
    };
  };
};

const statusLabels: Record<string, string> = {
  planned: "已安排",
  in_progress: "進行中",
  completed: "已完成",
  partial: "部分完成",
  skipped: "已略過",
};

export function TodayPlanCard({ plan }: TodayPlanCardProps) {
  const router = useRouter();
  const [exercises, setExercises] = useState(plan.exercises);
  const [, startTransition] = useTransition();

  useEffect(() => setExercises(plan.exercises), [plan.exercises]);

  const totalSets = useMemo(
    () => exercises.reduce((total, exercise) => total + exercise.sets.length, 0),
    [exercises],
  );
  const completedSets = useMemo(
    () => exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.completed).length, 0),
    [exercises],
  );
  const completed = totalSets > 0 ? completedSets === totalSets : plan.status === "completed";
  const status = completed
    ? "completed"
    : completedSets > 0
      ? "partial"
      : plan.status === "skipped"
        ? "skipped"
        : plan.status;
  const editable = status !== "skipped";

  function toggleSet(exerciseKey: string, setKey: string) {
    const exercise = exercises.find((item) => item.key === exerciseKey);
    const set = exercise?.sets.find((item) => item.key === setKey);
    if (!set) return;

    const nextCompleted = !set.completed;
    setExercises((current) =>
      current.map((item) =>
        item.key === exerciseKey
          ? {
              ...item,
              completedSets: item.completedSets + (nextCompleted ? 1 : -1),
              sets: item.sets.map((itemSet) =>
                itemSet.key === setKey ? { ...itemSet, completed: nextCompleted } : itemSet,
              ),
            }
          : item,
      ),
    );

    const formData = new FormData();
    formData.set("plan_id", plan.id);
    formData.set("planned_set_id", set.plannedSetId);
    formData.set("set_id", set.actualSetId || "");
    formData.set("completed", String(nextCompleted));
    startTransition(async () => {
      await quickToggleWorkoutSet(formData);
      router.refresh();
    });
  }

  return (
    <article className={`rounded-lg border p-4 transition-colors ${completed ? "border-border bg-muted/50" : "border-border bg-card"}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-muted-foreground">
          {completed ? <CheckCircle2 aria-hidden="true" className="h-6 w-6" /> : <Circle aria-hidden="true" className="h-6 w-6" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`text-lg font-semibold ${completed ? "text-muted-foreground line-through decoration-2" : ""}`}>
              {plan.title}
            </h3>
            <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
              {statusLabels[status] || status}
            </span>
          </div>
          <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
            <Clock3 aria-hidden="true" className="h-4 w-4" />
            {plan.scheduledTime?.slice(0, 5) || "時間未定"}
            {plan.targetDurationMinutes ? ` · ${plan.targetDurationMinutes} 分鐘` : ""}
          </p>
        </div>
      </div>

      {exercises.length ? (
        <div className="mt-4 space-y-2">
          {exercises.map((exercise, index) => (
            <div className={`rounded-md p-3 ${completed ? "bg-background/60" : "bg-muted"}`} key={exercise.key}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{index + 1}. {exercise.name}</p>
                  {exercise.detail ? <p className="mt-1 text-xs text-muted-foreground">{exercise.detail}</p> : null}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {exercise.completedSets}/{exercise.totalSets} 組
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {exercise.sets.map((set) => (
                  <button
                    aria-label={`${exercise.name} 第 ${set.position} 組${set.completed ? "取消完成" : "標記完成"}`}
                    className={`flex min-h-10 min-w-10 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
                      set.completed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
                    }`}
                    disabled={!editable}
                    key={set.key}
                    onClick={() => toggleSet(exercise.key, set.key)}
                    type="button"
                  >
                    {set.completed ? <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> : set.position}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {editable ? (
        <details className="mt-3 rounded-md border border-border">
          <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-muted-foreground">
            訓練後回報
          </summary>
          <form action={updateWorkoutPlanFeedback} className="space-y-3 border-t border-border p-3">
            <input name="id" type="hidden" value={plan.id} />
            <div className="grid grid-cols-2 gap-2">
              <NumberField defaultValue={plan.feedback.overallRpe} label="RPE" max="10" min="1" name="overall_rpe" />
              <NumberField defaultValue={plan.feedback.painScore} label="疼痛" max="10" min="0" name="pain_score" />
            </div>
            <label className="block text-sm font-medium">
              備註
              <textarea
                className="mt-1 min-h-20 w-full rounded-md border border-border bg-card p-2 text-base outline-none focus:ring-2 focus:ring-primary"
                defaultValue={plan.feedback.note || ""}
                name="note"
                placeholder="今天狀態、重量感受、需要調整的地方"
              />
            </label>
            <label className="block text-sm font-medium">
              疼痛／不適
              <textarea
                className="mt-1 min-h-16 w-full rounded-md border border-border bg-card p-2 text-base outline-none focus:ring-2 focus:ring-primary"
                defaultValue={plan.feedback.painNote || ""}
                name="pain_note"
                placeholder="沒有可留空"
              />
            </label>
            <Button className="w-full" type="submit">
              更新紀錄
            </Button>
          </form>
        </details>
      ) : null}
    </article>
  );
}

function NumberField({
  defaultValue,
  label,
  max,
  min,
  name,
}: {
  defaultValue?: number | null;
  label: string;
  max: string;
  min: string;
  name: string;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        className="mt-1 min-h-11 w-full rounded-md border border-border bg-card px-3 text-base outline-none focus:ring-2 focus:ring-primary"
        defaultValue={defaultValue ?? ""}
        inputMode="numeric"
        max={max}
        min={min}
        name={name}
        type="number"
      />
    </label>
  );
}
