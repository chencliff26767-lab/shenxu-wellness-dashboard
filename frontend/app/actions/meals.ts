"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const DISPLAY_HARD_LIMIT_BYTES = 500 * 1024;
const THUMBNAIL_HARD_LIMIT_BYTES = 60 * 1024;
const MEAL_TYPES = new Set(["breakfast", "lunch", "dinner", "snack", "other"]);
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function optionalText(value: FormDataEntryValue | null) { const result = String(value || "").trim(); return result || null; }
function optionalInteger(value: FormDataEntryValue | null) { const raw = String(value ?? "").trim(); const parsed = Number(raw); return raw && Number.isInteger(parsed) && parsed > 0 ? parsed : null; }

function getFile(formData: FormData, name: string) {
  const file = formData.get(name);
  return file instanceof File && file.size > 0 ? file : null;
}

function validatePhotos(photo: File | null, thumbnail: File | null) {
  if (!photo && !thumbnail) return;
  if (!photo || !thumbnail || photo.type !== "image/webp" || thumbnail.type !== "image/webp") redirect("/meals?error=photos-must-be-webp");
  if (photo.size > DISPLAY_HARD_LIMIT_BYTES) redirect("/meals?error=photo-too-large");
  if (thumbnail.size > THUMBNAIL_HARD_LIMIT_BYTES) redirect("/meals?error=thumbnail-too-large");
}

function payloadFromForm(formData: FormData, userId: string) {
  const eatenOn = String(formData.get("eaten_on") || "").trim();
  const mealType = String(formData.get("meal_type") || "").trim();
  const title = String(formData.get("title") || "").trim();
  if (!eatenOn || !MEAL_TYPES.has(mealType) || !title) redirect("/meals?error=invalid");
  return { owner_id: userId, eaten_on: eatenOn, meal_type: mealType, title, note: optionalText(formData.get("note")) };
}

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function uploadPhotos(supabase: SupabaseClient, entryId: string, userId: string, photo: File, thumbnail: File, formData: FormData) {
  const photoPath = `${userId}/meals/${entryId}-display.webp`;
  const thumbnailPath = `${userId}/meals/${entryId}-thumbnail.webp`;
  const { error: photoError } = await supabase.storage.from("wellness-private").upload(photoPath, photo, { contentType: "image/webp", upsert: true });
  if (photoError) throw photoError;
  const { error: thumbnailError } = await supabase.storage.from("wellness-private").upload(thumbnailPath, thumbnail, { contentType: "image/webp", upsert: true });
  if (thumbnailError) throw thumbnailError;
  const { error: updateError } = await supabase.from("meal_entries").update({
    photo_path: photoPath,
    thumbnail_path: thumbnailPath,
    photo_width_px: optionalInteger(formData.get("photo_width_px")),
    photo_height_px: optionalInteger(formData.get("photo_height_px")),
    photo_size_bytes: photo.size,
    thumbnail_size_bytes: thumbnail.size,
    compression_version: 2,
  }).eq("id", entryId);
  if (updateError) throw updateError;
  return { photoPath, thumbnailPath };
}

export async function createMeal(formData: FormData) {
  const { supabase, user } = await requireUser();
  const photo = getFile(formData, "photo");
  const thumbnail = getFile(formData, "thumbnail");
  validatePhotos(photo, thumbnail);
  const { data, error } = await supabase.from("meal_entries").insert(payloadFromForm(formData, user.id)).select("id").single();
  if (error || !data) redirect(`/meals?error=${encodeURIComponent(error?.message || "insert-failed")}`);
  if (photo && thumbnail) {
    try { await uploadPhotos(supabase, data.id, user.id, photo, thumbnail, formData); }
    catch (caught) {
      await supabase.from("meal_entries").delete().eq("id", data.id);
      await supabase.storage.from("wellness-private").remove([`${user.id}/meals/${data.id}-display.webp`, `${user.id}/meals/${data.id}-thumbnail.webp`]);
      redirect(`/meals?error=${encodeURIComponent(caught instanceof Error ? caught.message : "upload-failed")}`);
    }
  }
  revalidatePath("/meals");
  redirect("/meals?saved=1");
}

export async function updateMeal(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") || "");
  if (!id) redirect("/meals?error=missing-id");
  const photo = getFile(formData, "photo");
  const thumbnail = getFile(formData, "thumbnail");
  validatePhotos(photo, thumbnail);
  const { data: existing } = await supabase.from("meal_entries").select("photo_path, thumbnail_path").eq("id", id).single();
  const { error } = await supabase.from("meal_entries").update(payloadFromForm(formData, user.id)).eq("id", id);
  if (error) redirect(`/meals?error=${encodeURIComponent(error.message)}`);
  if (photo && thumbnail) {
    try {
      const uploaded = await uploadPhotos(supabase, id, user.id, photo, thumbnail, formData);
      const obsolete = [existing?.photo_path, existing?.thumbnail_path].filter((path): path is string => Boolean(path && path !== uploaded.photoPath && path !== uploaded.thumbnailPath));
      if (obsolete.length) await supabase.storage.from("wellness-private").remove(obsolete);
    } catch (caught) { redirect(`/meals?error=${encodeURIComponent(caught instanceof Error ? caught.message : "upload-failed")}`); }
  }
  revalidatePath("/meals");
  redirect("/meals?updated=1");
}

export async function deleteMeal(formData: FormData) {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") || "");
  if (!id) redirect("/meals?error=missing-id");
  const { data: existing } = await supabase.from("meal_entries").select("photo_path, thumbnail_path").eq("id", id).single();
  const { error } = await supabase.from("meal_entries").delete().eq("id", id);
  if (error) redirect(`/meals?error=${encodeURIComponent(error.message)}`);
  const paths = [existing?.photo_path, existing?.thumbnail_path].filter((path): path is string => Boolean(path));
  if (paths.length) await supabase.storage.from("wellness-private").remove(paths);
  revalidatePath("/meals");
}

export async function cleanupMealOrphans() {
  const { supabase, user } = await requireUser();
  const folder = `${user.id}/meals`;
  const [{ data: files, error: listError }, { data: meals }] = await Promise.all([
    supabase.storage.from("wellness-private").list(folder, { limit: 1000 }),
    supabase.from("meal_entries").select("photo_path, thumbnail_path"),
  ]);
  if (listError) redirect(`/meals?error=${encodeURIComponent(listError.message)}`);
  const referenced = new Set((meals || []).flatMap((meal) => [meal.photo_path, meal.thumbnail_path]).filter(Boolean));
  const orphans = (files || []).map((file) => `${folder}/${file.name}`).filter((path) => !referenced.has(path));
  if (orphans.length) {
    const { error } = await supabase.storage.from("wellness-private").remove(orphans);
    if (error) redirect(`/meals?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/meals");
  redirect(`/meals?cleaned=${orphans.length}`);
}
