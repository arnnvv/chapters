"use client";

import type { QAItem } from "@/app/api/ask-question/route";
import { getQAKey } from "@/lib/utils";
import type { FormEvent } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils"; // Import cn if you use it for classes

// +++ Add these imports for math rendering +++
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
// Make sure you have imported the KaTeX CSS in your global styles or layout:
// import 'katex/dist/katex.min.css';
// ++++++++++++++++++++++++++++++++++++++++++++++

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

      {/* Scrollable history area */}
      <div className="flex-grow overflow-y-auto mb-4 space-y-4 pr-2">
        {/* Placeholder when no history and not loading */}
        {history.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground italic">
            Ask a question about the content.
          </p>
        )}

        {/* Map through history items */}
        {history.map((item, index) => (
          <div key={getQAKey(item)} className="text-sm space-y-1">
            {/* User Question */}
            <div>
              <p className="font-semibold text-primary mb-0.5">You:</p>
              <p className="pl-2 whitespace-pre-wrap">{item.question}</p> {/* Allow wrapping for long questions */}
            </div>

            {/* Assistant Answer */}
            <div>
              <p className="font-semibold text-accent-foreground mb-0.5">
                Assistant:
              </p>
              {/* Container for Markdown rendering */}
              <div className={cn(
                "prose prose-sm max-w-none dark:prose-invert", // Base prose styles
                "markdown-content",                           // Your custom class for specific overrides
                "pl-2",                                       // Indentation
                "bg-background/50 p-2 rounded border border-border/50" // Background/border like the old <pre>
              )}>
                <ReactMarkdown
                  // +++ Updated plugins for math +++
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeHighlight, rehypeKatex]}
                  // ++++++++++++++++++++++++++++++++++
                  components={{ // Keep code block styling consistent if needed
                    code({ node, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      const isInline =
                        "inline" in props && typeof props.inline !== "undefined";

                      return !isInline && match ? (
                        <code
                          className={cn(
                            className,
                            "block p-3 rounded-md overflow-x-auto",
                            // Ensure KaTeX styles don't conflict badly here
                          )}
                          {...props}
                        >
                          {children}
                        </code>
                      ) : (
                        <code
                          className={cn(
                            "bg-muted px-1 py-0.5 rounded text-sm",
                            className,
                            // Ensure KaTeX styles don't conflict badly here
                          )}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    // Add other custom components like table, th, td if you had them before
                    // and want them applied here too.
                  }}
                >
                  {/* Display answer or 'Thinking...' if it's the last item and currently loading */}
                  {item.answer || (isLoading && index === history.length - 1 ? "Thinking..." : "...")}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {/* Loading indicator specific for the thinking state */}
        {isLoading && history.length > 0 && history[history.length - 1].answer === "" && (
          <p className="text-sm text-muted-foreground italic">
            Assistant is thinking...
          </p>
        )}
      </div>

      {/* Input form */}
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
