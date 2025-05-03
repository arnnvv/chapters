"use client";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, BookOpen, Loader2 } from "lucide-react"; // Import Loader2
import { cn } from "@/lib/utils";
import type { ChapterIndexItem } from "@/lib/db/types";

export function IndexDrawer({
  index,
  currentChapter,
  onChapterSelect,
  currentlyGeneratingChapterNumber, // Renamed from isLoading
  isGloballyDisabled, // New prop for states like indexing
}: {
  index: ChapterIndexItem[];
  currentChapter: number;
  onChapterSelect: (chapterNumber: number) => void;
  currentlyGeneratingChapterNumber: number | null; // Track specific loading chapter
  isGloballyDisabled: boolean; // For indexing, loading conversation, etc.
}) {
  if (!index || index.length === 0) {
    return null;
  }

  const handleSelect = (chapterNumber: number) => {
    // Selection allowed unless globally disabled or this specific chapter is loading
    if (!isGloballyDisabled && currentlyGeneratingChapterNumber !== chapterNumber) {
      onChapterSelect(chapterNumber);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="absolute top-4 left-4 md:top-6 md:left-6 lg:top-8 lg:left-8 z-10"
          aria-label="Open chapter index"
          disabled={isGloballyDisabled} // Disable trigger if globally blocked
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[300px] sm:w-[350px] p-0 flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> Chapters
          </SheetTitle>
        </SheetHeader>
        <div className="flex-grow overflow-y-auto py-2">
          {index.map((item) => {
            const isThisLoading = item.chapter === currentlyGeneratingChapterNumber;
            const isDisabled = isGloballyDisabled || isThisLoading;
            const isCurrent = item.chapter === currentChapter;

            return (
              // Conditionally wrap with SheetClose ONLY if not loading this item
              // This prevents closing the sheet when clicking a loading item
              isThisLoading ? (
                <Button // Render as plain button if loading this one
                  key={item.chapter}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start rounded-none px-6 py-3 text-left h-auto flex items-start",
                    "opacity-50 cursor-not-allowed", // Style as disabled
                  )}
                  disabled={true}
                >
                  <span className="font-mono text-xs w-8 text-muted-foreground mr-2 shrink-0 pt-0.5">
                    {item.chapter}.
                  </span>
                  <span className="whitespace-normal break-words flex-grow mr-2">{item.title}</span>
                  {/* Add spinner */}
                  <Loader2 className="h-4 w-4 animate-spin shrink-0 text-muted-foreground" />
                </Button>
              ) : (
                <SheetClose asChild key={item.chapter}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start rounded-none px-6 py-3 text-left h-auto flex items-start",
                      isCurrent // Highlight if current and NOT loading
                        ? "bg-primary/10 text-primary font-semibold"
                        : "hover:bg-accent hover:text-accent-foreground",
                      isDisabled ? "opacity-50 cursor-not-allowed" : "", // General disable check
                    )}
                    onClick={() => handleSelect(item.chapter)}
                    disabled={isDisabled} // Disable if globally blocked OR this specific one is loading
                  >
                    <span className="font-mono text-xs w-8 text-muted-foreground mr-2 shrink-0 pt-0.5">
                      {item.chapter}.
                    </span>
                    <span className="whitespace-normal break-words">{item.title}</span>
                  </Button>
                </SheetClose>
              )
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
