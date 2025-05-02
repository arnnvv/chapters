import { ChapterDisplay } from "./ChapterDisplay";
import { Navigation } from "./Navigation";

export function MainDisplayArea({
  title,
  content,
  currentChapter,
  totalChapters,
  isLoading,
  onNext,
  onPrev,
  isNavDisabled,
}: {
  title: string;
  content: string;
  currentChapter: number;
  totalChapters: number;
  isLoading: boolean;
  onNext: () => void;
  onPrev: () => void;
  isNavDisabled: boolean;
}) {
  return (
    <div className="flex flex-col min-h-[calc(100vh-12rem)]">
      <div className="flex-grow flex flex-col">
        <ChapterDisplay title={title} content={content} isLoading={isLoading} />
      </div>
      <div className="mt-auto pt-6">
        {totalChapters > 0 && currentChapter > 0 && (
          <Navigation
            currentChapter={currentChapter}
            totalChapters={totalChapters}
            onNext={onNext}
            onPrev={onPrev}
            isLoading={isNavDisabled}
          />
        )}
      </div>
    </div>
  );
}
