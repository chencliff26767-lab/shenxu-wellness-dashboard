"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const MAX_PHOTO_BYTES = 500 * 1024;
const MAX_PHOTO_WIDTH = 1280;

type MealFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  meal?: {
    id: string;
    eaten_on: string;
    meal_type: string;
    title: string;
    note: string | null;
    photo_path: string | null;
  };
  submitLabel: string;
};

export function MealForm({ action, meal, submitLabel }: MealFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  async function handlePhotoChange() {
    const input = inputRef.current;
    const file = input?.files?.[0];
    setPhotoMessage(null);

    if (!input || !file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      input.value = "";
      setPhotoMessage("請選擇圖片檔。");
      return;
    }

    setIsCompressing(true);
    try {
      const compressed = await compressPhoto(file);
      if (compressed.size > MAX_PHOTO_BYTES) {
        input.value = "";
        setPhotoMessage("照片壓縮後仍超過 500KB，請裁切或重新拍近一點再上傳。");
        return;
      }

      const files = new DataTransfer();
      files.items.add(compressed);
      input.files = files.files;
      setPhotoMessage(`已壓縮為 ${(compressed.size / 1024).toFixed(0)}KB WebP。`);
    } catch {
      input.value = "";
      setPhotoMessage("照片壓縮失敗，請換一張圖片。");
    } finally {
      setIsCompressing(false);
    }
  }

  return (
    <form action={action} className="space-y-3">
      {meal ? <input name="id" type="hidden" value={meal.id} /> : null}
      <Field defaultValue={meal?.eaten_on || new Date().toISOString().slice(0, 10)} label="日期" name="eaten_on" type="date" />

      <label className="block text-sm font-medium" htmlFor={meal ? `meal_type-${meal.id}` : "meal_type"}>
        餐別
      </label>
      <select
        className="min-h-11 w-full rounded-md border border-border bg-card px-3 text-base outline-none focus:ring-2 focus:ring-primary"
        defaultValue={meal?.meal_type || "lunch"}
        id={meal ? `meal_type-${meal.id}` : "meal_type"}
        name="meal_type"
      >
        <option value="breakfast">早餐</option>
        <option value="lunch">午餐</option>
        <option value="dinner">晚餐</option>
        <option value="snack">點心</option>
        <option value="other">其他</option>
      </select>

      <label className="block text-sm font-medium" htmlFor={meal ? `title-${meal.id}` : "title"}>
        內容
      </label>
      <input
        className="min-h-11 w-full rounded-md border border-border bg-card px-3 text-base outline-none focus:ring-2 focus:ring-primary"
        defaultValue={meal?.title || ""}
        id={meal ? `title-${meal.id}` : "title"}
        name="title"
        placeholder="例如 雞胸便當、優格、拿鐵"
        required
      />

      <label className="block text-sm font-medium" htmlFor={meal ? `note-${meal.id}` : "note"}>
        備註
      </label>
      <textarea
        className="min-h-24 w-full rounded-md border border-border bg-card px-3 py-2 text-base outline-none focus:ring-2 focus:ring-primary"
        defaultValue={meal?.note || ""}
        id={meal ? `note-${meal.id}` : "note"}
        name="note"
        placeholder="份量、飽足感、外食店家..."
      />

      <label className="block text-sm font-medium" htmlFor={meal ? `photo-${meal.id}` : "photo"}>
        照片
      </label>
      {meal?.photo_path ? <p className="text-sm text-muted-foreground">已經有照片；重新選擇會覆蓋。</p> : null}
      <input
        accept="image/*"
        className="min-h-11 w-full rounded-md border border-border bg-card px-3 py-2 text-base outline-none file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm focus:ring-2 focus:ring-primary"
        disabled={isCompressing}
        id={meal ? `photo-${meal.id}` : "photo"}
        name="photo"
        onChange={handlePhotoChange}
        ref={inputRef}
        type="file"
      />
      {photoMessage ? <p className="text-sm text-muted-foreground">{photoMessage}</p> : null}

      <Button className="w-full" disabled={isCompressing} type="submit">
        {isCompressing ? "壓縮照片中..." : submitLabel}
      </Button>
    </form>
  );
}

function Field({
  defaultValue,
  label,
  name,
  type,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  type: "date";
}) {
  return (
    <>
      <label className="block text-sm font-medium" htmlFor={`${name}-${label}`}>
        {label}
      </label>
      <input
        className="min-h-11 w-full rounded-md border border-border bg-card px-3 text-base outline-none focus:ring-2 focus:ring-primary"
        defaultValue={defaultValue}
        id={`${name}-${label}`}
        name={name}
        required
        type={type}
      />
    </>
  );
}

async function compressPhoto(file: File) {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_PHOTO_WIDTH / image.naturalWidth);
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);

  // ponytail: fixed quality ladder keeps compression dependency-free — ceiling: awkward photos can still exceed 500KB — upgrade: add iterative resizing.
  for (const quality of [0.72, 0.64, 0.56, 0.48]) {
    const blob = await canvasToBlob(canvas, quality);
    if (blob.size <= MAX_PHOTO_BYTES || quality === 0.48) {
      return new File([blob], "meal.webp", { type: "image/webp" });
    }
  }

  throw new Error("compress-failed");
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image-load-failed"));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("to-blob-failed"))), "image/webp", quality);
  });
}
