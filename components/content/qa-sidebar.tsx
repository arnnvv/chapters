"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
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
import type { QAItem } from "@/app/api/ask-question/route";
import { getQAKey } from "@/lib/utils";

export function QASidebar({
  history,
  onAskQuestion,
  isLoading,
}: {
  history: QAItem[];
  onAskQuestion: (question: string) => void;
  isLoading: boolean;
}) {
  const [question, setQuestion] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (question.trim() && !isLoading) {
      onAskQuestion(question.trim());
      setQuestion("");
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const scrollableViewport = scrollAreaRef.current
            .children[0] as HTMLElement;
          if (scrollableViewport) {
            scrollableViewport.scrollTop = scrollableViewport.scrollHeight;
          }
        }
      }, 0);
    }
  }, [history, isLoading]);

  return (
    <div className="flex flex-col h-full border-l border-border bg-background">
      <div className="p-4 border-b border-border shrink-0">
        <h2 className="text-lg font-semibold">Ask Questions</h2>
      </div>
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 space-y-6">
          {history.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 text-sm text-muted-foreground">
              Ask a question about the document content using the input below.
            </div>
          ) : (
            history.map((item, index) => (
              <div key={getQAKey(item)} className="space-y-3">
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground p-3 rounded-lg max-w-[80%]">
                    <p className="text-sm">{item.question}</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg max-w-[80%]">
                    {isLoading &&
                    index === history.length - 1 &&
                    !item.answer ? (
                      <div className="flex items-center space-x-2 py-1">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Thinking...
                        </span>
                      </div>
                    ) : (
                      <div className="prose prose-sm sm:prose-base lg:prose-xl dark:prose-invert max-w-none markdown-content text-foreground">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeHighlight, rehypeKatex]}
                          components={{
                            code({ node, className, children, ...props }) {
                              const match = /language-(\w+)/.exec(
                                className || "",
                              );
                              const isBlock = !!match;
                              if (isBlock) {
                                return (
                                  <div className="my-2 rounded-md overflow-hidden">
                                    <pre
                                      className={cn(
                                        "overflow-x-auto",
                                        className,
                                      )}
                                    >
                                      <code>{children}</code>
                                    </pre>
                                  </div>
                                );
                              }
                              return (
                                <code
                                  className={cn(
                                    "bg-muted/50 px-1 py-0.5 rounded font-mono",
                                    className,
                                  )}
                                >
                                  {children}
                                </code>
                              );
                            },
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
      <div className="p-4 border-t border-border shrink-0 bg-background">
        <form onSubmit={handleSubmit} className="flex items-start gap-2">
          <Textarea
            placeholder="Ask anything..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isLoading}
            className="flex-1 resize-none min-h-[40px] max-h-[150px] text-sm"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !question.trim()}
            className="h-10 w-10 shrink-0"
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
