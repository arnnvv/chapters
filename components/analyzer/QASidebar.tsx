// components/analyzer/QASidebar.tsx
"use client";
import type { FormEvent } from "react";
import type { QAItem } from "@/app/api/ask-question/route";
// Removed ReactMarkdown imports

interface QASidebarProps {
  history: QAItem[];
  onAskQuestion: (question: string) => void;
  isLoading: boolean;
}

export function QASidebar({ history, onAskQuestion, isLoading }: QASidebarProps) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const question = formData.get("question") as string;
    if (question.trim()) {
      onAskQuestion(question.trim());
      e.currentTarget.reset();
    }
  }

  return (
    <div className="flex flex-col h-full p-4 border-l border-border bg-muted/40">
      <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Ask Questions</h3>
      <div className="flex-grow overflow-y-auto mb-4 space-y-4">
        {history.length === 0 && <p className="text-sm text-muted-foreground">Ask a question about the content.</p>}
        {history.map((item, index) => (
          <div key={index} className="text-sm">
            <p className="font-semibold text-primary mb-1">You:</p>
            <p className="mb-2 pl-2">{item.question}</p>
            <p className="font-semibold text-accent-foreground mb-1">Assistant:</p>
            {/* Use <pre> tag to display raw text answer */}
            <pre className="whitespace-pre-wrap font-sans text-sm pl-2 bg-background/50 p-2 rounded">
              {item.answer}
            </pre>
          </div>
        ))}
        {isLoading && <p className="text-sm text-muted-foreground">Assistant is thinking...</p>}
      </div>
      <form onSubmit={handleSubmit} className="mt-auto">
        <textarea
          name="question"
          rows={3}
          placeholder="Ask anything about the document..."
          className="w-full p-2 border rounded bg-input text-foreground border-border mb-2"
          required
          disabled={isLoading}
        />
        <button
          type="submit"
          className="w-full px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "Asking..." : "Ask"}
        </button>
      </form>
    </div>
  );
}
