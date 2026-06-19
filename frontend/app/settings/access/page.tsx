import { BottomNav } from "@/components/bottom-nav";

export default function AccessPage() {
  return (
    <main className="min-h-dvh pb-[calc(88px+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-md px-5 pt-[calc(24px+env(safe-area-inset-top))]">
        <p className="text-sm text-muted-foreground">設定</p>
        <h1 className="mt-1 text-3xl font-semibold">教練存取權</h1>
        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <h2 className="text-xl font-semibold">尚未連結教練</h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            Sprint 1 先建立權限入口與 RLS 基礎；邀請、撤銷與 manage_plans 流程在 Coach sprint 補上。
          </p>
        </section>
      </div>
      <BottomNav />
    </main>
  );
}
