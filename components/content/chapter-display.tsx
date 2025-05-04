"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ChapterDisplayProps {
  title: string;
  content: string;
  currentChapter: number;
  totalChapters: number;
  isLoading: boolean; // Loading state for *this* chapter
  onNext: () => void;
  onPrev: () => void;
  isNavDisabled: boolean; // Global navigation disable state
}

export function ChapterDisplay({
  title,
  content,
  currentChapter,
  totalChapters,
  isLoading,
  onNext,
  onPrev,
  isNavDisabled,
}: ChapterDisplayProps) {
  const canGoPrev = currentChapter > 1;
  const canGoNext = currentChapter < totalChapters;

  return (
    <div className="flex flex-col h-full bg-card text-card-foreground rounded-lg border">
      {/* Header with Title and Navigation */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between sticky top-0 bg-card/95 backdrop-blur z-10 rounded-t-lg">
        <h2 className="text-lg md:text-xl font-semibold truncate pr-4">
          {isLoading ? (
            <Skeleton className="h-6 w-48" />
          ) : title ? (
            title
          ) : currentChapter > 0 ? (
            `Chapter ${currentChapter}`
          ) : (
            "Document Content"
          )}
        </h2>

        {totalChapters > 0 && currentChapter > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={onPrev}
              disabled={!canGoPrev || isNavDisabled}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous Chapter</span>
            </Button>

            <span className="text-sm text-muted-foreground mx-2 font-medium tabular-nums">
              {currentChapter} / {totalChapters}
            </span>

            <Button
              variant="outline"
              size="icon"
              onClick={onNext}
              disabled={!canGoNext || isNavDisabled}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next Chapter</span>
            </Button>
          </div>
        )}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {isLoading ? (
          <ChapterSkeleton />
        ) : content ? (
          <div className="prose sm:prose-lg lg:prose-xl dark:prose-invert max-w-none markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeHighlight, rehypeKatex]}
              components={{
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const isBlock = !!match;

                  if (isBlock) {
                    return (
                      <div className="my-4 rounded-md overflow-hidden bg-[#0d1117] dark:bg-muted/30 text-foreground">
                        <pre
                          className={cn(
                            // Removed text-sm - inherits from prose now
                            "p-4 overflow-x-auto",
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
                        // Removed text-sm - inherits from prose now
                        "bg-muted px-[0.4em] py-[0.2em] rounded font-mono",
                        className,
                      )}
                    >
                      {children}
                    </code>
                  );
                },
                table({ children }) {
                  return (
                    <div className="overflow-x-auto my-4 border rounded-md">
                      <table className="w-full">{children}</table>
                    </div>
                  );
                },
                th({ children }) {
                  return (
                    <th className="border-b px-4 py-2 text-left font-semibold bg-muted/50">
                      {children}
                    </th>
                  );
                },
                td({ children }) {
                  return <td className="border-b px-4 py-2">{children}</td>;
                },
                blockquote({ children }) {
                  return (
                    <blockquote className="mt-6 border-l-2 pl-6 italic">
                      {children}
                    </blockquote>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <h3 className="text-xl font-medium mb-2 text-muted-foreground">
              No chapter selected
            </h3>
            <p className="text-muted-foreground">
              Select a chapter from the sidebar to view its content.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Skeleton component remains the same
function ChapterSkeleton() {
  return (
    <div className="space-y-4 p-2">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
