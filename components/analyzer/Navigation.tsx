// components/analyzer/Navigation.tsx
"use client";

interface NavigationProps {
  currentChapter: number;
  totalChapters: number;
  onNext: () => void;
  onPrev: () => void;
  isLoading: boolean;
}

export function Navigation({
  currentChapter,
  totalChapters,
  onNext,
  onPrev,
  isLoading,
}: NavigationProps) {
  const canGoPrev = currentChapter > 1;
  const canGoNext = currentChapter < totalChapters;

  return (
    <div className="flex justify-between mt-4">
      <button
        onClick={onPrev}
        disabled={!canGoPrev || isLoading}
        className="px-4 py-2 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
      >
      </button>
      <span>
        Chapter {currentChapter} of {totalChapters}
      </span>
      <button
        onClick={onNext}
        disabled={!canGoNext || isLoading}
        className="px-4 py-2 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
      >
      </button>
    </div>
  );
}
