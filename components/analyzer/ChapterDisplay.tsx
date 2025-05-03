import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css"; // Style for code highlighting
import { cn } from "@/lib/utils";

// +++ Add these imports for math rendering +++
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
// Ensure KaTeX CSS is imported globally (e.g., in app/globals.css)
// @import 'katex/dist/katex.min.css';
// ++++++++++++++++++++++++++++++++++++++++++++++

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
          "flex-grow overflow-y-auto", // Ensure vertical scroll within this div
          isLoading ? "flex items-center justify-center" : "",
        )}
      >
        {isLoading ? (
          <p className="text-muted-foreground italic">
            Loading chapter content...
          </p>
        ) : (
          <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert markdown-content">
            <ReactMarkdown
              // +++ Updated plugins for math +++
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeHighlight, rehypeKatex]}
              // ++++++++++++++++++++++++++++++++++
              components={{
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  // Determine if it's a block based on language match
                  const isBlock = !!match;

                  // --- Fixed Code Block Rendering ---
                  if (isBlock) {
                    return (
                      // Container for margin and styling
                      <div className="my-4 rounded-md overflow-hidden bg-[#0d1117] text-[#c9d1d9]"> {/* Example GitHub dark background */}
                        {/* Use <pre> for the block structure */}
                        <pre className={cn("p-3 overflow-x-auto", className)}>
                          {/* Use <code> inside <pre> for semantic correctness */}
                          <code>{children}</code>
                        </pre>
                      </div>
                    );
                  }
                  // --- Fixed Inline Code Rendering ---
                  return (
                    <code
                      className={cn(
                        "bg-muted px-[0.4em] py-[0.2em] rounded text-sm font-mono",
                        className
                      )}
                    // Pass other props ONLY if necessary and valid for <code>
                    // {...props} // Generally avoid spreading unknown props
                    >
                      {children}
                    </code>
                  );
                },
                // --- Table components remain the same ---
                table({ children }) {
                  return (
                    <div className="overflow-x-auto my-4">
                      <table className="w-full">{children}</table>
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
