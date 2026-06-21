import Link from "next/link";
import { AlertTriangle, Check, MessageSquare, Settings, Target, Trash2 } from "lucide-react";
import {
  createCoachFeedback,
  createWeeklyGoal,
  deleteWeeklyGoal,
  updateWeeklyGoalStatus,
} from "@/app/actions/coach";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

type CoachPageProps = {
  searchParams?: Promise<{ accepted?: string; feedback?: string; goal?: string; error?: string }>;
};

type Goal = { id: string; title: string; note: string | null; status: string; week_start: string };
type Feedback = { id: string; body: string; created_at: string };
type Workout = { id: string; title: string; scheduled_at: string; status: string; pain_score: number | null; pain_note: string | null; overall_rpe: number | null };
type Plan = { id: string; title: string; scheduled_date: string; status: string };

export default async function CoachPage({ searchParams }: CoachPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: selfOwner } = await supabase.from("app_owners").select("user_id, display_name").eq("user_id", user.id).maybeSingle();
  const { data: relationship } = selfOwner
    ? { data: null }
    : await supabase.from("coach_relationships").select("owner_id, manage_plans").eq("coach_id", user.id).eq("status", "active").limit(1).maybeSingle();
  const ownerId = selfOwner?.user_id || relationship?.owner_id || user.id;
  const isCoach = Boolean(relationship);
  const { data: ownerProfile } = await supabase.from("app_owners").select("display_name").eq("user_id", ownerId).maybeSingle();
  const today = taipeiToday();
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);

  const [bodyResult, mealResult, workoutResult, planResult, feedbackResult, goalResult] = await Promise.all([
    supabase.from("body_metrics").select("measured_on, weight_kg, waist_cm").eq("owner_id", ownerId).order("measured_on", { ascending: false }).limit(1),
    supabase.from("meal_entries").select("id").eq("owner_id", ownerId).gte("eaten_on", weekStart).lte("eaten_on", weekEnd),
    supabase.from("workout_sessions").select("id, title, scheduled_at, status, pain_score, pain_note, overall_rpe").eq("owner_id", ownerId).gte("scheduled_at", `${weekStart}T00:00:00`).lte("scheduled_at", `${weekEnd}T23:59:59`).order("scheduled_at", { ascending: false }),
    supabase.from("workout_plans").select("id, title, scheduled_date, status").eq("owner_id", ownerId).gte("scheduled_date", weekStart).lte("scheduled_date", weekEnd).order("scheduled_date"),
    supabase.from("coach_feedback").select("id, body, created_at").eq("owner_id", ownerId).order("created_at", { ascending: false }).limit(10),
    supabase.from("weekly_goals").select("id, title, note, status, week_start").eq("owner_id", ownerId).eq("week_start", weekStart).order("created_at"),
  ]);

  const latestBody = bodyResult.data?.[0];
  const meals = mealResult.data || [];
  const workouts = (workoutResult.data || []) as Workout[];
  const plans = (planResult.data || []) as Plan[];
  const feedback = (feedbackResult.data || []) as Feedback[];
  const goals = (goalResult.data || []) as Goal[];
  const duePlans = plans.filter((plan) => plan.scheduled_date <= today && plan.status !== "cancelled");
  const completedPlans = duePlans.filter((plan) => plan.status === "completed").length;
  const adherence = duePlans.length ? Math.round((completedPlans / duePlans.length) * 100) : null;
  const attention = getAttentionItems(workouts, plans, today);

  return (
    <main className="min-h-dvh pb-[calc(88px+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-md px-5 pt-[calc(24px+env(safe-area-inset-top))]">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-sm text-muted-foreground">{isCoach ? "Coach Dashboard" : "教練協作"}</p><h1 className="mt-1 text-3xl font-semibold">{ownerProfile?.display_name || "本週摘要"}</h1></div>
          <Link aria-label="教練權限設定" className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-card" href="/settings/access"><Settings aria-hidden="true" className="h-5 w-5" /></Link>
        </div>

        {params?.accepted || params?.feedback || params?.goal ? <p aria-live="polite" className="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground" role="status">變更已儲存。</p> : null}
        {params?.error ? <p className="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground" role="alert">操作失敗：{params.error}</p> : null}

        <section className="mt-6">
          <p className="text-sm text-muted-foreground">{formatDate(weekStart)}－{formatDate(weekEnd)}</p>
          <h2 className="mt-1 text-xl font-semibold">本週狀態</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Metric label="最新體重" value={latestBody ? `${Number(latestBody.weight_kg).toFixed(1)} kg` : "尚無"} />
            <Metric label="飲食紀錄" value={`${meals.length} 餐`} />
            <Metric label="實際訓練" value={`${workouts.length} 次`} />
            <Metric label="計畫完成率" value={adherence == null ? "尚未到期" : `${adherence}%`} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">完成率只計算本週已到期且未取消的計畫。</p>
        </section>

        <section className="mt-6">
          <div className="flex items-center gap-2"><Target aria-hidden="true" className="h-5 w-5 text-primary" /><h2 className="text-xl font-semibold">每週目標</h2></div>
          <div className="mt-3 space-y-2">{goals.length ? goals.map((goal) => <GoalCard goal={goal} key={goal.id} />) : <p className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">本週尚未設定目標。</p>}</div>
          <details className="mt-3 rounded-lg border border-border bg-card p-4">
            <summary className="cursor-pointer text-sm font-medium">新增每週目標</summary>
            <form action={createWeeklyGoal} className="mt-3 space-y-3">
              <input name="owner_id" type="hidden" value={ownerId} /><input name="week_start" type="hidden" value={weekStart} />
              <label className="block text-sm font-medium">目標<input className="mt-1 min-h-11 w-full rounded-md border border-border bg-card px-3" name="title" placeholder="例如 完成 3 次訓練" required /></label>
              <label className="block text-sm font-medium">備註<textarea className="mt-1 min-h-20 w-full rounded-md border border-border bg-card p-2" name="note" /></label>
              <Button className="w-full" type="submit">新增目標</Button>
            </form>
          </details>
        </section>

        <section className="mt-6">
          <div className="flex items-center gap-2"><AlertTriangle aria-hidden="true" className="h-5 w-5 text-muted-foreground" /><h2 className="text-xl font-semibold">需要注意</h2></div>
          <div className="mt-3 space-y-2">{attention.length ? attention.map((item) => <div className="rounded-lg border border-border bg-card p-4" key={item.key}><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 font-medium">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.detail}</p></div>) : <p className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">目前沒有需要特別注意的項目。</p>}</div>
        </section>

        <section className="mt-6">
          <div className="flex items-center gap-2"><MessageSquare aria-hidden="true" className="h-5 w-5 text-primary" /><h2 className="text-xl font-semibold">教練回饋</h2></div>
          {isCoach ? <form action={createCoachFeedback} className="mt-3 rounded-lg border border-border bg-card p-4"><input name="owner_id" type="hidden" value={ownerId} /><textarea className="min-h-24 w-full rounded-md border border-border bg-card p-3" name="body" placeholder="本週觀察與下一步建議…" required /><Button className="mt-2 w-full" type="submit">送出回饋</Button></form> : null}
          <div className="mt-3 space-y-2">{feedback.length ? feedback.map((item) => <article className="rounded-lg border border-border bg-card p-4" key={item.id}><p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.body}</p></article>) : <p className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">尚無教練回饋。</p>}</div>
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>; }

function GoalCard({ goal }: { goal: Goal }) {
  const completed = goal.status === "completed";
  return <article className={`flex items-center gap-3 rounded-lg border border-border bg-card p-3 ${completed ? "opacity-60" : ""}`}><form action={updateWeeklyGoalStatus}><input name="id" type="hidden" value={goal.id} /><input name="status" type="hidden" value={completed ? "active" : "completed"} /><button aria-label={completed ? "恢復目標" : "完成目標"} className={`flex h-11 w-11 items-center justify-center rounded-full border ${completed ? "bg-primary text-primary-foreground" : "border-border"}`} type="submit"><Check aria-hidden="true" className="h-5 w-5" /></button></form><div className="min-w-0 flex-1"><p className="font-medium">{goal.title}</p>{goal.note ? <p className="mt-1 text-sm text-muted-foreground">{goal.note}</p> : null}</div><form action={deleteWeeklyGoal}><input name="id" type="hidden" value={goal.id} /><button aria-label="刪除目標" className="flex h-11 w-11 items-center justify-center text-muted-foreground" type="submit"><Trash2 aria-hidden="true" className="h-4 w-4" /></button></form></article>;
}

function getAttentionItems(workouts: Workout[], plans: Plan[], today: string) {
  const workoutItems = workouts.filter((workout) => (workout.pain_score ?? 0) >= 5 || (workout.overall_rpe ?? 0) >= 9 || workout.pain_note).map((workout) => ({ key: `workout-${workout.id}`, label: "訓練", title: workout.title, detail: [workout.pain_score != null ? `疼痛 ${workout.pain_score}/10` : null, workout.overall_rpe != null ? `RPE ${workout.overall_rpe}` : null, workout.pain_note].filter(Boolean).join(" · ") }));
  const planItems = plans.filter((plan) => plan.status === "partial" || plan.status === "skipped" || (plan.scheduled_date < today && plan.status === "planned")).map((plan) => ({ key: `plan-${plan.id}`, label: "計畫", title: plan.title, detail: plan.status === "partial" ? "部分完成" : plan.status === "skipped" ? "已略過" : "逾期，待安排" }));
  return [...workoutItems, ...planItems];
}

function taipeiToday() { return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(new Date()); }
function startOfWeek(date: string) { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() - ((value.getUTCDay() + 6) % 7)); return value.toISOString().slice(0, 10); }
function addDays(date: string, days: number) { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); }
function formatDate(date: string) { return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`; }
