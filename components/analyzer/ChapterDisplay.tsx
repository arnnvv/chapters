// components/analyzer/ChapterDisplay.tsx
"use client";
// Removed ReactMarkdown imports

interface ChapterDisplayProps {
  title: string;
  content: string;
  isLoading: boolean;
}

export function ChapterDisplay({ title, content, isLoading }: ChapterDisplayProps) {
  return (
    <div className="p-4 border rounded border-border min-h-[300px] bg-card text-card-foreground">
      <h2 className="text-2xl font-semibold mb-4">{title || "Chapter"}</h2>
      {isLoading ? (
        <p>Loading chapter content...</p>
      ) : (
        // Use <pre> tag to display raw text with line breaks and spacing preserved
        // font-sans is used to match the surrounding text style, change to font-mono if preferred for code-like text
        <pre className="whitespace-pre-wrap font-sans text-sm">
          {content || "No content generated yet."}
        </pre>
      )}
    </div>
  );
}
