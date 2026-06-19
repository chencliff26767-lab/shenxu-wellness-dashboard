"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MAX_PHOTO_BYTES = 500 * 1024;
const MEAL_TYPES = new Set(["breakfast", "lunch", "dinner", "snack", "other"]);

function asOptionalText(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text || null;
}

function getPhoto(formData: FormData) {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }
  return file;
}

function validatePhoto(photo: File | null) {
  if (photo && photo.type !== "image/webp") {
    redirect("/meals?error=photo-must-be-webp");
  }
  if (photo && photo.size > MAX_PHOTO_BYTES) {
    redirect("/meals?error=photo-too-large");
  }
}

function payloadFromForm(formData: FormData, userId: string) {
  const eatenOn = String(formData.get("eaten_on") || "").trim();
  const mealType = String(formData.get("meal_type") || "").trim();
  const title = String(formData.get("title") || "").trim();

  if (!eatenOn || !MEAL_TYPES.has(mealType) || !title) {
    redirect("/meals?error=invalid");
  }

  return {
    owner_id: userId,
    eaten_on: eatenOn,
    meal_type: mealType,
    title,
    note: asOptionalText(formData.get("note")),
  };
}

async function uploadPhoto(entryId: string, userId: string, photo: File) {
  const supabase = await createClient();
  const photoPath = `${userId}/meals/${entryId}.webp`;
  const { error: uploadError } = await supabase.storage.from("wellness-private").upload(photoPath, photo, {
    contentType: "image/webp",
    upsert: true,
  });

  if (uploadError) {
    redirect(`/meals?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { error: updateError } = await supabase.from("meal_entries").update({ photo_path: photoPath }).eq("id", entryId);

  if (updateError) {
    redirect(`/meals?error=${encodeURIComponent(updateError.message)}`);
  }
}

export async function createMeal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const photo = getPhoto(formData);
  validatePhoto(photo);

  const { data, error } = await supabase
    .from("meal_entries")
    .insert(payloadFromForm(formData, user.id))
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/meals?error=${encodeURIComponent(error?.message || "insert-failed")}`);
  }

  if (photo) {
    await uploadPhoto(data.id, user.id, photo);
  }

  revalidatePath("/meals");
  redirect("/meals?saved=1");
}

export async function updateMeal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const id = String(formData.get("id") || "");
  if (!id) {
    redirect("/meals?error=missing-id");
  }

  const photo = getPhoto(formData);
  validatePhoto(photo);

  const { error } = await supabase.from("meal_entries").update(payloadFromForm(formData, user.id)).eq("id", id);

  if (error) {
    redirect(`/meals?error=${encodeURIComponent(error.message)}`);
  }

  if (photo) {
    await uploadPhoto(id, user.id, photo);
  }

  revalidatePath("/meals");
  redirect("/meals?updated=1");
}

export async function deleteMeal(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") || "");
  const photoPath = String(formData.get("photo_path") || "");

  if (!id) {
    redirect("/meals?error=missing-id");
  }

  const { error } = await supabase.from("meal_entries").delete().eq("id", id);

  if (error) {
    redirect(`/meals?error=${encodeURIComponent(error.message)}`);
  }

  if (photoPath) {
    await supabase.storage.from("wellness-private").remove([photoPath]);
  }

  revalidatePath("/meals");
}
