import Link from "next/link";
import { BookOpen, CalendarDays, HeartPulse, Plus, UserRound } from "lucide-react";

const items = [
  { label: "今日", href: "/today", icon: HeartPulse },
  { label: "計畫", href: "/plans", icon: CalendarDays },
  { label: "飲食", href: "/meals", icon: Plus },
  { label: "身材", href: "/body", icon: BookOpen },
  { label: "教練", href: "/settings/access", icon: UserRound },
];

export function BottomNav() {
  return (
    <nav
      aria-label="底部導覽"
      className="fixed inset-x-0 bottom-0 border-t border-border bg-card px-3 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {items.map((item) => (
          <Link
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-xs text-muted-foreground"
            href={item.href}
            key={item.label}
          >
            <item.icon aria-hidden="true" className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
