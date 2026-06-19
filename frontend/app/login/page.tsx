import { Activity, Mail } from "lucide-react";
import Link from "next/link";
import { signInWithGoogle, signInWithMagicLink } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { WellnessMascot } from "@/components/wellness-mascot";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    sent?: string;
    setup?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const missingSetup = params?.setup === "missing" || !isSupabaseConfigured();

  return (
    <main className="min-h-dvh px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(32px+env(safe-area-inset-top))]">
      <section className="relative mx-auto flex min-h-[calc(100dvh-64px)] w-full max-w-md flex-col gap-8 overflow-hidden">
        <div className="relative space-y-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity aria-hidden="true" className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground">私人健康紀錄</p>
          </div>

          <div className="relative space-y-3">
            <WellnessMascot className="pointer-events-none absolute -right-4 -top-16 z-10 h-48 w-36 opacity-[0.69]" />
            <div className="relative z-20 space-y-3">
              <h1 className="text-4xl font-semibold leading-tight">Cliff Wellness Journal</h1>
              <p className="text-base leading-7 text-muted-foreground">
                在緩慢的日子裡，也留下身體前進的痕跡。
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 text-sm leading-6 text-card-foreground">
            只有 Cliff 與已授權教練能查看資料。未授權帳號登入後不會看到健康紀錄。
          </div>
        </div>

        <div className="relative z-10 space-y-3">
          {missingSetup ? (
            <p className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
              尚未設定 Supabase env。先填 `frontend/.env.local` 後即可測登入。
            </p>
          ) : null}
          {params?.sent ? (
            <p className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
              Magic Link 已送出，請查看信箱。
            </p>
          ) : null}
          {params?.error ? (
            <p className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
              登入暫時失敗，請確認設定後再試一次。
            </p>
          ) : null}

          <form action={signInWithGoogle}>
            <Button className="w-full" disabled={missingSetup} type="submit">
              使用 Google 登入
            </Button>
          </form>

          {missingSetup ? (
            <Link
              className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted"
              href="/today"
            >
              本機先看 Demo
            </Link>
          ) : null}

          <form action={signInWithMagicLink} className="flex gap-2">
            <label className="sr-only" htmlFor="email">
              Email
            </label>
            <input
              className="min-h-11 flex-1 rounded-md border border-border bg-card px-3 text-base outline-none focus:ring-2 focus:ring-primary"
              id="email"
              name="email"
              placeholder="Email Magic Link"
              type="email"
            />
            <Button aria-label="送出 Magic Link" disabled={missingSetup} type="submit" variant="secondary">
              <Mail aria-hidden="true" className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
