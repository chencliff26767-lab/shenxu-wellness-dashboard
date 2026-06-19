import { CalendarDays, Dumbbell, MessageCircle, Plus } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { WellnessMascot } from "@/components/wellness-mascot";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function TodayPage() {
  const userEmail = await getUserEmail();

  return (
    <main className="min-h-dvh pb-[calc(88px+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-md px-5 pt-[calc(24px+env(safe-area-inset-top))]">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">今天</p>
            <h1 className="text-3xl font-semibold">先完成最重要的一件事</h1>
          </div>
          <form action={signOut}>
            <Button size="sm" type="submit" variant="ghost">
              登出
            </Button>
          </form>
        </header>

        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Dumbbell aria-hidden="true" className="h-4 w-4" />
            今日預排訓練
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">今天還沒有安排訓練</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                先替未來的自己準備好，到了現場就不用再想。
              </p>
            </div>
            <WellnessMascot className="mt-1 h-20 w-14 shrink-0 opacity-85" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button type="button">記錄現在</Button>
            <Button type="button" variant="secondary">
              安排訓練
            </Button>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <QuickCard icon={<Plus className="h-5 w-5" />} label="快速紀錄" value="身材 / 飲食 / 訓練" />
          <QuickCard icon={<MessageCircle className="h-5 w-5" />} label="教練回饋" value="尚無新留言" />
          <QuickCard icon={<CalendarDays className="h-5 w-5" />} label="訓練補記" value="強度 / 疼痛 / 備註" />
          <QuickCard icon={<Dumbbell className="h-5 w-5" />} label="登入帳號" value={userEmail} />
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

async function getUserEmail() {
  if (!isSupabaseConfigured()) {
    return "local-demo";
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.email || "已驗證";
}

function QuickCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-h-28 rounded-lg border border-border bg-card p-4">
      <div className="text-primary">{icon}</div>
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
