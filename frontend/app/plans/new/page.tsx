import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createWorkoutPlan } from "@/app/actions/workout-plans";
import { BottomNav } from "@/components/bottom-nav";
import { WorkoutPlanWizard } from "@/components/workout-plan-wizard";
import { createClient } from "@/lib/supabase/server";

type NewPlanPageProps = {
  searchParams?: Promise<{ date?: string; error?: string; owner?: string }>;
};

export default async function NewPlanPage({ searchParams }: NewPlanPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(new Date());

  return (
    <main className="min-h-dvh pb-[calc(88px+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-md px-5 pt-[calc(24px+env(safe-area-inset-top))]">
        <Link className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground" href="/plans">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          返回週計畫
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">建立訓練計畫</h1>
        {params?.error ? <p className="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">建立失敗：{params.error}</p> : null}
        <div className="mt-6">
          <WorkoutPlanWizard action={createWorkoutPlan} initialDate={params?.date || today} ownerId={params?.owner || user?.id || ""} />
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
