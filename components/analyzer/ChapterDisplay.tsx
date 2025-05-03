import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

export function ChapterDisplay({
  title,
  content,
  isLoading,
}: {
  title: string;
  content: string;
  isLoading: boolean;
}) {
  return (
    <div className="p-4 border rounded border-border min-h-[300px] bg-card text-card-foreground">
      <h2 className="text-2xl font-semibold mb-4">{title || "Chapter"}</h2>
      {isLoading ? (
        <p>Loading chapter content...</p>
      ) : (
        <div className="prose max-w-none dark:prose-invert markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              code({ node, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                const isInline =
                  "inline" in props && typeof props.inline !== "undefined";

                return !isInline && match ? (
                  <code className={className} {...props}>
                    {children}
                  </code>
                ) : (
                  <code
                    className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
            }}
          >
            {content || "No content generated yet."}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
