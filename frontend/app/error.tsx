"use client";

import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center px-5 py-[calc(24px+env(safe-area-inset-top))]">
      <section className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-6" role="alert">
        <AlertCircle aria-hidden="true" className="h-8 w-8 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold">暫時無法顯示頁面</h1>
        <p className="mt-2 leading-7 text-muted-foreground">資料沒有遺失。請重新嘗試；若仍失敗，可以先回到今日頁。</p>
        {error.digest ? <p className="mt-3 text-xs text-muted-foreground">錯誤代碼：{error.digest}</p> : null}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button onClick={reset} type="button"><RotateCcw aria-hidden="true" className="h-4 w-4" />重新嘗試</Button>
          <Link className="flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium" href="/today">返回今日</Link>
        </div>
      </section>
    </main>
  );
}
