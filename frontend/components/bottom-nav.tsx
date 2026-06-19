import { BookOpen, CalendarDays, HeartPulse, Plus, UserRound } from "lucide-react";

const items = [
  { label: "今日", icon: HeartPulse },
  { label: "計畫", icon: CalendarDays },
  { label: "新增", icon: Plus },
  { label: "紀錄", icon: BookOpen },
  { label: "教練", icon: UserRound },
];

export function BottomNav() {
  return (
    <nav
      aria-label="主要導覽"
      className="fixed inset-x-0 bottom-0 border-t border-border bg-card px-3 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {items.map((item) => (
          <button
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-xs text-muted-foreground"
            key={item.label}
            type="button"
          >
            <item.icon aria-hidden="true" className="h-5 w-5" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
