import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { createHash } from "crypto"; // Keep using crypto for keys
import type { QAItem } from "@/app/api/ask-question/route"; // Import your specific QAItem type

// Updated cn function from Shadcn template
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Keep your existing key generation logic
export function getQAKey(item: QAItem): string {
  // Ensure both question and answer are defined before hashing
  const question = item.question ?? "";
  const answer = item.answer ?? "";
  return createHash("sha256").update(question + answer).digest("hex");
}
