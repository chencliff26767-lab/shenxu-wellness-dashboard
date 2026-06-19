"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "wellness.displayName";

export function DisplayNameSetup() {
  const [displayName, setDisplayName] = useState("");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) || "";
    setDisplayName(saved);
    setDraft(saved);
  }, []);

  const title = useMemo(() => {
    const name = displayName.trim();
    return name ? `${name} Wellness Journal` : "Wellness Journal";
  }, [displayName]);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold leading-tight">{title}</h1>
        <p className="text-base leading-7 text-muted-foreground">
          在緩慢的日子裡，也留下身體前進的痕跡。
        </p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const nextName = draft.trim();
          window.localStorage.setItem(STORAGE_KEY, nextName);
          setDisplayName(nextName);
        }}
      >
        <label className="sr-only" htmlFor="display-name">
          顯示名稱
        </label>
        <input
          className="min-h-11 flex-1 rounded-md border border-border bg-card px-3 text-base outline-none focus:ring-2 focus:ring-primary"
          id="display-name"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="顯示名稱，例如 Cliff"
          type="text"
          value={draft}
        />
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
          type="submit"
        >
          套用
        </button>
      </form>
    </div>
  );
}
