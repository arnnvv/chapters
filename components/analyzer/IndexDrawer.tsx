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
import { Menu, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChapterIndexItem } from "@/lib/db/types";

export function IndexDrawer({
  index,
  currentChapter,
  onChapterSelect,
  isLoading,
}: {
  index: ChapterIndexItem[];
  currentChapter: number;
  onChapterSelect: (chapterNumber: number) => void;
  isLoading: boolean;
}) {
  if (!index || index.length === 0) {
    return null;
  }

  const handleSelect = (chapterNumber: number) => {
    if (!isLoading) {
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
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[300px] sm:w-[350px] p-0 flex flex-col"
      >
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> Chapters
          </SheetTitle>
        </SheetHeader>
        <div className="flex-grow overflow-y-auto py-4">
          {index.map((item) => (
            <SheetClose asChild key={item.chapter}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start rounded-none px-6 py-3 text-left h-auto",
                  item.chapter === currentChapter
                    ? "bg-primary/10 text-primary font-semibold"
                    : "hover:bg-accent hover:text-accent-foreground",
                  isLoading ? "opacity-50 cursor-not-allowed" : "",
                )}
                onClick={() => handleSelect(item.chapter)}
                disabled={isLoading}
              >
                <span className="font-mono text-xs w-8 text-muted-foreground mr-2">
                  {item.chapter}.
                </span>
                <span>{item.title}</span>
              </Button>
            </SheetClose>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
