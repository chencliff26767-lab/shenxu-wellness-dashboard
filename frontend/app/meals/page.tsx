import { Edit3, ImageIcon, Trash2, Utensils } from "lucide-react";
import { createMeal, deleteMeal, updateMeal } from "@/app/actions/meals";
import { BottomNav } from "@/components/bottom-nav";
import { MealForm } from "@/components/meal-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type MealEntry = {
  id: string;
  eaten_on: string;
  meal_type: string;
  title: string;
  note: string | null;
  photo_path: string | null;
  photo_url?: string | null;
};

type MealsPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
    updated?: string;
  }>;
};

const mealTypeLabels: Record<string, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "點心",
  other: "其他",
};

export default async function MealsPage({ searchParams }: MealsPageProps) {
  const params = await searchParams;
  const meals = await getMeals();

  return (
    <main className="min-h-dvh pb-[calc(88px+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-md px-5 pt-[calc(24px+env(safe-area-inset-top))]">
        <p className="text-sm text-muted-foreground">紀錄</p>
        <h1 className="mt-1 text-3xl font-semibold">飲食紀錄</h1>

        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Utensils aria-hidden="true" className="h-4 w-4" />
            餐點、照片與備註
          </div>

          {params?.saved ? <p className="mb-3 rounded-md bg-muted p-3 text-sm text-muted-foreground">已儲存。</p> : null}
          {params?.updated ? <p className="mb-3 rounded-md bg-muted p-3 text-sm text-muted-foreground">已更新。</p> : null}
          {params?.error ? (
            <p className="mb-3 rounded-md bg-muted p-3 text-sm text-muted-foreground">儲存失敗：{params.error}</p>
          ) : null}

          <MealForm action={createMeal} submitLabel="儲存飲食紀錄" />
        </section>

        <section className="mt-4 space-y-3">
          <h2 className="text-xl font-semibold">最近紀錄</h2>
          {meals.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-5 text-muted-foreground">還沒有飲食紀錄。</div>
          ) : (
            meals.map((meal) => <MealCard key={meal.id} meal={meal} />)
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

async function getMeals(): Promise<MealEntry[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meal_entries")
    .select("id, eaten_on, meal_type, title, note, photo_path")
    .order("eaten_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);

  if (error || !data) {
    return [];
  }

  return Promise.all(
    data.map(async (meal) => {
      if (!meal.photo_path) {
        return { ...meal, photo_url: null };
      }

      const { data: signed } = await supabase.storage.from("wellness-private").createSignedUrl(meal.photo_path, 60 * 60);
      return { ...meal, photo_url: signed?.signedUrl || null };
    }),
  );
}

function MealCard({ meal }: { meal: MealEntry }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {meal.eaten_on} · {mealTypeLabels[meal.meal_type] || "其他"}
          </p>
          <h3 className="mt-1 text-xl font-semibold">{meal.title}</h3>
        </div>
        <form action={deleteMeal}>
          <input name="id" type="hidden" value={meal.id} />
          <input name="photo_path" type="hidden" value={meal.photo_path || ""} />
          <button
            aria-label="刪除飲食紀錄"
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            type="submit"
          >
            <Trash2 aria-hidden="true" className="h-5 w-5" />
          </button>
        </form>
      </div>

      {meal.photo_url ? (
        <img alt={meal.title} className="mt-3 aspect-[4/3] w-full rounded-md object-cover" src={meal.photo_url} />
      ) : (
        <div className="mt-3 flex min-h-24 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
          <ImageIcon aria-hidden="true" className="mr-2 h-4 w-4" />
          尚無照片
        </div>
      )}

      {meal.note ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{meal.note}</p> : null}

      <details className="mt-3 rounded-md border border-border p-3">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground">
          <Edit3 aria-hidden="true" className="h-4 w-4" />
          編輯
        </summary>
        <div className="mt-3">
          <MealForm action={updateMeal} meal={meal} submitLabel="更新飲食紀錄" />
        </div>
      </details>
    </article>
  );
}
