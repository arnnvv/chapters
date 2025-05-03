"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react"; // Added useEffect, useRef
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";
import type { QAItem } from "@/app/api/ask-question/route"; // Keep using your API type
import { getQAKey } from "@/lib/utils"; // Keep using your key generator

interface QASidebarProps {
  history: QAItem[];
  onAskQuestion: (question: string) => void;
  isLoading: boolean; // Loading state for the answer generation
}

export function QASidebar({
  history,
  onAskQuestion,
  isLoading,
}: QASidebarProps) {
  const [question, setQuestion] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null); // Ref for the scroll area content

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (question.trim() && !isLoading) {
      onAskQuestion(question.trim());
      setQuestion("");
    }
  };

  // Effect to scroll to bottom when new message/answer arrives or loading starts
  useEffect(() => {
    if (scrollAreaRef.current) {
      // Use setTimeout to allow the DOM to update before scrolling
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const scrollableViewport = scrollAreaRef.current.children[0] as HTMLElement; // Access the viewport div
          if (scrollableViewport) {
            scrollableViewport.scrollTop = scrollableViewport.scrollHeight;
          }
        }
      }, 0);
    }
  }, [history, isLoading]); // Trigger on history change or loading state change

  return (
    <div className="flex flex-col h-full border-l border-border bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border shrink-0">
        <h2 className="text-lg font-semibold">Ask Questions</h2>
      </div>

      {/* Messages Area */}
      {/* Use ScrollArea component */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 space-y-6">
          {history.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 text-sm text-muted-foreground">
              Ask a question about the document content using the input below.
            </div>
          ) : (
            history.map((item, index) => (
              <div key={getQAKey(item)} className="space-y-3">
                {/* User Question */}
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground p-3 rounded-lg max-w-[80%]">
                    <p className="text-sm">{item.question}</p>
                  </div>
                </div>

                {/* Assistant Answer */}
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg max-w-[80%]">
                    {/* Conditional rendering for loading state */}
                    {isLoading && index === history.length - 1 && !item.answer ? (
                      <div className="flex items-center space-x-2 py-1">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none markdown-content text-foreground">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeHighlight, rehypeKatex]}
                          components={{
                            // Consistent code styling
                            code({ node, className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || "");
                              const isBlock = !!match;
                              if (isBlock) {
                                return (
                                  <div className="my-2 rounded-md overflow-hidden bg-muted/50 dark:bg-secondary text-foreground">
                                    <pre className={cn("p-3 overflow-x-auto text-xs", className)}>
                                      <code>{children}</code>
                                    </pre>
                                  </div>
                                );
                              }
                              return (
                                <code className={cn("bg-muted/50 px-1 py-0.5 rounded text-xs font-mono", className)}>
                                  {children}
                                </code>
                              );
                            },
                            // Ensure other elements like lists, links are styled by prose
                          }}
                        >
                          {item.answer || "..."}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-border shrink-0 bg-background">
        <form onSubmit={handleSubmit} className="flex items-start gap-2">
          <Textarea
            placeholder="Ask anything..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isLoading}
            className="flex-1 resize-none min-h-[40px] max-h-[150px] text-sm" // Adjusted height
            rows={1} // Start with 1 row, auto-expands
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !question.trim()}
            className="h-10 w-10 shrink-0" // Ensure button size matches textarea height
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
