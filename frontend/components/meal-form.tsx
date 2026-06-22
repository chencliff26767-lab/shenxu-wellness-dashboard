"use client";

import { useRef, useState } from "react";
import { PhotoPicker } from "@/components/photo-picker";
import { Button } from "@/components/ui/button";

const DISPLAY_TARGET_BYTES = 180 * 1024;
const DISPLAY_HARD_LIMIT_BYTES = 500 * 1024;
const THUMBNAIL_TARGET_BYTES = 40 * 1024;
const THUMBNAIL_HARD_LIMIT_BYTES = 60 * 1024;

type MealFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  meal?: { id: string; eaten_on: string; meal_type: string; title: string; note: string | null; photo_path: string | null };
  submitLabel: string;
};

export function MealForm({ action, meal, submitLabel }: MealFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const thumbnailRef = useRef<HTMLInputElement>(null);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [dimensions, setDimensions] = useState({ width: "", height: "" });

  async function handlePhotoChange() {
    const input = inputRef.current;
    const file = input?.files?.[0];
    setPhotoMessage(null);
    if (!input || !file) return;
    if (!file.type.startsWith("image/") && !isHeic(file)) {
      input.value = "";
      setPhotoMessage("請選擇圖片檔。");
      return;
    }

    setIsCompressing(true);
    try {
      const image = await loadImage(file);
      const display = await compressAdaptive(image, 1280, DISPLAY_TARGET_BYTES, DISPLAY_HARD_LIMIT_BYTES, "meal-display.webp");
      const thumbnail = await compressAdaptive(image, 360, THUMBNAIL_TARGET_BYTES, THUMBNAIL_HARD_LIMIT_BYTES, "meal-thumbnail.webp");
      setFileInput(input, display.file);
      if (thumbnailRef.current) setFileInput(thumbnailRef.current, thumbnail.file);
      setDimensions({ width: String(display.width), height: String(display.height) });
      setPhotoMessage(`${isHeic(file) ? "HEIC/HEIF 已成功轉換。" : ""}主圖 ${(display.file.size / 1024).toFixed(0)}KB，縮圖 ${(thumbnail.file.size / 1024).toFixed(0)}KB。`);
    } catch {
      input.value = "";
      if (thumbnailRef.current) thumbnailRef.current.value = "";
      setDimensions({ width: "", height: "" });
      setPhotoMessage(isHeic(file) ? "此瀏覽器無法解碼這張 HEIC/HEIF；請在 iPhone 分享時選擇「最相容」或先轉成 JPG。" : "照片壓縮失敗，請換一張圖片。");
    } finally {
      setIsCompressing(false);
    }
  }

  return (
    <form action={action} className="space-y-3">
      {meal ? <input name="id" type="hidden" value={meal.id} /> : null}
      <input name="photo_width_px" type="hidden" value={dimensions.width} />
      <input name="photo_height_px" type="hidden" value={dimensions.height} />
      <input name="compression_version" type="hidden" value="2" />
      <input className="sr-only" name="thumbnail" ref={thumbnailRef} type="file" />
      <Field defaultValue={meal?.eaten_on || new Date().toISOString().slice(0, 10)} label="日期" name="eaten_on" type="date" />

      <label className="block text-sm font-medium" htmlFor={meal ? `meal_type-${meal.id}` : "meal_type"}>餐別</label>
      <select className="min-h-11 w-full rounded-md border border-border bg-card px-3 text-base outline-none focus:ring-2 focus:ring-primary" defaultValue={meal?.meal_type || "lunch"} id={meal ? `meal_type-${meal.id}` : "meal_type"} name="meal_type">
        <option value="breakfast">早餐</option><option value="lunch">午餐</option><option value="dinner">晚餐</option><option value="snack">點心</option><option value="other">其他</option>
      </select>

      <label className="block text-sm font-medium" htmlFor={meal ? `title-${meal.id}` : "title"}>內容</label>
      <input className="min-h-11 w-full rounded-md border border-border bg-card px-3 text-base outline-none focus:ring-2 focus:ring-primary" defaultValue={meal?.title || ""} id={meal ? `title-${meal.id}` : "title"} name="title" placeholder="例如 雞胸便當、優格、拿鐵" required />

      <label className="block text-sm font-medium" htmlFor={meal ? `note-${meal.id}` : "note"}>備註</label>
      <textarea className="min-h-24 w-full rounded-md border border-border bg-card px-3 py-2 text-base outline-none focus:ring-2 focus:ring-primary" defaultValue={meal?.note || ""} id={meal ? `note-${meal.id}` : "note"} name="note" placeholder="份量、飽足感、外食店家..." />

      <label className="block text-sm font-medium" htmlFor={meal ? `photo-${meal.id}` : "photo"}>照片</label>
      {meal?.photo_path ? <p className="text-sm text-muted-foreground">已經有照片；重新選擇會覆蓋。</p> : null}
      <PhotoPicker accept="image/*,.heic,.heif" disabled={isCompressing} id={meal ? `photo-${meal.id}` : "photo"} inputRef={inputRef} name="photo" onChange={handlePhotoChange} />
      {photoMessage ? <p className="text-sm text-muted-foreground">{photoMessage}</p> : null}

      <Button className="w-full" disabled={isCompressing} type="submit">{isCompressing ? "壓縮照片中..." : submitLabel}</Button>
    </form>
  );
}

function Field({ defaultValue, label, name, type }: { defaultValue?: string; label: string; name: string; type: "date" }) {
  return <label className="block text-sm font-medium">{label}<input className="mt-1 min-h-11 w-full rounded-md border border-border bg-card px-3 text-base outline-none focus:ring-2 focus:ring-primary" defaultValue={defaultValue} name={name} required type={type} /></label>;
}

async function compressAdaptive(image: HTMLImageElement, maxWidth: number, targetBytes: number, hardLimitBytes: number, filename: string) {
  let width = Math.min(image.naturalWidth, maxWidth);
  let height = Math.round((image.naturalHeight / image.naturalWidth) * width);
  let best: { blob: Blob; width: number; height: number } | null = null;

  for (let resizeRound = 0; resizeRound < 5; resizeRound += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.74, 0.66, 0.58, 0.5]) {
      const blob = await canvasToBlob(canvas, quality);
      if (blob.size <= hardLimitBytes) best = { blob, width: canvas.width, height: canvas.height };
      if (blob.size <= targetBytes) return { file: new File([blob], filename, { type: "image/webp" }), width: canvas.width, height: canvas.height };
    }
    width *= 0.85;
    height *= 0.85;
  }

  if (!best) throw new Error("compress-failed");
  return { file: new File([best.blob], filename, { type: "image/webp" }), width: best.width, height: best.height };
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image-load-failed")); };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("to-blob-failed")), "image/webp", quality));
}

function setFileInput(input: HTMLInputElement, file: File) {
  const files = new DataTransfer();
  files.items.add(file);
  input.files = files.files;
}

function isHeic(file: File) {
  return ["image/heic", "image/heif"].includes(file.type.toLowerCase()) || /\.(heic|heif)$/i.test(file.name);
}
