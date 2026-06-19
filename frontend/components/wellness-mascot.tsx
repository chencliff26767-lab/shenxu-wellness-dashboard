import Image from "next/image";
import { cn } from "@/lib/utils";

export function WellnessMascot({ className }: { className?: string }) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={cn("object-contain", className)}
      height={160}
      src="/wellness-mascot.png"
      unoptimized
      width={120}
    />
  );
}
