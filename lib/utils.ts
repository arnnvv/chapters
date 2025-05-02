import type { QAItem } from "@/app/api/ask-question/route";
import { clsx, type ClassValue } from "clsx";
import { createHash } from "crypto";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function getQAKey(item: QAItem): string {
  return createHash("sha256")
    .update(item.question + item.answer)
    .digest("hex");
}
