"use client";

import { Camera, Images } from "lucide-react";
import { useRef, useState, type ChangeEventHandler, type InputHTMLAttributes, type RefObject } from "react";

type PhotoPickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "type"> & {
  inputRef?: RefObject<HTMLInputElement | null>;
};

export function PhotoPicker({ disabled, inputRef, onChange, ...props }: PhotoPickerProps) {
  const fallbackRef = useRef<HTMLInputElement>(null);
  const ref = inputRef || fallbackRef;
  const [fileName, setFileName] = useState("");

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    setFileName(event.currentTarget.files?.[0]?.name || "");
    onChange?.(event);
  };

  function openPicker(useCamera: boolean) {
    const input = ref.current;
    if (!input) return;
    if (useCamera) input.setAttribute("capture", "environment");
    else input.removeAttribute("capture");
    input.click();
  }

  return (
    <div>
      <input {...props} className="sr-only" disabled={disabled} onChange={handleChange} ref={ref} type="file" />
      <div className="grid grid-cols-2 gap-2">
        <button className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50" disabled={disabled} onClick={() => openPicker(true)} type="button">
          <Camera aria-hidden="true" className="h-5 w-5" />
          拍照
        </button>
        <button className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium disabled:opacity-50" disabled={disabled} onClick={() => openPicker(false)} type="button">
          <Images aria-hidden="true" className="h-5 w-5" />
          選擇照片
        </button>
      </div>
      <p aria-live="polite" className="mt-2 truncate text-sm text-muted-foreground">{fileName || "尚未選擇照片"}</p>
    </div>
  );
}
