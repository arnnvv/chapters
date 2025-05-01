// app/page.tsx

"use client";

import { useState, useCallback } from "react";
import type { JSX } from "react";
import { toast } from "sonner";

import { ContentInput } from "@/components/analyzer/ContentInput";
import { ChapterDisplay } from "@/components/analyzer/ChapterDisplay";
import { Navigation } from "@/components/analyzer/Navigation";
import { QASidebar } from "@/components/analyzer/QASidebar";
import { IndexDrawer } from "@/components/analyzer/IndexDrawer"; // <-- Import IndexDrawer

import type {
  ChapterIndexItem,
  GenerateIndexResponse,
} from "./api/generate-index/route";
import type { GenerateChapterResponse } from "./api/generate-chapter/route";
import type { QAItem, AskQuestionResponse } from "./api/ask-question/route";

export default function AnalyzerPage(): JSX.Element {
  // --- State --- (Keep existing state)
  const [originalContent, setOriginalContent] = useState<string>("");
  const [userBackground, setUserBackground] = useState<string>("");
  const [isContentSubmitted, setIsContentSubmitted] = useState<boolean>(false);
  const [chapterIndex, setChapterIndex] = useState<ChapterIndexItem[]>([]);
  const [currentChapter, setCurrentChapter] = useState<number>(0);
  const [generatedChapters, setGeneratedChapters] = useState<
    Record<number, string>
  >({});
  const [displayedChapterContent, setDisplayedChapterContent] =
    useState<string>("");
  const [qaHistory, setQaHistory] = useState<QAItem[]>([]);

  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  const [isGeneratingChapter, setIsGeneratingChapter] = useState<boolean>(false);
  const [isAnswering, setIsAnswering] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);

  // --- API Interaction Functions --- (Keep existing functions)
  const fetchChapterContent = useCallback(
    // ... (existing fetchChapterContent code - no changes needed here) ...
    async (chapterNumber: number) => {
      if (!originalContent || chapterIndex.length === 0 || chapterNumber < 1 || !userBackground) return;

      // Prevent fetching same chapter again immediately
      if (chapterNumber === currentChapter && generatedChapters[chapterNumber]) return;


      setIsGeneratingChapter(true);
      setError(null);
      setDisplayedChapterContent("");

      try {
        const previousChaptersContext: Record<string | number, string> = {};
        Object.keys(generatedChapters).forEach((key) => {
          const num = parseInt(key, 10);
          if (num < chapterNumber) {
            previousChaptersContext[num] = generatedChapters[num];
          }
        });

        const response = await fetch("/api/generate-chapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullContent: originalContent,
            index: chapterIndex,
            targetChapterNumber: chapterNumber,
            generatedChapters: previousChaptersContext,
            userBackground: userBackground,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`,
          );
        }

        const data = (await response.json()) as GenerateChapterResponse;
        setGeneratedChapters((prev) => ({
          ...prev,
          [chapterNumber]: data.chapterContent,
        }));
        setDisplayedChapterContent(data.chapterContent);
        setCurrentChapter(chapterNumber);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error fetching chapter.";
        setError(`Failed to load chapter ${chapterNumber}: ${message}`);
        toast.error(`Failed to load chapter ${chapterNumber}: ${message}`);
        setCurrentChapter(chapterNumber);
        setDisplayedChapterContent("Error loading content.");
      } finally {
        setIsGeneratingChapter(false);
      }
    },
    [originalContent, chapterIndex, generatedChapters, userBackground, currentChapter] // Added currentChapter dependency
  );

  const handleContentSubmit = async (text: string, background: string) => {
    // ... (existing handleContentSubmit code - no changes needed here) ...
    if (!background.trim()) {
      toast.error("Please describe your background knowledge.");
      return;
    }
    setIsIndexing(true);
    setError(null);
    setOriginalContent(text);
    setUserBackground(background);
    setIsContentSubmitted(true);
    setChapterIndex([]);
    setCurrentChapter(0);
    setGeneratedChapters({});
    setDisplayedChapterContent("");
    setQaHistory([]);

    try {
      const response = await fetch("/api/generate-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, userBackground: background }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`,
        );
      }

      const indexData = (await response.json()) as GenerateIndexResponse;
      if (indexData && indexData.length > 0) {
        setChapterIndex(indexData);
        await fetchChapterContent(1);
      } else {
        setError("Could not generate a chapter index from the provided content.");
        toast.error("Could not generate a chapter index.");
        setIsContentSubmitted(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error generating index.";
      setError(`Failed to generate index: ${message}`);
      toast.error(`Failed to generate index: ${message}`);
      setIsContentSubmitted(false);
    } finally {
      setIsIndexing(false);
    }
  };

  const handleAskQuestion = async (question: string) => {
    // ... (existing handleAskQuestion code - no changes needed here) ...
    if (!originalContent || !question.trim() || !userBackground) return;

    setIsAnswering(true);
    setError(null);

    try {
      const response = await fetch("/api/ask-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullContent: originalContent,
          index: chapterIndex,
          generatedChapters: generatedChapters,
          qaHistory: qaHistory,
          userQuestion: question,
          userBackground: userBackground,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`,
        );
      }

      const data = (await response.json()) as AskQuestionResponse;

      setQaHistory((prev) => [...prev, { question, answer: data.answer }]);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error asking question.";
      setError(`Failed to get answer: ${message}`);
      toast.error(`Failed to get answer: ${message}`);
    } finally {
      setIsAnswering(false);
    }
  }

  // --- Navigation Handlers --- (Keep existing)
  const handleNext = () => {
    if (currentChapter < chapterIndex.length) {
      fetchChapterContent(currentChapter + 1);
    }
  };

  const handlePrev = () => {
    if (currentChapter > 1) {
      fetchChapterContent(currentChapter - 1);
    }
  };

  // --- New Handler for Drawer Selection ---
  const handleChapterSelect = (chapterNumber: number) => {
    // fetchChapterContent already prevents fetching the same chapter
    fetchChapterContent(chapterNumber);
  };

  // --- Render ---
  const currentChapterTitle =
    chapterIndex.find((item) => item.chapter === currentChapter)?.title ||
    (currentChapter > 0 ? `Chapter ${currentChapter}` : "No Chapter Selected");

  // Combined loading state for general disabling
  const isAnythingLoading = isIndexing || isGeneratingChapter || isAnswering;

  return (
    // Add relative positioning context if needed for absolute positioned drawer trigger
    <div className="flex h-screen bg-background text-foreground relative">

      {/* Render Index Drawer - Pass necessary props */}
      <IndexDrawer
        index={chapterIndex}
        currentChapter={currentChapter}
        onChapterSelect={handleChapterSelect}
        isLoading={isAnythingLoading} // Disable drawer interaction while any loading happens
      />

      {/* Main Content Area */}
      {/* Add some padding-left to account for the drawer trigger button */}
      <div className="flex-grow flex flex-col p-4 md:p-6 lg:p-8 overflow-y-auto pl-16 md:pl-20 lg:pl-24">
        <h1 className="text-3xl font-bold mb-6 border-b pb-2 border-border">
          Document Teaching Assistant
        </h1>

        {!isContentSubmitted && (
          <ContentInput
            onSubmit={handleContentSubmit}
            isLoading={isIndexing}
          />
        )}

        {isContentSubmitted && chapterIndex.length > 0 && (
          <>
            <ChapterDisplay
              title={currentChapterTitle}
              content={displayedChapterContent}
              isLoading={isGeneratingChapter}
            />
            {chapterIndex.length > 0 && (
              <Navigation
                currentChapter={currentChapter}
                totalChapters={chapterIndex.length}
                onNext={handleNext}
                onPrev={handlePrev}
                isLoading={isGeneratingChapter}
              />
            )}
          </>
        )}
        {isIndexing && <p className="mt-4">Generating index and loading first chapter...</p>}

        {error && !isGeneratingChapter && (
          <p className="text-destructive mt-4">Error: {error}</p>
        )}
      </div>

      {/* Q&A Sidebar */}
      {isContentSubmitted && (
        <aside className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0 h-screen overflow-y-hidden">
          <QASidebar
            history={qaHistory}
            onAskQuestion={handleAskQuestion}
            isLoading={isAnswering}
          />
        </aside>
      )}
    </div>
  );
}
