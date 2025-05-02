import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { cn } from "@/lib/utils";

interface ChapterDisplayProps {
  title: string;
  content: string;
  isLoading: boolean;
}

export function ChapterDisplay({
  title,
  content,
  isLoading,
}: ChapterDisplayProps) {
  return (
    <div className="p-4 md:p-6 border rounded border-border flex-grow flex flex-col overflow-hidden bg-card text-card-foreground">
      <h2 className="text-xl md:text-2xl font-semibold mb-4 shrink-0">
        {title || "Chapter"}
      </h2>
      <div
        className={cn(
          "flex-grow overflow-y-auto",
          isLoading ? "flex items-center justify-center" : "",
        )}
      >
        {isLoading ? (
          <p className="text-muted-foreground italic">
            Loading chapter content...
          </p>
        ) : (
          <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const isInline =
                    "inline" in props && typeof props.inline !== "undefined";

                  return !isInline && match ? (
                    <code
                      className={cn(
                        className,
                        "block p-3 rounded-md overflow-x-auto",
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
                      )}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                table({ children }) {
                  return (
                    <div className="overflow-x-auto">
                      <table className="my-4 w-full">{children}</table>
                    </div>
                  );
                },
                th({ children }) {
                  return (
                    <th className="border px-4 py-2 text-left font-semibold">
                      {children}
                    </th>
                  );
                },
                td({ children }) {
                  return <td className="border px-4 py-2">{children}</td>;
                },
              }}
            >
              {content || "No content generated yet."}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
