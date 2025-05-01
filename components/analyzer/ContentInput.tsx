"use client";
import type { ChangeEvent, FormEvent } from "react";

interface ContentInputProps {
  onSubmit: (text: string, background: string) => void; // Modified onSubmit
  isLoading: boolean;
}

export function ContentInput({ onSubmit, isLoading }: ContentInputProps) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const text = formData.get("textContent") as string;
    const background = formData.get("userBackground") as string; // Get background
    onSubmit(text, background); // Pass both
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 space-y-4">
      <div>
        <label htmlFor="textContent" className="block text-sm font-medium mb-1">
          Content to Analyze
        </label>
        <textarea
          id="textContent"
          name="textContent"
          rows={10}
          placeholder="Paste your code or text here..."
          className="w-full p-2 border rounded bg-input text-foreground border-border"
          required
          disabled={isLoading}
        />
      </div>
      <div>
        <label
          htmlFor="userBackground"
          className="block text-sm font-medium mb-1"
        >
          Your Background Knowledge
        </label>
        <textarea
          id="userBackground"
          name="userBackground"
          rows={3}
          placeholder="Briefly describe your relevant knowledge (e.g., 'Know Python basics', 'Familiar with calculus but not linear algebra')..."
          className="w-full p-2 border rounded bg-input text-foreground border-border"
          required
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        className="px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        disabled={isLoading}
      >
        {isLoading ? "Analyzing..." : "Start Learning"}
      </button>
    </form>
  );
}
