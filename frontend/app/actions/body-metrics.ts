"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MAX_REPORT_BYTES = 5 * 1024 * 1024;

function asPositiveNumber(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function asOptionalText(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text || null;
}

function getReportFile(formData: FormData) {
  const file = formData.get("inbody_report");
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }
  return file;
}

function validateReport(report: File | null) {
  if (report && !["image/jpeg", "image/jpg"].includes(report.type)) {
    redirect("/body?error=report-must-be-jpg");
  }
  if (report && report.size > MAX_REPORT_BYTES) {
    redirect("/body?error=report-too-large");
  }
}

function payloadFromForm(formData: FormData, userId: string, measuredOn: string, weightKg: number) {
  return {
    owner_id: userId,
    measured_on: measuredOn,
    weight_kg: weightKg,
    waist_cm: asPositiveNumber(formData.get("waist_cm")),
    note: asOptionalText(formData.get("note")),
    body_fat_percent: asPositiveNumber(formData.get("body_fat_percent")),
    skeletal_muscle_mass_kg: asPositiveNumber(formData.get("skeletal_muscle_mass_kg")),
    body_fat_mass_kg: asPositiveNumber(formData.get("body_fat_mass_kg")),
    waist_hip_ratio: asPositiveNumber(formData.get("waist_hip_ratio")),
    visceral_fat_level: asPositiveNumber(formData.get("visceral_fat_level")),
    basal_metabolic_rate_kcal: asPositiveNumber(formData.get("basal_metabolic_rate_kcal")),
  };
}

async function uploadReport(metricId: string, userId: string, report: File) {
  const supabase = await createClient();
  const reportPath = `${userId}/inbody/${metricId}.jpg`;
  const { error: uploadError } = await supabase.storage.from("wellness-private").upload(reportPath, report, {
    contentType: "image/jpeg",
    upsert: true,
  });

  if (uploadError) {
    redirect(`/body?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { error: updateError } = await supabase
    .from("body_metrics")
    .update({ inbody_report_path: reportPath })
    .eq("id", metricId);

  if (updateError) {
    redirect(`/body?error=${encodeURIComponent(updateError.message)}`);
  }
}

export async function createBodyMetric(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const measuredOn = String(formData.get("measured_on") || "").trim();
  const weightKg = asPositiveNumber(formData.get("weight_kg"));

  if (!measuredOn || !weightKg) {
    redirect("/body?error=invalid");
  }

  const report = getReportFile(formData);
  validateReport(report);

  const { data, error } = await supabase
    .from("body_metrics")
    .insert(payloadFromForm(formData, user.id, measuredOn, weightKg))
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/body?error=${encodeURIComponent(error?.message || "insert-failed")}`);
  }

  if (report) {
    await uploadReport(data.id, user.id, report);
  }

  revalidatePath("/body");
  redirect("/body?saved=1");
}

export async function updateBodyMetric(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const id = String(formData.get("id") || "");
  const measuredOn = String(formData.get("measured_on") || "").trim();
  const weightKg = asPositiveNumber(formData.get("weight_kg"));

  if (!id || !measuredOn || !weightKg) {
    redirect("/body?error=invalid");
  }

  const report = getReportFile(formData);
  validateReport(report);

  const { error } = await supabase
    .from("body_metrics")
    .update(payloadFromForm(formData, user.id, measuredOn, weightKg))
    .eq("id", id);

  if (error) {
    redirect(`/body?error=${encodeURIComponent(error.message)}`);
  }

  if (report) {
    await uploadReport(id, user.id, report);
  }

  revalidatePath("/body");
  redirect("/body?updated=1");
}

export async function deleteBodyMetric(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") || "");
  const reportPath = String(formData.get("report_path") || "");

  if (!id) {
    redirect("/body?error=missing-id");
  }

  const { error } = await supabase.from("body_metrics").delete().eq("id", id);

  if (error) {
    redirect(`/body?error=${encodeURIComponent(error.message)}`);
  }

  if (reportPath) {
    await supabase.storage.from("wellness-private").remove([reportPath]);
  }

  revalidatePath("/body");
}
