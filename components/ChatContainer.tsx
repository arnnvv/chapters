"use client";

import { useEffect, useState, useCallback, useReducer } from "react";
import type { JSX } from "react";
import { toast } from "sonner";
import {
  getUserConversations,
  getConversationDetails,
  signOutAction,
  type ConversationListItem,
  type ConversationDetails,
} from "@/app/actions";
import { IndexDrawer } from "./analyzer/IndexDrawer";
import { ContentSubmissionForm } from "./analyzer/ContentSubmissionForm";
import { MainDisplayArea } from "./analyzer/MainDisplayArea";
import { QASidebar } from "./analyzer/QASidebar";
import { ConversationDrawer } from "./analyzer/ConversationDrawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon } from "lucide-react";
import { SignOutFormComponent } from "./SignoutForm";
import type { ChapterIndexItem } from "@/lib/db/types";
import type { AskQuestionResponse, QAItem } from "@/app/api/ask-question/route";
import type { GenerateChapterResponse } from "@/app/api/generate-chapter/route";
import type { GenerateIndexApiResponse } from "@/app/api/generate-index/route";

type Status =
  | "idle"
  | "indexing"
  | "generatingChapter"
  | "answering"
  | "loadingConversation"
  | "error";

interface ChatState {
  status: Status;
  conversationId: number | null;
  originalContent: string;
  userBackground: string;
  chapterIndex: ChapterIndexItem[];
  currentChapterNumber: number;
  generatedChapters: Record<number, string>;
  qaHistory: QAItem[];
  error: string | null;
}

type ChatAction =
  | { type: "START_INDEXING"; payload: { content: string; background: string } }
  | {
      type: "INDEX_SUCCESS";
      payload: { index: ChapterIndexItem[]; conversationId: number };
    }
  | { type: "INDEX_FAIL"; payload: { error: string } }
  | { type: "START_CHAPTER_GENERATION"; payload: { chapterNumber: number } }
  | {
      type: "CHAPTER_GENERATION_SUCCESS";
      payload: { chapterNumber: number; content: string };
    }
  | {
      type: "CHAPTER_GENERATION_FAIL";
      payload: { chapterNumber: number; error: string };
    }
  | { type: "SET_DISPLAYED_CHAPTER"; payload: { chapterNumber: number } }
  | { type: "START_ANSWERING"; payload: { question: string } }
  | { type: "ANSWERING_SUCCESS"; payload: { answer: string } }
  | { type: "ANSWERING_FAIL"; payload: { error: string } }
  | { type: "LOAD_CONVERSATION_START"; payload: { conversationId: number } }
  | { type: "LOAD_CONVERSATION_SUCCESS"; payload: ConversationDetails }
  | { type: "LOAD_CONVERSATION_FAIL"; payload: { error: string } }
  | { type: "RESET" };

const initialState: ChatState = {
  status: "idle",
  conversationId: null,
  originalContent: "",
  userBackground: "",
  chapterIndex: [],
  currentChapterNumber: 0,
  generatedChapters: {},
  qaHistory: [],
  error: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "START_INDEXING":
      return {
        ...initialState,
        status: "indexing",
        originalContent: action.payload.content,
        userBackground: action.payload.background,
      };
    case "INDEX_SUCCESS":
      return {
        ...state,
        status: "generatingChapter",
        chapterIndex: action.payload.index,
        conversationId: action.payload.conversationId,
        currentChapterNumber: 0,
        error: null,
      };
    case "INDEX_FAIL":
      return {
        ...state,
        status: "error",
        error: action.payload.error,
        originalContent: "",
        userBackground: "",
      };
    case "START_CHAPTER_GENERATION":
      return {
        ...state,
        status: "generatingChapter",
        currentChapterNumber: action.payload.chapterNumber,
        error: null,
      };
    case "CHAPTER_GENERATION_SUCCESS": {
      return {
        ...state,
        status: "idle",
        generatedChapters: {
          ...state.generatedChapters,
          [action.payload.chapterNumber]: action.payload.content,
        },
        currentChapterNumber: action.payload.chapterNumber,
        error: null,
      };
    }
    case "CHAPTER_GENERATION_FAIL":
      return {
        ...state,
        status: "error",
        error: action.payload.error,
      };
    case "SET_DISPLAYED_CHAPTER":
      return {
        ...state,
        status: "idle",
        currentChapterNumber: action.payload.chapterNumber,
        error: null,
      };
    case "START_ANSWERING":
      return {
        ...state,
        status: "answering",
        qaHistory: [
          ...state.qaHistory,
          { question: action.payload.question, answer: "" },
        ],
        error: null,
      };
    case "ANSWERING_SUCCESS": {
      const newHistory = [...state.qaHistory];
      if (newHistory.length > 0) {
        newHistory[newHistory.length - 1].answer = action.payload.answer;
      }
      return {
        ...state,
        status: "idle",
        qaHistory: newHistory,
        error: null,
      };
    }
    case "ANSWERING_FAIL": {
      const historyWithoutLast = state.qaHistory.slice(0, -1);
      return {
        ...state,
        status: "error",
        qaHistory: historyWithoutLast,
        error: action.payload.error,
      };
    }
    case "LOAD_CONVERSATION_START":
      return {
        ...initialState,
        status: "loadingConversation",
        conversationId: action.payload.conversationId,
      };
    case "LOAD_CONVERSATION_SUCCESS": {
      const { conversation, index, messages } = action.payload;
      const simpleIndex = index.map((item) => ({
        chapter: item.chapter,
        title: item.title,
      }));
      const initialChapters = index.reduce(
        (acc, item) => {
          if (item.generated_content) {
            acc[item.chapter] = item.generated_content;
          }
          return acc;
        },
        {} as Record<number, string>,
      );

      return {
        ...state,
        status: simpleIndex.length > 0 ? "generatingChapter" : "idle",
        conversationId: conversation.id,
        originalContent: conversation.original_content,
        userBackground: conversation.user_background,
        chapterIndex: simpleIndex,
        currentChapterNumber: 0,
        generatedChapters: initialChapters,
        qaHistory: messages,
        error: null,
      };
    }
    case "LOAD_CONVERSATION_FAIL":
      return {
        ...initialState,
        status: "error",
        error: action.payload.error,
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function ChatContainer({
  user,
}: { user: { name: string | null; picture: string | null } }): JSX.Element {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const [conversationList, setConversationList] = useState<
    ConversationListItem[]
  >([]);
  const [isLoadingConversations, setIsLoadingConversations] =
    useState<boolean>(true);

  const fetchConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    const result = await getUserConversations();
    if (result.success) {
      setConversationList(result.conversations);
    } else {
      toast.error(`Failed to load conversations: ${result.error}`);
    }
    setIsLoadingConversations(false);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const fetchChapterContent = useCallback(
    async (chapterNumber: number) => {
      if (
        !state.originalContent ||
        state.chapterIndex.length === 0 ||
        chapterNumber < 1 ||
        !state.userBackground ||
        !state.conversationId
      ) {
        return;
      }

      if (state.generatedChapters[chapterNumber]) {
        dispatch({ type: "SET_DISPLAYED_CHAPTER", payload: { chapterNumber } });
        return;
      }

      dispatch({
        type: "START_CHAPTER_GENERATION",
        payload: { chapterNumber },
      });

      try {
        const previousChaptersContext: Record<string | number, string> = {};
        Object.keys(state.generatedChapters).forEach((key) => {
          const num = Number.parseInt(key, 10);
          if (num < chapterNumber) {
            previousChaptersContext[num] = state.generatedChapters[num];
          }
        });

        const response = await fetch("/api/generate-chapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: state.conversationId,
            targetChapterNumber: chapterNumber,
            fullContent: state.originalContent,
            userBackground: state.userBackground,
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
        dispatch({
          type: "CHAPTER_GENERATION_SUCCESS",
          payload: { chapterNumber, content: data.chapterContent },
        });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unknown error fetching chapter.";
        dispatch({
          type: "CHAPTER_GENERATION_FAIL",
          payload: {
            chapterNumber,
            error: `Failed to load chapter ${chapterNumber}: ${message}`,
          },
        });
        toast.error(`Failed to load chapter ${chapterNumber}: ${message}`);
      }
    },
    [
      state.originalContent,
      state.chapterIndex.length,
      state.userBackground,
      state.conversationId,
      state.generatedChapters,
      dispatch,
    ],
  );

  const handleContentSubmit = useCallback(
    async (text: string, background: string) => {
      if (!background.trim()) {
        toast.error("Please describe your background knowledge.");
        return;
      }
      dispatch({
        type: "START_INDEXING",
        payload: { content: text, background },
      });

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
          dispatch({
            type: "INDEX_SUCCESS",
            payload: { index: data.index, conversationId: data.conversationId },
          });
          fetchConversations();
        } else {
          throw new Error("Could not generate index or conversation record.");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error.";
        dispatch({
          type: "INDEX_FAIL",
          payload: { error: `Failed to generate index: ${message}` },
        });
        toast.error(`Failed to generate index: ${message}`);
      }
    },
    [dispatch, fetchConversations],
  );

  const handleLoadConversation = useCallback(
    async (id: number) => {
      if (state.status !== "idle" && state.status !== "error") {
        toast.info("Please wait for the current action to complete.");
        return;
      }
      dispatch({
        type: "LOAD_CONVERSATION_START",
        payload: { conversationId: id },
      });
      toast.info("Loading conversation...");

      const result = await getConversationDetails(id);

      if (result.success) {
        dispatch({
          type: "LOAD_CONVERSATION_SUCCESS",
          payload: result.details,
        });
        toast.success("Conversation loaded.");
      } else {
        dispatch({
          type: "LOAD_CONVERSATION_FAIL",
          payload: { error: `Failed to load conversation: ${result.error}` },
        });
        toast.error(`Failed to load conversation: ${result.error}`);
      }
    },
    [state.status, dispatch],
  );

  const handleAskQuestion = useCallback(
    async (question: string) => {
      if (
        !state.originalContent ||
        !question.trim() ||
        !state.userBackground ||
        !state.conversationId
      ) {
        toast.warning("Cannot ask question without an active conversation.");
        return;
      }

      dispatch({ type: "START_ANSWERING", payload: { question } });

      try {
        const response = await fetch("/api/ask-question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: state.conversationId,
            fullContent: state.originalContent,
            generatedChapters: state.generatedChapters,
            qaHistory: state.qaHistory,
            userQuestion: question,
            userBackground: state.userBackground,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`,
          );
        }

        const data = (await response.json()) as AskQuestionResponse;
        dispatch({
          type: "ANSWERING_SUCCESS",
          payload: { answer: data.answer },
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error asking question.";
        dispatch({
          type: "ANSWERING_FAIL",
          payload: { error: `Failed to get answer: ${message}` },
        });
        toast.error(`Failed to get answer: ${message}`);
      }
    },
    [
      state.conversationId,
      state.originalContent,
      state.userBackground,
      state.generatedChapters,
      state.qaHistory,
      dispatch,
    ],
  );

  useEffect(() => {
    if (
      state.status === "generatingChapter" &&
      state.currentChapterNumber === 0 &&
      state.chapterIndex.length > 0
    ) {
      fetchChapterContent(1);
    }
  }, [
    state.status,
    state.currentChapterNumber,
    state.chapterIndex,
    fetchChapterContent,
  ]);

  const handleNextChapter = useCallback(() => {
    if (state.currentChapterNumber < state.chapterIndex.length) {
      fetchChapterContent(state.currentChapterNumber + 1);
    }
  }, [
    state.currentChapterNumber,
    state.chapterIndex.length,
    fetchChapterContent,
  ]);

  const handlePrevChapter = useCallback(() => {
    if (state.currentChapterNumber > 1) {
      fetchChapterContent(state.currentChapterNumber - 1);
    }
  }, [state.currentChapterNumber, fetchChapterContent]);

  const handleChapterSelect = useCallback(
    (chapterNumber: number) => {
      if (chapterNumber !== state.currentChapterNumber) {
        fetchChapterContent(chapterNumber);
      }
    },
    [state.currentChapterNumber, fetchChapterContent],
  );

  const currentChapterTitle =
    state.chapterIndex.find(
      (item) => item.chapter === state.currentChapterNumber,
    )?.title ||
    (state.currentChapterNumber > 0
      ? `Chapter ${state.currentChapterNumber}`
      : "Select a chapter");

  const displayedContent =
    state.generatedChapters[state.currentChapterNumber] || "";

  const isContentSubmitted = state.conversationId !== null;
  const isLoading = state.status !== "idle" && state.status !== "error";
  const isNavigatingDisabled =
    state.status === "generatingChapter" ||
    state.status === "loadingConversation";
  const isDrawerDisabled = isLoading;

  return (
    <div className="flex h-screen bg-background text-foreground relative">
      <IndexDrawer
        index={state.chapterIndex}
        currentChapter={state.currentChapterNumber}
        onChapterSelect={handleChapterSelect}
        isLoading={isLoading}
      />
      <ConversationDrawer
        conversations={conversationList}
        onSelectConversation={handleLoadConversation}
        isLoading={isLoadingConversations}
        isDisabled={isDrawerDisabled}
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
          <ContentSubmissionForm
            onSubmit={handleContentSubmit}
            isLoading={state.status === "indexing"}
          />
        )}

        {isContentSubmitted && (
          <MainDisplayArea
            title={currentChapterTitle}
            content={displayedContent}
            currentChapter={state.currentChapterNumber}
            totalChapters={state.chapterIndex.length}
            isLoading={
              state.status === "generatingChapter" ||
              state.status === "loadingConversation"
            }
            onNext={handleNextChapter}
            onPrev={handlePrevChapter}
            isNavDisabled={isNavigatingDisabled}
          />
        )}

        {state.status === "indexing" && (
          <p className="mt-4 text-muted-foreground italic">
            Generating index...
          </p>
        )}
        {state.status === "loadingConversation" && (
          <p className="mt-4 text-muted-foreground italic">
            Loading conversation...
          </p>
        )}

        {state.status === "error" && (
          <p className="text-destructive mt-4">Error: {state.error}</p>
        )}
      </div>

      {isContentSubmitted && (
        <aside className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0 h-screen flex flex-col border-l border-border">
          <QASidebar
            history={state.qaHistory}
            onAskQuestion={handleAskQuestion}
            isLoading={state.status === "answering"}
          />
        </aside>
      )}
    </div>
  );
}
