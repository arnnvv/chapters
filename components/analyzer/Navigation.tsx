"use client";

export function Navigation({
  currentChapter,
  totalChapters,
  onNext,
  onPrev,
  isLoading,
}: {
  currentChapter: number;
  totalChapters: number;
  onNext: () => void;
  onPrev: () => void;
  isLoading: boolean;
}) {
  const canGoPrev = currentChapter > 1;
  const canGoNext = currentChapter < totalChapters;

  return (
    <div className="flex justify-between mt-4">
      <button
        onMouseDown={onPrev}
        disabled={!canGoPrev || isLoading}
        type="button"
        className="px-4 py-2 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
      />
      <span>
        Chapter {currentChapter} of {totalChapters}
      </span>
      <button
        onMouseDown={onNext}
        disabled={!canGoNext || isLoading}
        type="button"
        className="px-4 py-2 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
      />
    </div>
  );
}
