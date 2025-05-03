"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
    <div className="flex justify-between items-center mt-4">
      <Button
        variant="outline"
        size="icon"
        onClick={onPrev}
        disabled={!canGoPrev || isLoading}
        aria-label="Previous Chapter"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground">
        Chapter {currentChapter} of {totalChapters}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={onNext}
        disabled={!canGoNext || isLoading}
        aria-label="Next Chapter"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
