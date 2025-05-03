"use client";

import { useEffect, useState, useCallback, useReducer, useRef } from "react"; // Added useRef
import type { JSX } from "react";
import { toast } from "sonner";
import {
  getUserConversations,
  getConversationDetails,
  signOutAction,
  deleteConversationAction, // Added deleteConversationAction
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
import { LogOut, User as UserIcon, Plus } from "lucide-react"; // Added Plus
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
  currentChapterNumber: number; // 0 means no chapter selected/loaded initially
  generatedChapters: Record<number, string>; // Stores content keyed by chapter number
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
  | { type: "PREFETCH_CHAPTER_SUCCESS"; payload: { chapterNumber: number; content: string } } // New action for prefetch
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
        ...initialState, // Reset everything on new index
        status: "indexing",
        originalContent: action.payload.content,
        userBackground: action.payload.background,
      };
    case "INDEX_SUCCESS":
      return {
        ...state,
        status: "generatingChapter", // Start generating chapter 1 immediately
        chapterIndex: action.payload.index,
        conversationId: action.payload.conversationId,
        currentChapterNumber: 0, // Set to 0, effect will trigger fetch for 1
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
      // Only update status and target chapter if it's a user-initiated fetch
      // Background fetches won't dispatch this.
      return {
        ...state,
        status: "generatingChapter",
        currentChapterNumber: action.payload.chapterNumber,
        error: null,
      };
    case "CHAPTER_GENERATION_SUCCESS": {
      // This is for user-initiated fetches OR the initial fetch of chapter 1
      return {
        ...state,
        status: "idle", // Ready for next action or pre-fetching
        generatedChapters: {
          ...state.generatedChapters,
          [action.payload.chapterNumber]: action.payload.content,
        },
        currentChapterNumber: action.payload.chapterNumber, // Reflect the loaded chapter
        error: null,
      };
    }
    // --- NEW REDUCER CASE ---
    case "PREFETCH_CHAPTER_SUCCESS": {
      // Only update the generated content, don't change status or current chapter
      return {
        ...state,
        generatedChapters: {
          ...state.generatedChapters,
          [action.payload.chapterNumber]: action.payload.content,
        },
      };
    }
    // --- END NEW REDUCER CASE ---
    case "CHAPTER_GENERATION_FAIL":
      // This handles failure for BOTH user-initiated and pre-fetches if pre-fetch dispatches it
      return {
        ...state,
        status: "error", // Set status to error regardless
        error: action.payload.error,
        // currentChapterNumber might remain the same or be the failed one
      };
    case "SET_DISPLAYED_CHAPTER":
      // When user selects an *already generated* chapter
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
          { question: action.payload.question, answer: "" }, // Add placeholder
        ],
        error: null,
      };
    case "ANSWERING_SUCCESS": {
      const newHistory = [...state.qaHistory];
      if (newHistory.length > 0) {
        // Update the last item's answer
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
      // Remove the question that failed
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
        ...initialState, // Reset everything
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
      const firstGeneratedChapter = Math.min(
        ...Object.keys(initialChapters).map(Number).filter(num => !isNaN(num)),
        Infinity
      );
      const initialChapterNum = firstGeneratedChapter === Infinity ? 0 : firstGeneratedChapter;


      return {
        ...state, // Keep existing state structure but update values
        status: initialChapterNum > 0 ? "idle" : (simpleIndex.length > 0 ? "generatingChapter" : "idle"), // If chap 1 exists, idle, else try generating
        conversationId: conversation.id,
        originalContent: conversation.original_content,
        userBackground: conversation.user_background,
        chapterIndex: simpleIndex,
        currentChapterNumber: initialChapterNum, // Show first generated chapter
        generatedChapters: initialChapters,
        qaHistory: messages,
        error: null,
      };
    }
    case "LOAD_CONVERSATION_FAIL":
      return {
        ...initialState, // Reset on failure
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

  // Refs for pre-fetching control
  const isPrefetchingRef = useRef(false);
  const prefetchTargetRef = useRef<number | null>(null);
  const isMountedRef = useRef(false); // To prevent effect runs on initial mount before state is ready

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
    isMountedRef.current = true; // Mark as mounted after initial setup
    return () => { isMountedRef.current = false; } // Cleanup on unmount
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
        if (isPrefetch) isPrefetchingRef.current = false; // Stop prefetch if invalid
        return;
      }

      // If already generated, just display it (if user-initiated) or skip (if prefetch)
      if (state.generatedChapters[chapterNumber]) {
        if (!isPrefetch) {
          dispatch({ type: "SET_DISPLAYED_CHAPTER", payload: { chapterNumber } });
        }
        if (isPrefetch) {
          // If prefetched chapter already exists, move to the next one
          const nextPrefetchNum = chapterNumber + 1;
          if (nextPrefetchNum <= state.chapterIndex.length) {
            prefetchTargetRef.current = nextPrefetchNum;
            // Potentially trigger the next prefetch immediately if needed
            // Or rely on the main effect loop
          } else {
            prefetchTargetRef.current = null; // End of chapters
          }
          isPrefetchingRef.current = false; // Mark current prefetch as done (skipped)
        }
        return;
      }

      // Dispatch start only for user-initiated fetches
      if (!isPrefetch) {
        prefetchTargetRef.current = null; // Cancel any pending prefetch target
        isPrefetchingRef.current = false; // Stop any prefetch loop
        dispatch({
          type: "START_CHAPTER_GENERATION",
          payload: { chapterNumber },
        });
      } else {
        isPrefetchingRef.current = true; // Mark prefetch as active
      }

      try {
        // Prepare context only from *already generated* chapters before the target
        const previousChaptersContext: Record<string | number, string> = {};
        Object.keys(state.generatedChapters).forEach((key) => {
          const num = Number.parseInt(key, 10);
          if (!isNaN(num) && num < chapterNumber) { // Strict check: only *before* target
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
            // Send only chapters strictly *before* the target one
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

        // Dispatch appropriate success action
        if (isPrefetch) {
          dispatch({
            type: "PREFETCH_CHAPTER_SUCCESS",
            payload: { chapterNumber, content: data.chapterContent },
          });
          // Set up the next prefetch target
          const nextPrefetchNum = chapterNumber + 1;
          if (nextPrefetchNum <= state.chapterIndex.length) {
            prefetchTargetRef.current = nextPrefetchNum;
          } else {
            prefetchTargetRef.current = null; // Reached the end
          }
          isPrefetchingRef.current = false; // Current prefetch finished

        } else {
          dispatch({
            type: "CHAPTER_GENERATION_SUCCESS",
            payload: { chapterNumber, content: data.chapterContent },
          });
          // After user-initiated success, prefetch logic will restart from the effects
          isPrefetchingRef.current = false; // Ensure prefetch is stopped
          prefetchTargetRef.current = null;
        }

      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unknown error fetching chapter.";
        // Dispatch failure, affecting status
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
        isPrefetchingRef.current = false; // Stop prefetching on error
        prefetchTargetRef.current = null;
      }
    },
    [
      state.originalContent,
      state.chapterIndex.length,
      state.userBackground,
      state.conversationId,
      state.generatedChapters, // Include generatedChapters dependency
      dispatch,
    ],
  );

  // --- Function to start the pre-fetch sequence ---
  const startPrefetchSequence = useCallback(async () => {
    if (!isMountedRef.current || isPrefetchingRef.current || !prefetchTargetRef.current || state.status !== 'idle') {
      return; // Don't start if already prefetching, no target, or not idle
    }

    const target = prefetchTargetRef.current;
    // console.log(`Attempting to prefetch chapter: ${target}`);
    await fetchChapterContent(target, true); // Call fetch with prefetch flag

    // The fetchChapterContent function will handle setting the *next* target
    // and resetting isPrefetchingRef.current = false on completion/error.
    // We then rely on the useEffect below to pick up the new target.

  }, [state.status, fetchChapterContent]); // Depends on status and the fetch function


  // --- Effect to initiate the first chapter fetch OR start pre-fetching ---
  useEffect(() => {
    if (!isMountedRef.current) return;

    // 1. Initial load of Chapter 1 after index success
    if (
      state.status === "generatingChapter" &&
      state.currentChapterNumber === 0 && // Signifies initial state after index
      state.chapterIndex.length > 0 &&
      !state.generatedChapters[1] // Make sure it's not already loaded (e.g. from conversation load)
    ) {
      // console.log("Effect: Triggering initial fetch for Chapter 1");
      fetchChapterContent(1, false); // User-initiated fetch for chapter 1
    }
    // 2. Start or continue pre-fetching when idle and a chapter is loaded
    else if (
      state.status === 'idle' &&
      state.currentChapterNumber > 0 && // A chapter must be loaded
      state.conversationId !== null && // Must be in a conversation
      !isPrefetchingRef.current // Only if not already prefetching
    ) {
      const nextLogicalChapter = state.currentChapterNumber + 1;

      // If prefetch target is not set OR if the current chapter changed and prefetch target is outdated
      if (!prefetchTargetRef.current || prefetchTargetRef.current <= state.currentChapterNumber) {
        if (nextLogicalChapter <= state.chapterIndex.length && !state.generatedChapters[nextLogicalChapter]) {
          prefetchTargetRef.current = nextLogicalChapter;
          //  console.log(`Effect: Setting initial prefetch target to: ${prefetchTargetRef.current}`);
        } else {
          prefetchTargetRef.current = null; // No more chapters or next is already loaded
          //  console.log(`Effect: No valid next chapter to prefetch after ${state.currentChapterNumber}.`);
        }
      }

      // If there's a valid target, start the sequence
      if (prefetchTargetRef.current) {
        // console.log(`Effect: Calling startPrefetchSequence for target: ${prefetchTargetRef.current}`);
        startPrefetchSequence();
      }
    } else if (state.status !== 'idle' && state.status !== 'generatingChapter') {
      // If status changes to something else (loading, answering, error), stop prefetching intent
      // console.log(`Effect: Status changed to ${state.status}, resetting prefetch target.`);
      prefetchTargetRef.current = null;
      isPrefetchingRef.current = false;
    }

  }, [
    state.status,
    state.currentChapterNumber,
    state.chapterIndex.length,
    state.conversationId,
    state.generatedChapters, // Needed to check if chapters exist
    fetchChapterContent,
    startPrefetchSequence
  ]);

  // --- Handler for Content Submission ---
  const handleContentSubmit = useCallback(
    async (text: string, background: string) => {
      if (!background.trim()) {
        toast.error("Please describe your background knowledge.");
        return;
      }
      // Reset prefetch state when submitting new content
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
          fetchConversations(); // Update conversation list
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
    [dispatch, fetchConversations], // Added fetchConversations dependency
  );

  // --- Handler for Loading Existing Conversation ---
  const handleLoadConversation = useCallback(
    async (id: number) => {
      if (state.status !== "idle" && state.status !== "error" && state.status !== "loadingConversation") {
        toast.info("Please wait for the current action to complete.");
        return;
      }
      // Reset prefetch state
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
        // Pre-fetching will be triggered by the useEffect watching status/chapter change
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

  // --- Handler for Asking Questions ---
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

      // Reset prefetch state before asking
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
        // Pre-fetching might restart via effects after status becomes idle
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

  // --- Handler for Deleting Conversation ---
  const handleDeleteConversation = useCallback(
    async (idToDelete: number) => {
      const result = await deleteConversationAction(idToDelete);
      if (result.success) {
        toast.success(result.message);
        setConversationList((prev) => prev.filter((c) => c.id !== idToDelete));
        if (state.conversationId === idToDelete) {
          // Reset prefetch state if the active conversation is deleted
          prefetchTargetRef.current = null;
          isPrefetchingRef.current = false;
          dispatch({ type: "RESET" });
        }
      } else {
        toast.error(result.message);
      }
    },
    [state.conversationId, dispatch], // Added dependencies
  );

  // --- Navigation Handlers ---
  const handleNextChapter = useCallback(() => {
    if (state.currentChapterNumber < state.chapterIndex.length) {
      fetchChapterContent(state.currentChapterNumber + 1, false); // User initiated
    }
  }, [
    state.currentChapterNumber,
    state.chapterIndex.length,
    fetchChapterContent,
  ]);

  const handlePrevChapter = useCallback(() => {
    if (state.currentChapterNumber > 1) {
      fetchChapterContent(state.currentChapterNumber - 1, false); // User initiated
    }
  }, [state.currentChapterNumber, fetchChapterContent]);

  // --- Chapter Selection Handler ---
  const handleChapterSelect = useCallback(
    (chapterNumber: number) => {
      // Reset prefetch when user explicitly selects a chapter
      if (chapterNumber !== state.currentChapterNumber) {
        prefetchTargetRef.current = null;
        isPrefetchingRef.current = false;
        // console.log(`User selected chapter ${chapterNumber}, resetting prefetch.`);
        fetchChapterContent(chapterNumber, false); // User initiated
      }
    },
    [state.currentChapterNumber, fetchChapterContent],
  );

  // --- Handler for New Chat Button ---
  const handleNewChat = useCallback(() => {
    prefetchTargetRef.current = null;
    isPrefetchingRef.current = false;
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  // --- Derived State ---
  const currentChapterTitle =
    state.chapterIndex.find(
      (item) => item.chapter === state.currentChapterNumber,
    )?.title ||
    (state.currentChapterNumber > 0
      ? `Chapter ${state.currentChapterNumber}`
      : state.conversationId !== null ? "Select a chapter" : ""); // Show "Select" only if indexed

  const displayedContent =
    state.generatedChapters[state.currentChapterNumber] || ""; // Get content or empty string

  const isContentSubmitted = state.conversationId !== null;
  const isLoading = state.status !== "idle" && state.status !== "error";
  // Disable navigation specifically during chapter generation or conversation loading
  const isNavigatingDisabled =
    state.status === "generatingChapter" ||
    state.status === "loadingConversation";
  // Disable drawers/delete/new when any major async operation is happening
  const isMajorActionLoading = isLoading && state.status !== 'idle' && state.status !== 'error';

  return (
    <div className="flex h-screen bg-background text-foreground relative">
      {/* Drawers */}
      <IndexDrawer
        index={state.chapterIndex}
        currentChapter={state.currentChapterNumber}
        onChapterSelect={handleChapterSelect}
        isLoading={isNavigatingDisabled} // Disable selection during navigation load
      />
      <ConversationDrawer
        conversations={conversationList}
        onSelectConversation={handleLoadConversation}
        isLoading={isLoadingConversations}
        isDisabled={isMajorActionLoading} // Disable during any major load
        onDeleteConversation={handleDeleteConversation} // Pass delete handler
      />
      {/* New Chat Button */}
      <Button
        variant="outline"
        size="icon"
        className="absolute top-28 left-4 md:top-32 md:left-6 lg:top-36 lg:left-8 z-10" // Position below conversation drawer
        aria-label="Start new chat"
        onClick={handleNewChat}
        disabled={isMajorActionLoading} // Disable during load
      >
        <Plus className="h-5 w-5" />
      </Button>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col p-4 md:p-6 lg:p-8 overflow-y-auto pl-16 md:pl-20 lg:pl-24 relative">
        {/* User Avatar & Logout */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 lg:top-8 lg:right-8 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-9 w-9 md:h-10 md:w-10 cursor-pointer hover:ring-2 hover:ring-ring hover:ring-offset-2 hover:ring-offset-background rounded-full transition-all">
                <AvatarImage
                  src={user?.picture ?? undefined} // Pass undefined if null
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
                    className="w-full justify-start px-2 py-1.5 text-sm font-normal h-auto" // Adjusted styles
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
            isLoading={
              state.status === "generatingChapter" ||
              state.status === "loadingConversation"
            }
            onNext={handleNextChapter}
            onPrev={handlePrevChapter}
            isNavDisabled={isNavigatingDisabled}
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
            Loading conversation...
          </p>
        )}
        {state.status === 'generatingChapter' && !isPrefetchingRef.current && ( // Show only for user-initiated chapter load
          <p className="mt-4 text-muted-foreground italic">
            Loading Chapter {state.currentChapterNumber}...
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
            isLoading={state.status === "answering"}
          />
        </aside>
      )}
    </div>
  );
}
