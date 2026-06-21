"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallHint() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const wasDismissed = window.localStorage.getItem("pwa-install-dismissed") === "1";
    setDismissed(wasDismissed || standalone);
    setShowIosHelp(ios && !standalone);

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  if (dismissed || (!showIosHelp && !installPrompt)) return null;

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") dismiss();
  }

  function dismiss() {
    window.localStorage.setItem("pwa-install-dismissed", "1");
    setDismissed(true);
  }

  return (
    <aside aria-label="安裝 App" aria-live="polite" className="fixed inset-x-3 bottom-[calc(82px+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-lg border border-border bg-card p-3 shadow-lg" role="region">
      <div className="flex items-start gap-3">
        {showIosHelp ? <Share aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-primary" /> : <Download aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-primary" />}
        <div className="min-w-0 flex-1">
          <p className="font-medium">加到主畫面</p>
          {showIosHelp ? <p className="mt-1 text-sm text-muted-foreground">點 Safari 的分享按鈕，再選「加入主畫面」。</p> : <button className="mt-2 min-h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground" onClick={install} type="button">安裝 Wellness</button>}
        </div>
        <button aria-label="關閉安裝提示" className="flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground" onClick={dismiss} type="button"><X aria-hidden="true" className="h-4 w-4" /></button>
      </div>
    </aside>
  );
}
