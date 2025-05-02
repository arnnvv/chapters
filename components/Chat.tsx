"use client";

import { useEffect, useState, useCallback } from "react";
import type { JSX } from "react";
import { toast } from "sonner";
import {
  getUserConversations,
  getConversationDetails,
  type ConversationListItem,
} from "@/app/actions";
import { IndexDrawer } from "./analyzer/IndexDrawer";
import { ContentInput } from "./analyzer/ContentInput";
import { ChapterDisplay } from "./analyzer/ChapterDisplay";
import { QASidebar } from "./analyzer/QASidebar";
import { Navigation } from "./analyzer/Navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon } from "lucide-react";
import { signOutAction } from "@/app/actions";
import { SignOutFormComponent } from "./SignoutForm";
import type { ChapterIndexItem } from "@/lib/db/types";
import type { AskQuestionResponse, QAItem } from "@/app/api/ask-question/route";
import type { GenerateChapterResponse } from "@/app/api/generate-chapter/route";
import type { GenerateIndexApiResponse } from "@/app/api/generate-index/route";
import { ConversationDrawer } from "./analyzer/ConversationDrawer";

export function Chat({
  user,
}: {
  user: {
    name: string | null;
    picture: string | null;
  };
}): JSX.Element {
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
  const [isGeneratingChapter, setIsGeneratingChapter] =
    useState<boolean>(false);
  const [isAnswering, setIsAnswering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);

  const [conversationList, setConversationList] = useState<
    ConversationListItem[]
  >([]);
  const [isLoadingConversations, setIsLoadingConversations] =
    useState<boolean>(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  useEffect(() => {
    const fetchConversations = async () => {
      setIsLoadingConversations(true);
      const result = await getUserConversations();
      if (result.success) {
        setConversationList(result.conversations);
      } else {
        toast.error(`Failed to load conversations: ${result.error}`);
      }
      setIsLoadingConversations(false);
    };

    fetchConversations();
  }, []);

  const fetchChapterContent = useCallback(
    async (chapterNumber: number, chapIndex?: ChapterIndexItem[]) => {
      const idx = chapIndex || chapterIndex;

      if (
        !originalContent ||
        idx.length === 0 ||
        chapterNumber < 1 ||
        !userBackground ||
        !conversationId
      ) {
        return;
      }

      if (generatedChapters[chapterNumber]) {
        setDisplayedChapterContent(generatedChapters[chapterNumber]);
        if (currentChapter !== chapterNumber) setCurrentChapter(chapterNumber);
        return;
      }

      setIsGeneratingChapter(true);
      setError(null);
      setDisplayedChapterContent("");

      try {
        const previousChaptersContext: Record<string | number, string> = {};
        for (const key of Object.keys(generatedChapters)) {
          const num = Number.parseInt(key, 10);
          if (num < chapterNumber) {
            previousChaptersContext[num] = generatedChapters[num];
          }
        }

        const response = await fetch("/api/generate-chapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: conversationId,
            targetChapterNumber: chapterNumber,
            fullContent: originalContent,
            userBackground: userBackground,
            generatedChapters: previousChaptersContext,
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
        const message =
          err instanceof Error
            ? err.message
            : "Unknown error fetching chapter.";
        setError(`Failed to load chapter ${chapterNumber}: ${message}`);
        toast.error(`Failed to load chapter ${chapterNumber}: ${message}`);
        setCurrentChapter(chapterNumber);
        setDisplayedChapterContent("Error loading content.");
      } finally {
        setIsGeneratingChapter(false);
      }
    },
    [
      originalContent,
      generatedChapters,
      userBackground,
      currentChapter,
      conversationId,
      chapterIndex,
    ],
  );

  const handleContentSubmit = async (text: string, background: string) => {
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
    setConversationId(null);

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

      const data = (await response.json()) as GenerateIndexApiResponse;
      if (data.index && data.index.length > 0 && data.conversationId) {
        const simpleIndex = data.index.map((item) => ({
          chapter: item.chapter,
          title: item.title,
        }));
        setChapterIndex(simpleIndex);
        setConversationId(data.conversationId);
        const newListResult = await getUserConversations();
        if (newListResult.success)
          setConversationList(newListResult.conversations);

        await fetchChapterContent(1, simpleIndex);
      } else {
        setError("Could not generate index or conversation record.");
        toast.error("Could not generate chapter index.");
        setIsContentSubmitted(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error.";
      setError(`Failed to generate index: ${message}`);
      toast.error(`Failed to generate index: ${message}`);
      setIsContentSubmitted(false);
    } finally {
      setIsIndexing(false);
    }
  };

  const handleLoadConversation = async (id: number) => {
    if (isLoadingDetails || isIndexing || isGeneratingChapter || isAnswering) {
      toast.info("Please wait for the current action to complete.");
      return;
    }
    setIsLoadingDetails(true);
    toast.info("Loading conversation...");
    setDisplayedChapterContent("");
    setError(null);

    const result = await getConversationDetails(id);

    if (result.success) {
      const { conversation, index, messages } = result.details;

      setConversationId(conversation.id);
      setOriginalContent(conversation.original_content);
      setUserBackground(conversation.user_background);

      const simpleIndex = index.map((item) => ({
        chapter: item.chapter,
        title: item.title,
      }));
      setChapterIndex(simpleIndex);
      setQaHistory(messages);

      const initialChapters = index.reduce(
        (acc, item) => {
          if (item.generated_content) {
            acc[item.chapter] = item.generated_content;
          }
          return acc;
        },
        {} as Record<number, string>,
      );
      setGeneratedChapters(initialChapters);

      setCurrentChapter(0);
      setDisplayedChapterContent("");
      setIsContentSubmitted(true);

      if (index.length > 0) {
        await fetchChapterContent(1, simpleIndex);
      } else {
        setDisplayedChapterContent("No chapters found for this conversation.");
        setCurrentChapter(0);
      }

      toast.success("Conversation loaded.");
    } else {
      setError(`Failed to load conversation: ${result.error}`);
      toast.error(`Failed to load conversation: ${result.error}`);
    }
    setIsLoadingDetails(false);
  };

  const handleAskQuestion = async (question: string) => {
    if (
      !originalContent ||
      !question.trim() ||
      !userBackground ||
      !conversationId
    ) {
      toast.warning("Cannot ask question without an active conversation.");
      return;
    }

    setIsAnswering(true);
    setError(null);

    setQaHistory((prev) => [...prev, { question, answer: "" }]);

    try {
      const response = await fetch("/api/ask-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversationId,
          fullContent: originalContent,
          generatedChapters: generatedChapters,
          qaHistory: qaHistory,
          userQuestion: question,
          userBackground: userBackground,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setQaHistory((prev) => prev.slice(0, -1));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`,
        );
      }

      const data = (await response.json()) as AskQuestionResponse;

      setQaHistory((prev) => {
        const newHistory = [...prev];
        if (newHistory.length > 0) {
          newHistory[newHistory.length - 1].answer = data.answer;
        }
        return newHistory;
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error asking question.";
      setError(`Failed to get answer: ${message}`);
      toast.error(`Failed to get answer: ${message}`);
    } finally {
      setIsAnswering(false);
    }
  };

  const handleNext = () => {
    if (currentChapter < chapterIndex.length) {
      fetchChapterContent(currentChapter + 1, chapterIndex);
    }
  };

  const handlePrev = () => {
    if (currentChapter > 1) {
      fetchChapterContent(currentChapter - 1, chapterIndex);
    }
  };

  const handleChapterSelect = (chapterNumber: number) => {
    fetchChapterContent(chapterNumber, chapterIndex);
  };

  const currentChapterTitle =
    chapterIndex.find((item) => item.chapter === currentChapter)?.title ||
    (currentChapter > 0 ? `Chapter ${currentChapter}` : "Select a chapter");

  const isAnythingLoading =
    isIndexing || isGeneratingChapter || isAnswering || isLoadingDetails;

  return (
    <div className="flex h-screen bg-background text-foreground relative">
      <IndexDrawer
        index={chapterIndex}
        currentChapter={currentChapter}
        onChapterSelect={handleChapterSelect}
        isLoading={isAnythingLoading}
      />
      <ConversationDrawer
        conversations={conversationList}
        onSelectConversation={handleLoadConversation}
        isLoading={isLoadingConversations}
        isDisabled={isAnythingLoading}
      />

      <div className="flex-grow flex flex-col p-4 md:p-6 lg:p-8 overflow-y-auto pl-16 md:pl-20 lg:pl-24 relative">
        <div className="absolute top-4 right-4 md:top-6 md:right-6 lg:top-8 lg:right-8 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-9 w-9 md:h-10 md:w-10 cursor-pointer hover:ring-2 hover:ring-ring hover:ring-offset-2 hover:ring-offset-background rounded-full transition-all">
                <AvatarImage
                  src={user?.picture ?? "/default-avatar.png"}
                  alt={user?.name ?? "User Avatar"}
                />
                <AvatarFallback>
                  {user?.name ? (
                    user.name.charAt(0).toUpperCase()
                  ) : (
                    <UserIcon size={18} />
                  )}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild className="cursor-pointer">
                <SignOutFormComponent action={signOutAction}>
                  <Button
                    type="submit"
                    variant="ghost"
                    className="w-full justify-start px-2 py-1.5 text-sm"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </Button>
                </SignOutFormComponent>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h1 className="text-3xl font-bold mb-6 border-b pb-2 border-border pr-16">
          Document Teaching Assistant
        </h1>

        {!isContentSubmitted && (
          <ContentInput
            onSubmit={handleContentSubmit}
            isLoading={isIndexing || isLoadingDetails}
          />
        )}

        {isContentSubmitted && chapterIndex.length > 0 && (
          <div className="flex flex-col min-h-[calc(100vh-12rem)]">
            <div className="flex-grow flex flex-col">
              <ChapterDisplay
                title={currentChapterTitle}
                content={displayedChapterContent}
                isLoading={isGeneratingChapter || isLoadingDetails}
              />
            </div>

            {/* Navigation now positioned at the absolute bottom of content */}
            <div className="mt-auto pt-6">
              {chapterIndex.length > 0 && (
                <Navigation
                  currentChapter={currentChapter}
                  totalChapters={chapterIndex.length}
                  onNext={handleNext}
                  onPrev={handlePrev}
                  isLoading={isGeneratingChapter || isLoadingDetails}
                />
              )}
            </div>
          </div>
        )}

        {(isIndexing || isLoadingDetails) && (
          <p className="mt-4 text-muted-foreground italic">Loading...</p>
        )}

        {error && !(isGeneratingChapter || isIndexing || isLoadingDetails) && (
          <p className="text-destructive mt-4">Error: {error}</p>
        )}
      </div>

      {isContentSubmitted && (
        <aside className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0 h-screen flex flex-col border-l border-border">
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
