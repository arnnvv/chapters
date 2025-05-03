"use client";

import { useEffect, useState, useCallback, useReducer, useRef } from "react";
import type { JSX } from "react";
import { toast } from "sonner";
import {
  getUserConversations,
  getConversationDetails,
  signOutAction,
  deleteConversationAction,
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
import { LogOut, User as UserIcon, Plus } from "lucide-react";
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
  generatingChapterNumber: number | null; // NEW: Track which chapter is loading
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
  | { type: "PREFETCH_CHAPTER_SUCCESS"; payload: { chapterNumber: number; content: string } }
  | { type: "RESET" };

const initialState: ChatState = {
  status: "idle",
  conversationId: null,
  originalContent: "",
  userBackground: "",
  chapterIndex: [],
  currentChapterNumber: 0,
  generatingChapterNumber: null, // Initialize as null
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
        status: "generatingChapter", // Will trigger effect for chapter 1
        chapterIndex: action.payload.index,
        conversationId: action.payload.conversationId,
        currentChapterNumber: 0,
        generatingChapterNumber: 1, // Initially targeting chapter 1
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
      return {
        ...state,
        status: "generatingChapter",
        // Don't change currentChapterNumber yet, only the target
        generatingChapterNumber: action.payload.chapterNumber,
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
        // Only update displayed chapter if it matches the one that just finished loading
        currentChapterNumber: state.generatingChapterNumber === action.payload.chapterNumber
          ? action.payload.chapterNumber
          : state.currentChapterNumber,
        generatingChapterNumber: null, // Finished loading
        error: null,
      };
    }
    case "PREFETCH_CHAPTER_SUCCESS": {
      // Only update the generated content, don't change status or current chapter
      // Keep generatingChapterNumber as null unless a user action sets it
      return {
        ...state,
        generatedChapters: {
          ...state.generatedChapters,
          [action.payload.chapterNumber]: action.payload.content,
        },
        // No change to generatingChapterNumber here
      };
    }
    case "CHAPTER_GENERATION_FAIL":
      return {
        ...state,
        status: "error", // Set status to error regardless
        error: action.payload.error,
        generatingChapterNumber: null, // Stop tracking loading on fail
      };
    case "SET_DISPLAYED_CHAPTER":
      // When user selects an *already generated* chapter
      // Ensure we are not currently generating another chapter
      if (state.status === 'generatingChapter') return state; // Prevent changing display while generating
      return {
        ...state,
        status: "idle",
        currentChapterNumber: action.payload.chapterNumber,
        generatingChapterNumber: null, // Ensure no chapter is marked as generating
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
        generatingChapterNumber: null, // Stop chapter gen if asking question
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
        conversationId: action.payload.conversationId, // Keep track of which one is loading
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
      const firstGeneratedChapter = Math.min(
        ...Object.keys(initialChapters).map(Number).filter(num => !isNaN(num)),
        Infinity
      );
      const initialChapterNum = firstGeneratedChapter === Infinity ? 0 : firstGeneratedChapter;
      const shouldStartGenerating = initialChapterNum === 0 && simpleIndex.length > 0;

      return {
        ...state,
        status: shouldStartGenerating ? "generatingChapter" : "idle",
        conversationId: conversation.id,
        originalContent: conversation.original_content,
        userBackground: conversation.user_background,
        chapterIndex: simpleIndex,
        currentChapterNumber: initialChapterNum,
        // Set generatingChapterNumber only if we need to fetch chapter 1
        generatingChapterNumber: shouldStartGenerating ? 1 : null,
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

  // Ref for pre-fetching control (remains the same)
  const isPrefetchingRef = useRef(false);
  const prefetchTargetRef = useRef<number | null>(null);
  const isMountedRef = useRef(false);

  // --- Function to Fetch Conversations ---
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

  // --- Initial Fetch of Conversations ---
  useEffect(() => {
    fetchConversations();
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; }
  }, [fetchConversations]);


  // --- Function to fetch a specific chapter (user-initiated or prefetch) ---
  const fetchChapterContent = useCallback(
    async (chapterNumber: number, isPrefetch: boolean = false) => {
      if (
        !isMountedRef.current ||
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

      // If already generated: display if user-initiated, or skip if prefetch
      if (state.generatedChapters[chapterNumber]) {
        if (!isPrefetch && state.status !== 'generatingChapter') { // Only set display if not already generating another chapter
          dispatch({ type: "SET_DISPLAYED_CHAPTER", payload: { chapterNumber } });
        }
        if (isPrefetch) {
          const nextPrefetchNum = chapterNumber + 1;
          if (nextPrefetchNum <= state.chapterIndex.length) {
            prefetchTargetRef.current = nextPrefetchNum;
          } else {
            prefetchTargetRef.current = null;
          }
          isPrefetchingRef.current = false;
        }
        return;
      }

      // If *another* chapter is already being generated by user action, don't start a new one
      if (state.status === 'generatingChapter' && state.generatingChapterNumber !== chapterNumber && !isPrefetch) {
        toast.info(`Please wait for Chapter ${state.generatingChapterNumber} to load.`);
        return;
      }


      // Dispatch start only for user-initiated fetches
      if (!isPrefetch) {
        prefetchTargetRef.current = null;
        isPrefetchingRef.current = false;
        dispatch({
          type: "START_CHAPTER_GENERATION",
          payload: { chapterNumber }, // This sets generatingChapterNumber
        });
      } else {
        // Don't dispatch START for prefetch, but mark as prefetching
        if (state.status === 'generatingChapter') { // Don't prefetch if user is actively generating
          isPrefetchingRef.current = false;
          prefetchTargetRef.current = null;
          return;
        }
        isPrefetchingRef.current = true;
      }

      try {
        const previousChaptersContext: Record<string | number, string> = {};
        Object.keys(state.generatedChapters).forEach((key) => {
          const num = Number.parseInt(key, 10);
          if (!isNaN(num) && num < chapterNumber) {
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

        if (isPrefetch) {
          dispatch({
            type: "PREFETCH_CHAPTER_SUCCESS",
            payload: { chapterNumber, content: data.chapterContent },
          });
          const nextPrefetchNum = chapterNumber + 1;
          if (nextPrefetchNum <= state.chapterIndex.length) {
            prefetchTargetRef.current = nextPrefetchNum;
          } else {
            prefetchTargetRef.current = null;
          }
          isPrefetchingRef.current = false; // Mark prefetch cycle as done

        } else {
          // Success for user-initiated or initial chapter 1 load
          dispatch({
            type: "CHAPTER_GENERATION_SUCCESS",
            payload: { chapterNumber, content: data.chapterContent },
          });
          isPrefetchingRef.current = false;
          prefetchTargetRef.current = null;
        }

      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unknown error fetching chapter.";
        // Dispatch failure, affects status and resets generatingChapterNumber
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
          console.warn(`Prefetch failed for chapter ${chapterNumber}: ${message}`);
        }
        isPrefetchingRef.current = false;
        prefetchTargetRef.current = null;
      }
    },
    [
      state.originalContent,
      state.chapterIndex.length,
      state.userBackground,
      state.conversationId,
      state.generatedChapters,
      state.status, // Need status to check if already generating
      state.generatingChapterNumber, // Need generating number
      dispatch,
    ],
  );

  // --- Function to start the pre-fetch sequence (remains similar) ---
  const startPrefetchSequence = useCallback(async () => {
    // Added check for generatingChapter status
    if (!isMountedRef.current || isPrefetchingRef.current || !prefetchTargetRef.current || state.status !== 'idle') {
      return;
    }

    const target = prefetchTargetRef.current;
    await fetchChapterContent(target, true);

  }, [state.status, fetchChapterContent]);

  // --- Effect to initiate the first chapter fetch OR start pre-fetching ---
  useEffect(() => {
    if (!isMountedRef.current) return;

    // 1. Initial load of Chapter 1 after index success (if not already loaded)
    if (
      state.status === "generatingChapter" &&
      state.generatingChapterNumber === 1 && // Specifically targeting chapter 1
      !state.generatedChapters[1]
    ) {
      fetchChapterContent(1, false); // Fetch chapter 1
    }
    // 2. Start or continue pre-fetching when idle
    else if (
      state.status === 'idle' && // MUST be idle
      state.conversationId !== null &&
      !isPrefetchingRef.current // Only if not already prefetching
    ) {
      // Determine the *next* chapter to prefetch logically after the *current displayed* one
      const nextLogicalChapter = state.currentChapterNumber + 1;

      // If prefetch target is not set OR it's outdated (<= current chapter)
      // find the *first* unloaded chapter >= nextLogicalChapter
      if (!prefetchTargetRef.current || prefetchTargetRef.current <= state.currentChapterNumber) {
        let foundTarget: number | null = null;
        for (let i = nextLogicalChapter; i <= state.chapterIndex.length; i++) {
          if (!state.generatedChapters[i]) {
            foundTarget = i;
            break;
          }
        }
        prefetchTargetRef.current = foundTarget;
      }


      // If there's a valid target, start the sequence
      if (prefetchTargetRef.current) {
        startPrefetchSequence();
      }
    } else if (state.status !== 'idle' && state.status !== 'generatingChapter') {
      // If status changes to something blocking (indexing, answering, loading), cancel prefetch intent
      prefetchTargetRef.current = null;
      isPrefetchingRef.current = false; // Ensure prefetch stops if active
    }

  }, [
    state.status,
    state.generatingChapterNumber, // Use this to trigger initial fetch
    state.currentChapterNumber, // Use this to determine next prefetch target
    state.chapterIndex.length,
    state.conversationId,
    state.generatedChapters,
    fetchChapterContent,
    startPrefetchSequence
  ]);

  // --- Handler for Content Submission (reset prefetch state) ---
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

  // --- Handler for Loading Existing Conversation (reset prefetch state) ---
  const handleLoadConversation = useCallback(
    async (id: number) => {
      // Prevent loading if already loading this ID or during other major actions
      if (state.status === "loadingConversation" && state.conversationId === id) return;
      if (state.status === 'indexing' || state.status === 'answering') {
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
    [state.status, state.conversationId, dispatch], // Added state.conversationId dependency
  );

  // --- Handler for Asking Questions (reset prefetch state) ---
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
      if (state.status === 'generatingChapter') {
        toast.info(`Please wait for Chapter ${state.generatingChapterNumber} to load before asking questions.`);
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
      state.status, // check status
      state.generatingChapterNumber, // check generating number
      dispatch,
    ],
  );

  // --- Handler for Deleting Conversation (reset prefetch state) ---
  const handleDeleteConversation = useCallback(
    async (idToDelete: number) => {
      // Prevent deleting if globally disabled or if this specific one is loading
      if (state.status === 'loadingConversation' && state.conversationId === idToDelete) {
        toast.warning("Cannot delete conversation while it's loading.");
        return;
      }
      if (state.status === 'indexing' || state.status === 'answering' || state.status === 'generatingChapter') {
        toast.info("Please wait for the current action to complete before deleting.");
        return;
      }

      const result = await deleteConversationAction(idToDelete);
      if (result.success) {
        toast.success(result.message);
        setConversationList((prev) => prev.filter((c) => c.id !== idToDelete));
        if (state.conversationId === idToDelete) {
          prefetchTargetRef.current = null;
          isPrefetchingRef.current = false;
          dispatch({ type: "RESET" });
        }
      } else {
        toast.error(result.message);
      }
    },
    [state.conversationId, state.status, dispatch], // Added state.status
  );

  // --- Navigation Handlers ---
  const handleNextChapter = useCallback(() => {
    if (state.currentChapterNumber < state.chapterIndex.length) {
      fetchChapterContent(state.currentChapterNumber + 1, false);
    }
  }, [
    state.currentChapterNumber,
    state.chapterIndex.length,
    fetchChapterContent,
  ]);

  const handlePrevChapter = useCallback(() => {
    if (state.currentChapterNumber > 1) {
      fetchChapterContent(state.currentChapterNumber - 1, false);
    }
  }, [state.currentChapterNumber, fetchChapterContent]);

  // --- Chapter Selection Handler ---
  const handleChapterSelect = useCallback(
    (chapterNumber: number) => {
      // Allow selection even if another chapter is generating,
      // but fetchChapterContent will handle preventing simultaneous fetches.
      if (chapterNumber !== state.currentChapterNumber || !state.generatedChapters[chapterNumber]) {
        fetchChapterContent(chapterNumber, false);
      } else if (state.generatedChapters[chapterNumber]) {
        // If already generated and selected, just ensure display (handled by fetchChapterContent)
        dispatch({ type: "SET_DISPLAYED_CHAPTER", payload: { chapterNumber } });
      }
    },
    [state.currentChapterNumber, state.generatedChapters, fetchChapterContent, dispatch],
  );

  // --- Handler for New Chat Button (reset prefetch state) ---
  const handleNewChat = useCallback(() => {
    // Prevent starting new if busy
    if (state.status !== 'idle' && state.status !== 'error') {
      toast.warning("Please wait for the current action to finish.");
      return;
    }
    prefetchTargetRef.current = null;
    isPrefetchingRef.current = false;
    dispatch({ type: 'RESET' });
  }, [dispatch, state.status]);

  // --- Derived State ---
  const currentChapterTitle =
    state.chapterIndex.find(
      (item) => item.chapter === state.currentChapterNumber,
    )?.title ||
    (state.currentChapterNumber > 0
      ? `Chapter ${state.currentChapterNumber}`
      : state.conversationId !== null ? "Select a chapter" : "");

  const displayedContent =
    state.generatedChapters[state.currentChapterNumber] || "";

  const isContentSubmitted = state.conversationId !== null;
  const isChapterCurrentlyLoading = state.status === "generatingChapter"; // Is *any* chapter loading?
  const isNavigatingDisabled = isChapterCurrentlyLoading || state.status === "loadingConversation"; // Disable nav buttons during these specific loads
  const isGloballyDisabled = state.status === 'indexing' || state.status === 'loadingConversation' || state.status === 'answering'; // When major actions block UI


  return (
    <div className="flex h-screen bg-background text-foreground relative">
      {/* Drawers */}
      <IndexDrawer
        index={state.chapterIndex}
        currentChapter={state.currentChapterNumber}
        onChapterSelect={handleChapterSelect}
        // Pass specific loading chapter and global disable flag
        currentlyGeneratingChapterNumber={state.generatingChapterNumber}
        isGloballyDisabled={isGloballyDisabled} // Disable items during indexing/loading convo
      />
      <ConversationDrawer
        conversations={conversationList}
        onSelectConversation={handleLoadConversation}
        isLoading={isLoadingConversations} // For the list itself
        isDisabled={isGloballyDisabled || isChapterCurrentlyLoading} // Disable during any major load *or* chapter generation
        currentlyLoadingConversationId={state.status === 'loadingConversation' ? state.conversationId : null} // Pass loading convo ID
        onDeleteConversation={handleDeleteConversation}
      />
      {/* New Chat Button */}
      <Button
        variant="outline"
        size="icon"
        className="absolute top-28 left-4 md:top-32 md:left-6 lg:top-36 lg:left-8 z-10"
        aria-label="Start new chat"
        onClick={handleNewChat}
        disabled={isGloballyDisabled || isChapterCurrentlyLoading} // Disable during load/generation
      >
        <Plus className="h-5 w-5" />
      </Button>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col p-4 md:p-6 lg:p-8 overflow-y-auto pl-16 md:pl-20 lg:pl-24 relative">
        {/* User Avatar & Logout */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 lg:top-8 lg:right-8 z-20">
          {/* Avatar Dropdown remains the same */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-9 w-9 md:h-10 md:w-10 cursor-pointer hover:ring-2 hover:ring-ring hover:ring-offset-2 hover:ring-offset-background rounded-full transition-all">
                <AvatarImage
                  src={user?.picture ?? undefined}
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
              <DropdownMenuItem asChild className="cursor-pointer p-0">
                <SignOutFormComponent action={signOutAction}>
                  <Button
                    type="submit"
                    variant="ghost"
                    className="w-full justify-start px-2 py-1.5 text-sm font-normal h-auto"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </Button>
                </SignOutFormComponent>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Page Title */}
        <h1 className="text-2xl md:text-3xl font-bold mb-6 border-b pb-2 border-border pr-16 md:pr-20">
          Document Teaching Assistant
        </h1>

        {/* Conditional Content Display */}
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
            isLoading={isChapterCurrentlyLoading && state.generatingChapterNumber === state.currentChapterNumber} // Show loading only if *this* chapter is generating
            onNext={handleNextChapter}
            onPrev={handlePrevChapter}
            isNavDisabled={isNavigatingDisabled} // Disable nav buttons if *any* chapter load or convo load
          />
        )}

        {/* Loading/Error Indicators */}
        {state.status === "indexing" && (
          <p className="mt-4 text-muted-foreground italic">
            Generating index...
          </p>
        )}
        {state.status === "loadingConversation" && (
          <p className="mt-4 text-muted-foreground italic">
            Loading conversation {state.conversationId}...
          </p>
        )}
        {/* More specific loading message for chapter generation */}
        {state.status === 'generatingChapter' && state.generatingChapterNumber !== state.currentChapterNumber && (
          <p className="mt-4 text-muted-foreground italic">
            Loading Chapter {state.generatingChapterNumber}... (You can browse other loaded chapters)
          </p>
        )}
        {state.status === "error" && (
          <p className="text-destructive mt-4">Error: {state.error}</p>
        )}
      </div>

      {/* QA Sidebar */}
      {isContentSubmitted && (
        <aside className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0 h-screen flex flex-col border-l border-border">
          <QASidebar
            history={state.qaHistory}
            onAskQuestion={handleAskQuestion}
            // Disable asking only when answering or indexing
            isLoading={state.status === "answering" || state.status === 'indexing'}
          />
        </aside>
      )}
    </div>
  );
}
