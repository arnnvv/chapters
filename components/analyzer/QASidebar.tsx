"use client";

import type { QAItem } from "@/app/api/ask-question/route";
import { getQAKey } from "@/lib/utils";
import type { FormEvent } from "react";

export function QASidebar({
  history,
  onAskQuestion,
  isLoading,
}: {
  history: QAItem[];
  onAskQuestion: (question: string) => void;
  isLoading: boolean;
}) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const question = formData.get("question") as string;
    if (question.trim()) {
      onAskQuestion(question.trim());
      e.currentTarget.reset();
    }
  };

  return (
    <div className="flex flex-col h-full p-4 border-l border-border bg-muted/40">
      <h3 className="text-lg font-semibold mb-4 text-muted-foreground shrink-0">
        Ask Questions
      </h3>

      <div className="flex-grow overflow-y-auto mb-4 space-y-4 pr-2">
        {history.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground italic">
            Ask a question about the content.
          </p>
        )}
        {history.map((item) => (
          <div key={getQAKey(item)} className="text-sm space-y-1">
            <div>
              <p className="font-semibold text-primary mb-0.5">You:</p>
              <p className="pl-2">{item.question}</p>
            </div>
            <div>
              <p className="font-semibold text-accent-foreground mb-0.5">
                Assistant:
              </p>
              <pre className="whitespace-pre-wrap font-sans text-sm pl-2 bg-background/50 p-2 rounded border border-border/50">
                {item.answer}
              </pre>
            </div>
          </div>
        ))}
        {isLoading && (
          <p className="text-sm text-muted-foreground italic">
            {history.length > 0 && history[history.length - 1].answer === ""
              ? "Assistant is thinking..."
              : "Loading..."}
          </p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-auto pt-4 border-t border-border shrink-0"
      >
        <textarea
          name="question"
          rows={3}
          placeholder="Ask anything about the document..."
          className="w-full p-2 border rounded bg-input text-foreground border-border mb-2 text-sm focus:ring-ring focus:ring-1"
          required
          disabled={isLoading}
          aria-label="Ask a question"
        />
        <button
          type="submit"
          className="w-full px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm"
          disabled={isLoading}
        >
          {isLoading ? "Asking..." : "Ask"}
        </button>
      </form>
    </div>
  );
}
