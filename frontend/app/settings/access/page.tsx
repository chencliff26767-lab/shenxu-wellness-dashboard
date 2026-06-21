import Link from "next/link";
import { headers } from "next/headers";
import { CheckCircle2, Link2, ShieldCheck, UserPlus, X } from "lucide-react";
import {
  acceptCoachInvitation,
  createCoachInvitation,
  deleteCoachInvitation,
  revokeCoachAccess,
  updateCoachPermission,
} from "@/app/actions/coach";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

type Relationship = {
  id: string;
  coach_id: string | null;
  status: string;
  manage_plans: boolean;
  invited_email: string | null;
  invite_token: string | null;
  accepted_at: string | null;
};

type AccessPageProps = {
  searchParams?: Promise<{ invite?: string; invited?: string; error?: string }>;
};

export default async function AccessPage({ searchParams }: AccessPageProps) {
  const params = await searchParams;
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: owner } = user ? await supabase.from("app_owners").select("user_id").eq("user_id", user.id).maybeSingle() : { data: null };
  const { data } = user
    ? await supabase.from("coach_relationships").select("id, coach_id, status, manage_plans, invited_email, invite_token, accepted_at").or(`owner_id.eq.${user.id},coach_id.eq.${user.id}`).order("created_at", { ascending: false })
    : { data: [] };
  const relationships = (data || []) as Relationship[];
  const isCoach = relationships.some((relationship) => relationship.coach_id === user?.id);
  const isOwner = Boolean(owner) || !isCoach;

  return (
    <main className="min-h-dvh pb-[calc(88px+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-md px-5 pt-[calc(24px+env(safe-area-inset-top))]">
        <p className="text-sm text-muted-foreground">設定</p>
        <h1 className="mt-1 text-3xl font-semibold">教練存取權</h1>

        {params?.error ? <p className="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground" role="alert">操作失敗：{params.error}</p> : null}
        {params?.invited ? <p aria-live="polite" className="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground" role="status">邀請已建立。</p> : null}

        {params?.invite ? (
          <section className="mt-6 rounded-lg border border-border bg-card p-5">
            <ShieldCheck aria-hidden="true" className="h-7 w-7 text-primary" />
            <h2 className="mt-3 text-xl font-semibold">接受教練邀請</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">接受後可查看授權的健康、飲食、訓練與計畫資料。</p>
            <form action={acceptCoachInvitation} className="mt-4">
              <input name="token" type="hidden" value={params.invite} />
              <Button className="w-full" type="submit">接受邀請</Button>
            </form>
          </section>
        ) : null}

        {isOwner ? (
          <>
            <section className="mt-6 rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><UserPlus aria-hidden="true" className="h-4 w-4" />邀請教練</div>
              <form action={createCoachInvitation} className="mt-4 space-y-3">
                <label className="block text-sm font-medium">教練 Email，可選
                  <input className="mt-1 min-h-11 w-full rounded-md border border-border bg-card px-3" name="invited_email" placeholder="coach@example.com" type="email" />
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input className="h-5 w-5 accent-primary" name="manage_plans" type="checkbox" />
                  允許建立與調整訓練計畫
                </label>
                <Button className="w-full" type="submit">建立邀請連結</Button>
              </form>
            </section>

            <section className="mt-6 space-y-3">
              <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">目前關係</h2><Link className="text-sm text-muted-foreground underline underline-offset-4" href="/coach">Coach Dashboard</Link></div>
              {relationships.length ? relationships.map((relationship) => <RelationshipCard key={relationship.id} origin={origin} relationship={relationship} />) : <p className="rounded-lg border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">尚未連結教練。</p>}
            </section>
          </>
        ) : relationships.some((relationship) => relationship.status === "active") ? (
          <section className="mt-6 rounded-lg border border-border bg-card p-5">
            <CheckCircle2 aria-hidden="true" className="h-7 w-7 text-primary" />
            <h2 className="mt-3 text-xl font-semibold">教練權限已啟用</h2>
            <Link className="mt-4 flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" href="/coach">開啟 Coach Dashboard</Link>
          </section>
        ) : null}
      </div>
      <BottomNav />
    </main>
  );
}

function RelationshipCard({ origin, relationship }: { origin: string; relationship: Relationship }) {
  if (relationship.status === "pending") {
    const invitePath = `/settings/access?invite=${relationship.invite_token}`;
    return (
      <article className="rounded-lg border border-border bg-card p-4">
        <p className="font-medium">等待接受{relationship.invited_email ? ` · ${relationship.invited_email}` : ""}</p>
        <label className="mt-3 block text-xs text-muted-foreground">邀請連結
          <input className="mt-1 min-h-11 w-full rounded-md border border-border bg-muted px-3 text-sm text-foreground" readOnly value={`${origin}${invitePath}`} />
        </label>
        <form action={deleteCoachInvitation} className="mt-2">
          <input name="id" type="hidden" value={relationship.id} />
          <Button className="w-full" type="submit" variant="ghost"><X aria-hidden="true" className="h-4 w-4" />取消邀請</Button>
        </form>
      </article>
    );
  }

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <p className="flex items-center gap-2 font-medium"><Link2 aria-hidden="true" className="h-4 w-4" />{relationship.status === "active" ? "已連結" : "已撤銷"}</p>
      {relationship.status === "active" ? (
        <>
          <form action={updateCoachPermission} className="mt-3 flex items-center justify-between gap-3">
            <input name="id" type="hidden" value={relationship.id} />
            <label className="flex min-h-11 items-center gap-2 text-sm"><input className="h-5 w-5 accent-primary" defaultChecked={relationship.manage_plans} name="manage_plans" type="checkbox" />管理計畫</label>
            <Button type="submit" variant="secondary">儲存</Button>
          </form>
          <form action={revokeCoachAccess} className="mt-2">
            <input name="id" type="hidden" value={relationship.id} />
            <Button className="w-full" type="submit" variant="ghost">撤銷存取權</Button>
          </form>
        </>
      ) : null}
    </article>
  );
}
