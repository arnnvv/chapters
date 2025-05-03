"use client";

import { useEffect, useReducer, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import dynamic from "next/dynamic";

import { AppShell } from "@/components/layout/app-shell";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ChapterDisplay } from "@/components/content/chapter-display";
import { QASidebar } from "@/components/content/qa-sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  getUserConversations,
  getConversationDetails,
  deleteConversationAction,
  getCurrentSession,
  type ConversationListItem,
  type ConversationDetails,
} from "@/app/actions";
import type { ChapterIndexItem } from "@/lib/db/types";
import type { AskQuestionResponse, QAItem } from "@/app/api/ask-question/route";
import type { GenerateChapterResponse } from "@/app/api/generate-chapter/route";
import type { GenerateIndexApiResponse } from "@/app/api/generate-index/route";
import { Loader2 } from "lucide-react";

const ContentSubmissionForm = dynamic(
  () =>
    import("@/components/content/content-submission-form").then(
      (mod) => mod.ContentSubmissionForm,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-start pt-10 min-h-full">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading Form...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full mt-4" />
            <Skeleton className="h-16 w-full mt-4" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      </div>
    ),
  },
);

type Status =
  | "idle"
  | "indexing"
  | "generatingChapter"
  | "answering"
  | "loadingConversation"
  | "error"
  | "initializing";

interface ChatState {
  status: Status;
  conversationId: number | null;
  originalContent: string;
  userBackground: string;
  chapterIndex: ChapterIndexItem[];
  currentChapterNumber: number;
  generatingChapterNumber: number | null;
  generatedChapters: Record<number, string>;
  qaHistory: QAItem[];
  error: string | null;
}

type ChatAction =
  | { type: "INITIALIZE"; payload: { user: UserData } }
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
  | {
      type: "PREFETCH_CHAPTER_SUCCESS";
      payload: { chapterNumber: number; content: string };
    }
  | { type: "RESET" };

const initialState: ChatState = {
  status: "initializing",
  conversationId: null,
  originalContent: "",
  userBackground: "",
  chapterIndex: [],
  currentChapterNumber: 0,
  generatingChapterNumber: null,
  generatedChapters: {},
  qaHistory: [],
  error: null,
};

interface UserData {
  name: string | null;
  picture: string | null;
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "INITIALIZE":
      return {
        ...initialState,
        status: "idle",
      };
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
        generatingChapterNumber: 1,
        generatedChapters: {},
        qaHistory: [],
        error: null,
      };
    case "INDEX_FAIL":
      return {
        ...state,
        status: "error",
        error: action.payload.error,
        originalContent: "",
        userBackground: "",
        generatingChapterNumber: null,
      };
    case "START_CHAPTER_GENERATION":
      if (state.generatingChapterNumber === action.payload.chapterNumber) {
        return state;
      }
      return {
        ...state,
        status:
          state.status === "generatingChapter"
            ? state.status
            : "generatingChapter",
        generatingChapterNumber: action.payload.chapterNumber,
        error: null,
      };
    case "CHAPTER_GENERATION_SUCCESS": {
      const isGeneratingChapterTheCurrentTarget =
        state.generatingChapterNumber === action.payload.chapterNumber;
      return {
        ...state,
        status: isGeneratingChapterTheCurrentTarget ? "idle" : state.status,
        generatedChapters: {
          ...state.generatedChapters,
          [action.payload.chapterNumber]: action.payload.content,
        },
        currentChapterNumber: isGeneratingChapterTheCurrentTarget
          ? action.payload.chapterNumber
          : state.currentChapterNumber,
        generatingChapterNumber: isGeneratingChapterTheCurrentTarget
          ? null
          : state.generatingChapterNumber,
        error: null,
      };
    }
    case "PREFETCH_CHAPTER_SUCCESS": {
      return {
        ...state,
        generatedChapters: {
          ...state.generatedChapters,
          [action.payload.chapterNumber]: action.payload.content,
        },
      };
    }
    case "CHAPTER_GENERATION_FAIL":
      const wasActivelyGenerating =
        state.generatingChapterNumber === action.payload.chapterNumber;
      return {
        ...state,
        status: wasActivelyGenerating ? "error" : state.status,
        error: action.payload.error,
        generatingChapterNumber: wasActivelyGenerating
          ? null
          : state.generatingChapterNumber,
      };
    case "SET_DISPLAYED_CHAPTER":
      if (
        state.status === "generatingChapter" &&
        state.generatingChapterNumber === action.payload.chapterNumber
      )
        return state;
      if (!state.generatedChapters[action.payload.chapterNumber]) {
        return state;
      }
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
        generatingChapterNumber: null,
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
      const chapterNumbers = Object.keys(initialChapters)
        .map(Number)
        .filter((num) => !isNaN(num));
      const firstGeneratedChapter =
        chapterNumbers.length > 0
          ? Math.min(...chapterNumbers)
          : Number.POSITIVE_INFINITY;

      const initialChapterNum =
        firstGeneratedChapter === Number.POSITIVE_INFINITY
          ? 0
          : firstGeneratedChapter;
      const needsFirstChapterGeneration =
        simpleIndex.length > 0 && !initialChapters[1];

      return {
        ...initialState,
        status: needsFirstChapterGeneration ? "generatingChapter" : "idle",
        conversationId: conversation.id,
        originalContent: conversation.original_content,
        userBackground: conversation.user_background,
        chapterIndex: simpleIndex,
        currentChapterNumber: initialChapterNum,
        generatingChapterNumber: needsFirstChapterGeneration ? 1 : null,
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
      return { ...initialState, status: "idle" };
    default:
      return state;
  }
}

export default function HomePage() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const [conversationList, setConversationList] = useState<
    ConversationListItem[]
  >([]);
  const [isLoadingConversations, setIsLoadingConversations] =
    useState<boolean>(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const router = useRouter();
  const isPrefetchingRef = useRef(false);
  const prefetchTargetRef = useRef<number | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const sessionResult = await getCurrentSession();
        if (!sessionResult.session || !sessionResult.user) {
          router.push("/login");
          return;
        }
        setUserData({
          name: sessionResult.user.name,
          picture: sessionResult.user.picture,
        });
        dispatch({ type: "INITIALIZE", payload: { user: sessionResult.user } });
        await fetchConversations();
      } catch (error) {
        console.error("Initialization error:", error);
        toast.error("Failed to initialize application.");
        dispatch({ type: "RESET" });
      }
    };
    initialize();
  }, [router]);

  const fetchConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const result = await getUserConversations();
      if (result.success) {
        setConversationList(result.conversations);
      } else {
        toast.error(`Failed to load conversations: ${result.error}`);
      }
    } catch (error) {
      toast.error("An error occurred while fetching conversations");
      console.error("Fetch conversations error:", error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  const handleContentSubmit = useCallback(
    async (text: string, background: string) => {
      if (!background.trim()) {
        toast.error("Please describe your background knowledge.");
        return;
      }
      prefetchTargetRef.current = null;
      isPrefetchingRef.current = false;

      dispatch({
        type: "START_INDEXING",
        payload: { content: text, background },
      });
      toast.info("Generating document index...");

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
          await fetchConversations();
          toast.success("Index generated. Loading first chapter...");
        } else {
          throw new Error("Invalid response when generating index.");
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

  const fetchChapterContent = useCallback(
    async (chapterNumber: number, isPrefetch = false) => {
      if (
        !state.originalContent ||
        state.chapterIndex.length === 0 ||
        chapterNumber < 1 ||
        chapterNumber > state.chapterIndex.length ||
        !state.userBackground ||
        !state.conversationId
      ) {
        if (isPrefetch) isPrefetchingRef.current = false;
        return;
      }

      if (state.generatedChapters[chapterNumber]) {
        if (!isPrefetch && state.status !== "generatingChapter") {
          dispatch({
            type: "SET_DISPLAYED_CHAPTER",
            payload: { chapterNumber },
          });
        }
        if (isPrefetch) {
          prefetchTargetRef.current = chapterNumber + 1;
          isPrefetchingRef.current = false;
        }
        return;
      }

      if (
        !isPrefetch &&
        state.status === "generatingChapter" &&
        state.generatingChapterNumber !== chapterNumber
      ) {
        toast.info(
          `Please wait for Chapter ${state.generatingChapterNumber} to load.`,
        );
        return;
      }

      if (isPrefetch && state.status === "generatingChapter") {
        isPrefetchingRef.current = false;
        prefetchTargetRef.current = null;
        return;
      }

      if (!isPrefetch) {
        prefetchTargetRef.current = null;
        isPrefetchingRef.current = false;
        dispatch({
          type: "START_CHAPTER_GENERATION",
          payload: { chapterNumber },
        });
      } else {
        isPrefetchingRef.current = true;
      }

      try {
        const previousChaptersContext: Record<string | number, string> = {};
        Object.keys(state.generatedChapters).forEach((key) => {
          const num = Number.parseInt(key, 10);
          if (!isNaN(num) && num < chapterNumber) {
            const content = state.generatedChapters[num];
            previousChaptersContext[num] =
              content.length > 500
                ? content.substring(0, 500) + "..."
                : content;
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

        if (isPrefetch) {
          dispatch({
            type: "PREFETCH_CHAPTER_SUCCESS",
            payload: { chapterNumber, content: data.chapterContent },
          });
          prefetchTargetRef.current = chapterNumber + 1;
          isPrefetchingRef.current = false;
        } else {
          dispatch({
            type: "CHAPTER_GENERATION_SUCCESS",
            payload: { chapterNumber, content: data.chapterContent },
          });
          isPrefetchingRef.current = false;
          prefetchTargetRef.current = chapterNumber + 1;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error.";
        dispatch({
          type: "CHAPTER_GENERATION_FAIL",
          payload: {
            chapterNumber,
            error: `Failed to load chapter ${chapterNumber}: ${message}`,
          },
        });
        if (!isPrefetch) {
          toast.error(`Failed to load chapter ${chapterNumber}: ${message}`);
        } else {
          console.warn(
            `Prefetch failed for chapter ${chapterNumber}: ${message}`,
          );
        }
        isPrefetchingRef.current = false;
        prefetchTargetRef.current = null;
      }
    },
    [
      state.conversationId,
      state.originalContent,
      state.userBackground,
      state.generatedChapters,
      state.chapterIndex.length,
      state.status,
      state.generatingChapterNumber,
      dispatch,
    ],
  );

  const startPrefetchSequence = useCallback(async () => {
    if (
      isPrefetchingRef.current ||
      !prefetchTargetRef.current ||
      state.status !== "idle"
    ) {
      return;
    }
    const target = prefetchTargetRef.current;
    if (target > state.chapterIndex.length) {
      prefetchTargetRef.current = null;
      return;
    }
    await fetchChapterContent(target, true);
  }, [state.status, state.chapterIndex.length, fetchChapterContent]);

  useEffect(() => {
    if (
      state.status === "generatingChapter" &&
      state.generatingChapterNumber === 1 &&
      !state.generatedChapters[1]
    ) {
      fetchChapterContent(1, false);
    } else if (
      state.status === "idle" &&
      state.conversationId !== null &&
      !isPrefetchingRef.current
    ) {
      const nextLogicalChapter = (state.currentChapterNumber || 0) + 1;
      if (
        !prefetchTargetRef.current ||
        prefetchTargetRef.current <= (state.currentChapterNumber || 0) ||
        state.generatedChapters[prefetchTargetRef.current]
      ) {
        let foundTarget: number | null = null;
        for (let i = nextLogicalChapter; i <= state.chapterIndex.length; i++) {
          if (!state.generatedChapters[i]) {
            foundTarget = i;
            break;
          }
        }
        prefetchTargetRef.current = foundTarget;
      }
      if (
        prefetchTargetRef.current &&
        prefetchTargetRef.current <= state.chapterIndex.length
      ) {
        startPrefetchSequence();
      }
    } else if (
      state.status !== "idle" &&
      state.status !== "generatingChapter"
    ) {
      isPrefetchingRef.current = false;
      prefetchTargetRef.current = null;
    }
  }, [
    state.status,
    state.generatingChapterNumber,
    state.currentChapterNumber,
    state.conversationId,
    state.generatedChapters,
    state.chapterIndex.length,
    fetchChapterContent,
    startPrefetchSequence,
  ]);

  const handleLoadConversation = useCallback(
    async (id: number) => {
      if (state.status === "loadingConversation" && state.conversationId === id)
        return;
      if (state.status !== "idle" && state.status !== "error") {
        toast.info("Please wait for the current action to complete.");
        return;
      }

      prefetchTargetRef.current = null;
      isPrefetchingRef.current = false;

      dispatch({
        type: "LOAD_CONVERSATION_START",
        payload: { conversationId: id },
      });
      toast.info("Loading conversation...");

      try {
        const result = await getConversationDetails(id);
        if (result.success) {
          if (result.details) {
            dispatch({
              type: "LOAD_CONVERSATION_SUCCESS",
              payload: result.details,
            });
            toast.success("Conversation loaded successfully");
          } else {
            throw new Error(
              "Conversation loaded successfully but details are missing.",
            );
          }
        } else {
          const errorMessage =
            result.error || "Failed to load conversation details.";
          dispatch({
            type: "LOAD_CONVERSATION_FAIL",
            payload: { error: errorMessage },
          });
          toast.error(errorMessage);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error occurred";
        dispatch({
          type: "LOAD_CONVERSATION_FAIL",
          payload: { error: `Failed to load conversation: ${message}` },
        });
        toast.error(`Failed to load conversation: ${message}`);
        console.error("Load conversation error:", error);
      }
    },
    [state.status, state.conversationId, dispatch],
  );

  const handleAskQuestion = useCallback(
    async (question: string) => {
      if (
        !state.conversationId ||
        !state.originalContent ||
        !state.userBackground
      ) {
        toast.warning("Cannot ask question without an active conversation.");
        return;
      }
      if (state.status === "generatingChapter") {
        toast.info(
          `Please wait for Chapter ${state.generatingChapterNumber} to load.`,
        );
        return;
      }
      if (state.status === "answering") {
        toast.info("Please wait for the current answer.");
        return;
      }

      prefetchTargetRef.current = null;
      isPrefetchingRef.current = false;

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
        const message = err instanceof Error ? err.message : "Unknown error.";
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
      state.status,
      state.generatingChapterNumber,
      dispatch,
    ],
  );

  const handleDeleteConversation = useCallback(
    async (idToDelete: number) => {
      if (
        state.status === "loadingConversation" &&
        state.conversationId === idToDelete
      ) {
        toast.warning("Cannot delete conversation while it's loading.");
        return;
      }
      if (state.status !== "idle" && state.status !== "error") {
        toast.info(
          "Please wait for the current action to complete before deleting.",
        );
        return;
      }

      try {
        const result = await deleteConversationAction(idToDelete);
        if (result.success) {
          toast.success(result.message);
          setConversationList((prev) =>
            prev.filter((c) => c.id !== idToDelete),
          );
          if (state.conversationId === idToDelete) {
            prefetchTargetRef.current = null;
            isPrefetchingRef.current = false;
            dispatch({ type: "RESET" });
          }
        } else {
          toast.error(result.message || "Failed to delete conversation");
        }
      } catch (error) {
        toast.error("An error occurred while deleting the conversation");
        console.error("Delete conversation error:", error);
      }
    },
    [state.conversationId, state.status, dispatch],
  );

  const handleNewConversation = useCallback(() => {
    if (state.status !== "idle" && state.status !== "error") {
      toast.warning("Please wait for the current action to finish.");
      return;
    }
    prefetchTargetRef.current = null;
    isPrefetchingRef.current = false;
    dispatch({ type: "RESET" });
  }, [dispatch, state.status]);

  const handleChapterSelect = useCallback(
    (chapterNumber: number) => {
      if (state.generatedChapters[chapterNumber]) {
        dispatch({ type: "SET_DISPLAYED_CHAPTER", payload: { chapterNumber } });
      } else {
        fetchChapterContent(chapterNumber, false);
      }
    },
    [state.generatedChapters, fetchChapterContent, dispatch],
  );

  const handleNextChapter = useCallback(() => {
    const nextChapter = (state.currentChapterNumber || 0) + 1;
    if (nextChapter <= state.chapterIndex.length) {
      handleChapterSelect(nextChapter);
    }
  }, [
    state.currentChapterNumber,
    state.chapterIndex.length,
    handleChapterSelect,
  ]);

  const handlePrevChapter = useCallback(() => {
    const prevChapter = (state.currentChapterNumber || 0) - 1;
    if (prevChapter >= 1) {
      handleChapterSelect(prevChapter);
    }
  }, [state.currentChapterNumber, handleChapterSelect]);

  const currentChapterTitle =
    state.chapterIndex.find(
      (item) => item.chapter === state.currentChapterNumber,
    )?.title || "";

  const displayedContent =
    state.generatedChapters[state.currentChapterNumber] || "";
  const isContentSubmitted = state.conversationId !== null;
  const isCurrentChapterLoading =
    state.status === "generatingChapter" &&
    state.generatingChapterNumber === state.currentChapterNumber;
  const isNavigatingDisabled =
    state.status === "generatingChapter" ||
    state.status === "loadingConversation";
  const isGloballyDisabled =
    state.status === "indexing" ||
    state.status === "loadingConversation" ||
    state.status === "answering" ||
    state.status === "initializing";

  if (state.status === "initializing" || !userData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AppShell
      user={userData}
      sidebar={
        <SidebarNav
          conversations={conversationList}
          currentConversationId={state.conversationId}
          chapters={state.chapterIndex}
          currentChapter={state.currentChapterNumber}
          onSelectConversation={handleLoadConversation}
          onSelectChapter={handleChapterSelect}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          isLoading={isGloballyDisabled || state.status === "generatingChapter"}
          loadingChapter={state.generatingChapterNumber}
          isLoadingConversations={isLoadingConversations}
          currentlyLoadingConversationId={
            state.status === "loadingConversation" ? state.conversationId : null
          }
        />
      }
      rightSidebar={
        isContentSubmitted ? (
          <QASidebar
            history={state.qaHistory}
            onAskQuestion={handleAskQuestion}
            isLoading={state.status === "answering"}
          />
        ) : null
      }
      showRightSidebar={isContentSubmitted}
    >
      <div className="h-full p-4 md:p-6 lg:p-8">
        {!isContentSubmitted ? (
          <ContentSubmissionForm
            onSubmit={handleContentSubmit}
            isLoading={state.status === "indexing"}
          />
        ) : (
          <ChapterDisplay
            title={currentChapterTitle}
            content={displayedContent}
            currentChapter={state.currentChapterNumber}
            totalChapters={state.chapterIndex.length}
            isLoading={isCurrentChapterLoading}
            onNext={handleNextChapter}
            onPrev={handlePrevChapter}
            isNavDisabled={isNavigatingDisabled}
          />
        )}

        {state.status === "error" && state.error && (
          <div className="mt-4 p-3 border border-destructive/50 bg-destructive/10 rounded-md text-destructive text-sm">
            <p>
              <span className="font-medium">Error:</span> {state.error}
            </p>
          </div>
        )}
        {isPrefetchingRef.current && (
          <div className="fixed bottom-4 right-4 text-xs text-muted-foreground animate-pulse">
            Loading next chapter...
          </div>
        )}
      </div>
    </AppShell>
  );
}
