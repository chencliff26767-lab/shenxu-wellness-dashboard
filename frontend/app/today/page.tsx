import Link from "next/link";
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

        <section className="relative mt-6 overflow-hidden rounded-lg border border-border bg-card p-5">
          <WellnessMascot className="pointer-events-none absolute right-3 top-4 h-32 w-24 opacity-[0.69]" />
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Dumbbell aria-hidden="true" className="h-4 w-4" />
            今日預排訓練
          </div>
          <div className="relative z-10 max-w-[78%]">
            <h2 className="text-2xl font-semibold">今天還沒有安排訓練</h2>
            <p className="mt-3 leading-7 text-muted-foreground">先替未來的自己準備好，到了現場就不用再想。</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
              href="/body"
            >
              記錄現在
            </Link>
            <Button type="button" variant="secondary">
              安排訓練
            </Button>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <QuickCard href="/body" icon={<Plus className="h-5 w-5" />} label="身材紀錄" value="體重 / 腰圍 / InBody" />
          <QuickCard href="/meals" icon={<Plus className="h-5 w-5" />} label="飲食紀錄" value="餐點 / 照片 / 備註" />
          <QuickCard icon={<MessageCircle className="h-5 w-5" />} label="教練回饋" value="尚無新留言" />
          <QuickCard icon={<CalendarDays className="h-5 w-5" />} label="登入帳號" value={userEmail} />
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

  return user?.email || "尚未登入";
}

function QuickCard({
  href,
  icon,
  label,
  value,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  const content = (
    <>
      <div className="text-primary">{icon}</div>
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </>
  );

  if (href) {
    return (
      <Link className="min-h-28 rounded-lg border border-border bg-card p-4" href={href}>
        {content}
      </Link>
    );
  }

  return <div className="min-h-28 rounded-lg border border-border bg-card p-4">{content}</div>;
}
