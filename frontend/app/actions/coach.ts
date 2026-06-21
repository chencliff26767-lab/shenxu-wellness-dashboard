"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function text(value: FormDataEntryValue | null) {
  const result = String(value ?? "").trim();
  return result || null;
}

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createCoachInvitation(formData: FormData) {
  const { supabase, user } = await requireUser();
  const invitedEmail = text(formData.get("invited_email"));
  const displayName = text(user.user_metadata?.full_name) || text(user.user_metadata?.name) || "Owner";
  const { data: owner } = await supabase.from("app_owners").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!owner) await supabase.from("app_owners").insert({ user_id: user.id, display_name: displayName });
  const { error } = await supabase.from("coach_relationships").insert({
    owner_id: user.id,
    coach_id: null,
    status: "pending",
    manage_plans: formData.get("manage_plans") === "on",
    invited_email: invitedEmail,
    invite_token: crypto.randomUUID(),
  });
  if (error) redirect(`/settings/access?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/settings/access");
  redirect("/settings/access?invited=1");
}

export async function acceptCoachInvitation(formData: FormData) {
  const { supabase } = await requireUser();
  const token = text(formData.get("token"));
  if (!token) redirect("/settings/access?error=missing-invite-token");
  const { error } = await supabase.rpc("accept_coach_invitation", { target_token: token });
  if (error) redirect(`/settings/access?invite=${token}&error=${encodeURIComponent(error.message)}`);
  revalidatePath("/settings/access");
  revalidatePath("/coach");
  redirect("/coach?accepted=1");
}

export async function updateCoachPermission(formData: FormData) {
  const { supabase } = await requireUser();
  const id = text(formData.get("id"));
  if (!id) redirect("/settings/access?error=missing-relationship-id");
  const { error } = await supabase
    .from("coach_relationships")
    .update({ manage_plans: formData.get("manage_plans") === "on", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) redirect(`/settings/access?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/settings/access");
}

export async function revokeCoachAccess(formData: FormData) {
  const { supabase } = await requireUser();
  const id = text(formData.get("id"));
  if (!id) redirect("/settings/access?error=missing-relationship-id");
  const { error } = await supabase
    .from("coach_relationships")
    .update({ status: "revoked", revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) redirect(`/settings/access?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/settings/access");
  revalidatePath("/coach");
}

export async function deleteCoachInvitation(formData: FormData) {
  const { supabase } = await requireUser();
  const id = text(formData.get("id"));
  if (!id) redirect("/settings/access?error=missing-relationship-id");
  const { error } = await supabase.from("coach_relationships").delete().eq("id", id).eq("status", "pending");
  if (error) redirect(`/settings/access?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/settings/access");
}

export async function createCoachFeedback(formData: FormData) {
  const { supabase, user } = await requireUser();
  const ownerId = text(formData.get("owner_id"));
  const body = text(formData.get("body"));
  if (!ownerId || !body) redirect("/coach?error=invalid-feedback");
  const { error } = await supabase.from("coach_feedback").insert({
    owner_id: ownerId,
    coach_id: user.id,
    body,
    target_type: "general",
  });
  if (error) redirect(`/coach?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/coach");
  redirect("/coach?feedback=1");
}

export async function createWeeklyGoal(formData: FormData) {
  const { supabase, user } = await requireUser();
  const ownerId = text(formData.get("owner_id"));
  const weekStart = text(formData.get("week_start"));
  const title = text(formData.get("title"));
  if (!ownerId || !weekStart || !title) redirect("/coach?error=invalid-goal");
  const { error } = await supabase.from("weekly_goals").insert({
    owner_id: ownerId,
    created_by: user.id,
    week_start: weekStart,
    title,
    note: text(formData.get("note")),
  });
  if (error) redirect(`/coach?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/coach");
  redirect("/coach?goal=1");
}

export async function updateWeeklyGoalStatus(formData: FormData) {
  const { supabase } = await requireUser();
  const id = text(formData.get("id"));
  const status = String(formData.get("status") || "");
  if (!id || !["active", "completed", "cancelled"].includes(status)) redirect("/coach?error=invalid-goal-status");
  const { error } = await supabase.from("weekly_goals").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect(`/coach?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/coach");
}

export async function deleteWeeklyGoal(formData: FormData) {
  const { supabase } = await requireUser();
  const id = text(formData.get("id"));
  if (!id) redirect("/coach?error=missing-goal-id");
  const { error } = await supabase.from("weekly_goals").delete().eq("id", id);
  if (error) redirect(`/coach?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/coach");
}
