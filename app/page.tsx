"use client";

import * as React from "react"; // Use React namespace import
import { useEffect, useReducer, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation"; // Keep using next/navigation
import { toast } from "sonner"; // Use sonner for toasts

// Layout & Content Components
import { AppShell } from "@/components/layout/app-shell";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ContentSubmissionForm } from "@/components/content/content-submission-form";
import { ChapterDisplay } from "@/components/content/chapter-display";
import { QASidebar } from "@/components/content/qa-sidebar";
import { Skeleton } from "@/components/ui/skeleton"; // For initial loading state

// Actions & Types
import {
  getUserConversations,
  getConversationDetails,
  deleteConversationAction,
  signOutAction, // Import signOutAction for UserNav if needed directly here, or keep in UserNav
  getCurrentSession, // Import to get initial user data
  type ConversationListItem,
  type ConversationDetails,
} from "@/app/actions";
import type { ChapterIndexItem } from "@/lib/db/types";
import type { AskQuestionResponse, QAItem } from "@/app/api/ask-question/route";
import type { GenerateChapterResponse } from "@/app/api/generate-chapter/route";
import type { GenerateIndexApiResponse } from "@/app/api/generate-index/route";
import { Loader2 } from "lucide-react";

// State Management (Reducer - same as before)
type Status =
  | "idle"
  | "indexing"
  | "generatingChapter"
  | "answering"
  | "loadingConversation"
  | "error"
  | "initializing"; // Added initializing state

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
  | { type: "INITIALIZE"; payload: { user: UserData } } // Action to set initial user
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
  status: "initializing", // Start in initializing state
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

// User data type for initial state
interface UserData {
  name: string | null;
  picture: string | null;
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "INITIALIZE": // Handle initialization
      return {
        ...initialState,
        status: "idle", // Move to idle after getting user data
      };
    case "START_INDEXING":
      return {
        ...initialState, // Reset most state on new indexing
        status: "indexing",
        originalContent: action.payload.content,
        userBackground: action.payload.background,
      };
    case "INDEX_SUCCESS":
      // Start generating chapter 1 immediately
      return {
        ...state,
        status: "generatingChapter",
        chapterIndex: action.payload.index,
        conversationId: action.payload.conversationId,
        currentChapterNumber: 0, // Display placeholder initially
        generatingChapterNumber: 1, // Target chapter 1 for generation
        generatedChapters: {}, // Reset generated chapters
        qaHistory: [], // Reset QA history
        error: null,
      };
    case "INDEX_FAIL":
      return {
        ...state,
        status: "error",
        error: action.payload.error,
        originalContent: "", // Clear content on failure
        userBackground: "",
        generatingChapterNumber: null,
      };
    case "START_CHAPTER_GENERATION":
      // Only update if not already generating the *same* chapter
      if (state.generatingChapterNumber === action.payload.chapterNumber) {
        return state;
      }
      return {
        ...state,
        // Keep status as generatingChapter if already generating, otherwise set it
        status: state.status === "generatingChapter" ? state.status : "generatingChapter",
        // Update the target chapter number
        generatingChapterNumber: action.payload.chapterNumber,
        error: null,
      };
    case "CHAPTER_GENERATION_SUCCESS": {
      const isGeneratingChapterTheCurrentTarget = state.generatingChapterNumber === action.payload.chapterNumber;
      return {
        ...state,
        // If this was the chapter we were actively waiting for, go back to idle
        // Otherwise, if prefetching, stay idle (or whatever the status was)
        status: isGeneratingChapterTheCurrentTarget ? "idle" : state.status,
        generatedChapters: {
          ...state.generatedChapters,
          [action.payload.chapterNumber]: action.payload.content,
        },
        // Automatically display the chapter once it's loaded if it was the target
        currentChapterNumber: isGeneratingChapterTheCurrentTarget
          ? action.payload.chapterNumber
          : state.currentChapterNumber,
        // Clear generating number only if it matches the one that just finished
        generatingChapterNumber: isGeneratingChapterTheCurrentTarget
          ? null
          : state.generatingChapterNumber,
        error: null,
      };
    }
    case "PREFETCH_CHAPTER_SUCCESS": {
      // Just add the content, don't change status or current chapter
      return {
        ...state,
        generatedChapters: {
          ...state.generatedChapters,
          [action.payload.chapterNumber]: action.payload.content,
        },
      };
    }
    case "CHAPTER_GENERATION_FAIL":
      // Only set error status if the failed chapter was the one actively being generated
      const wasActivelyGenerating = state.generatingChapterNumber === action.payload.chapterNumber;
      return {
        ...state,
        status: wasActivelyGenerating ? "error" : state.status, // Revert to idle or previous error if prefetch failed
        error: action.payload.error,
        // Clear generating number only if it matches the one that failed
        generatingChapterNumber: wasActivelyGenerating ? null : state.generatingChapterNumber,
      };
    case "SET_DISPLAYED_CHAPTER":
      // Allow changing display even if prefetching, but not if *actively* generating
      if (state.status === 'generatingChapter' && state.generatingChapterNumber === action.payload.chapterNumber) return state;
      if (!state.generatedChapters[action.payload.chapterNumber]) {
        // If chapter not generated yet, trigger generation
        // Need to dispatch START_CHAPTER_GENERATION from the handler instead
        return state; // Let the handler dispatch the generation
      }
      return {
        ...state,
        status: "idle", // Ensure idle when manually selecting generated chapter
        currentChapterNumber: action.payload.chapterNumber,
        // Don't reset generatingChapterNumber if a prefetch might be ongoing
        // generatingChapterNumber: null,
        error: null,
      };
    case "START_ANSWERING":
      // Cancel chapter generation if asking a question
      return {
        ...state,
        status: "answering",
        qaHistory: [
          ...state.qaHistory,
          { question: action.payload.question, answer: "" },
        ],
        generatingChapterNumber: null, // Cancel generation
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
        ...initialState, // Reset most state
        status: "loadingConversation",
        conversationId: action.payload.conversationId, // Keep track of loading ID
      };
    case "LOAD_CONVERSATION_SUCCESS": {
      const { conversation, index, messages } = action.payload;
      const simpleIndex = index.map((item) => ({
        chapter: item.chapter,
        title: item.title,
      }));
      const initialChapters = index.reduce(
        (acc, item) => {
          // Ensure generated_content is not null/undefined before adding
          if (item.generated_content) {
            acc[item.chapter] = item.generated_content;
          }
          return acc;
        },
        {} as Record<number, string>,
      );
      const chapterNumbers = Object.keys(initialChapters).map(Number).filter(num => !isNaN(num));
      const firstGeneratedChapter = chapterNumbers.length > 0 ? Math.min(...chapterNumbers) : Infinity;

      const initialChapterNum = firstGeneratedChapter === Infinity ? 0 : firstGeneratedChapter;
      // Determine if we need to generate the *first* chapter of the index
      const needsFirstChapterGeneration = simpleIndex.length > 0 && !initialChapters[1];

      return {
        ...initialState, // Reset state but keep user
        status: needsFirstChapterGeneration ? "generatingChapter" : "idle",
        conversationId: conversation.id,
        originalContent: conversation.original_content,
        userBackground: conversation.user_background,
        chapterIndex: simpleIndex,
        currentChapterNumber: initialChapterNum, // Display first generated or 0
        // Set generatingChapterNumber only if we need to fetch chapter 1
        generatingChapterNumber: needsFirstChapterGeneration ? 1 : null,
        generatedChapters: initialChapters,
        qaHistory: messages,
        error: null,
      };
    }
    case "LOAD_CONVERSATION_FAIL":
      return {
        ...initialState, // Reset state but keep user
        status: "error",
        error: action.payload.error,
      };
    case "RESET":
      return { ...initialState, status: "idle" }; // Go to idle on reset
    default:
      return state;
  }
}

export default function HomePage() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const [conversationList, setConversationList] = useState<ConversationListItem[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const router = useRouter(); // Keep using next router
  const isPrefetchingRef = useRef(false);
  const prefetchTargetRef = useRef<number | null>(null);

  // Fetch initial user data and conversations
  useEffect(() => {
    const initialize = async () => {
      try {
        const sessionResult = await getCurrentSession();
        if (!sessionResult.session || !sessionResult.user) {
          router.push("/login"); // Redirect if not logged in
          return;
        }
        setUserData({
          name: sessionResult.user.name,
          picture: sessionResult.user.picture,
        });
        dispatch({ type: "INITIALIZE", payload: { user: sessionResult.user } }); // Initialize state
        await fetchConversations(); // Fetch conversations after ensuring user is logged in
      } catch (error) {
        console.error("Initialization error:", error);
        toast.error("Failed to initialize application.");
        dispatch({ type: "RESET" }); // Reset to idle on error
      }
    };
    initialize();
  }, [router]); // Add router to dependency array

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
  }, []); // Empty dependency array is fine here

  // --- Content Submission Handler ---
  const handleContentSubmit = useCallback(async (text: string, background: string) => {
    if (!background.trim()) {
      toast.error("Please describe your background knowledge.");
      return;
    }
    prefetchTargetRef.current = null; // Reset prefetch on new submission
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
        await fetchConversations(); // Refresh conversation list
        toast.success("Index generated. Loading first chapter...");
        // Effect hook will handle fetching chapter 1 based on state change
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
  }, [dispatch, fetchConversations]); // Add fetchConversations

  // --- Chapter Content Fetching Logic ---
  const fetchChapterContent = useCallback(async (chapterNumber: number, isPrefetch: boolean = false) => {
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

    // If already generated: display if user-initiated, or skip if prefetch
    if (state.generatedChapters[chapterNumber]) {
      if (!isPrefetch && state.status !== 'generatingChapter') {
        dispatch({ type: "SET_DISPLAYED_CHAPTER", payload: { chapterNumber } });
      }
      if (isPrefetch) {
        prefetchTargetRef.current = chapterNumber + 1; // Target next one
        isPrefetchingRef.current = false; // Done with this one
      }
      return;
    }

    // Prevent starting a new *user-initiated* fetch if already generating another chapter
    if (!isPrefetch && state.status === 'generatingChapter' && state.generatingChapterNumber !== chapterNumber) {
      toast.info(`Please wait for Chapter ${state.generatingChapterNumber} to load.`);
      return;
    }

    // Prevent starting a *prefetch* if a user-initiated fetch is active
    if (isPrefetch && state.status === 'generatingChapter') {
      isPrefetchingRef.current = false; // Cancel prefetch attempt
      prefetchTargetRef.current = null;
      return;
    }


    if (!isPrefetch) {
      prefetchTargetRef.current = null; // Cancel prefetch if user initiates
      isPrefetchingRef.current = false;
      dispatch({ type: "START_CHAPTER_GENERATION", payload: { chapterNumber } });
    } else {
      isPrefetchingRef.current = true; // Mark as prefetching
    }

    try {
      // Prepare context of previous chapters (summary might be better for long content)
      const previousChaptersContext: Record<string | number, string> = {};
      Object.keys(state.generatedChapters).forEach((key) => {
        const num = Number.parseInt(key, 10);
        if (!isNaN(num) && num < chapterNumber) {
          // Simple truncation for context
          const content = state.generatedChapters[num];
          previousChaptersContext[num] = content.length > 500 ? content.substring(0, 500) + "..." : content;
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
          generatedChapters: previousChaptersContext, // Send summarized context
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as GenerateChapterResponse;

      if (isPrefetch) {
        dispatch({ type: "PREFETCH_CHAPTER_SUCCESS", payload: { chapterNumber, content: data.chapterContent } });
        prefetchTargetRef.current = chapterNumber + 1; // Target next
        isPrefetchingRef.current = false; // Done prefetching this one
      } else {
        dispatch({ type: "CHAPTER_GENERATION_SUCCESS", payload: { chapterNumber, content: data.chapterContent } });
        isPrefetchingRef.current = false; // Ensure prefetch flag is off
        prefetchTargetRef.current = chapterNumber + 1; // Set target for next prefetch
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error.";
      dispatch({
        type: "CHAPTER_GENERATION_FAIL",
        payload: { chapterNumber, error: `Failed to load chapter ${chapterNumber}: ${message}` },
      });
      if (!isPrefetch) {
        toast.error(`Failed to load chapter ${chapterNumber}: ${message}`);
      } else {
        console.warn(`Prefetch failed for chapter ${chapterNumber}: ${message}`);
      }
      isPrefetchingRef.current = false; // Reset prefetch flag on error
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
    ]
  );

  // --- Prefetching Logic ---
  const startPrefetchSequence = useCallback(async () => {
    if (isPrefetchingRef.current || !prefetchTargetRef.current || state.status !== 'idle') {
      return;
    }
    const target = prefetchTargetRef.current;
    if (target > state.chapterIndex.length) {
      prefetchTargetRef.current = null; // Stop if past the end
      return;
    }
    await fetchChapterContent(target, true);
  }, [state.status, state.chapterIndex.length, fetchChapterContent]);


  // Effect to trigger initial chapter fetch and subsequent pre-fetching
  useEffect(() => {
    // 1. Fetch Chapter 1 after index success if needed
    if (state.status === "generatingChapter" && state.generatingChapterNumber === 1 && !state.generatedChapters[1]) {
      fetchChapterContent(1, false);
    }
    // 2. Start or continue pre-fetching when idle and not already prefetching
    else if (state.status === 'idle' && state.conversationId !== null && !isPrefetchingRef.current) {
      // Determine the next logical chapter to prefetch
      const nextLogicalChapter = (state.currentChapterNumber || 0) + 1;

      // Update target if it's not set, outdated, or already loaded
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
        prefetchTargetRef.current = foundTarget; // Set to first unloaded or null
      }

      // If we have a valid target, start the sequence
      if (prefetchTargetRef.current && prefetchTargetRef.current <= state.chapterIndex.length) {
        startPrefetchSequence();
      }
    }
    // 3. Cancel prefetch if state becomes busy
    else if (state.status !== 'idle' && state.status !== 'generatingChapter') {
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
    startPrefetchSequence
  ]);


  // --- Other Handlers (Load Conversation, Ask Question, Delete, New) ---
  // (These remain largely the same as in your ChatContainer, just ensure they use the `dispatch` from this component's scope)


  const handleLoadConversation = useCallback(async (id: number) => {
    if (state.status === "loadingConversation" && state.conversationId === id) return;
    if (state.status !== 'idle' && state.status !== 'error') {
      toast.info("Please wait for the current action to complete.");
      return;
    }

    prefetchTargetRef.current = null; // Reset prefetch
    isPrefetchingRef.current = false;

    dispatch({ type: "LOAD_CONVERSATION_START", payload: { conversationId: id } });
    toast.info("Loading conversation...");

    try {
      const result = await getConversationDetails(id);

      // --- CORRECTED PART ---
      if (result.success) {
        // Check if details exist (should always be true if success is true based on action return type)
        if (result.details) {
          dispatch({ type: "LOAD_CONVERSATION_SUCCESS", payload: result.details });
          toast.success("Conversation loaded successfully");
          // Effect hook will trigger chapter 1 fetch if needed by the state change
        } else {
          // This case should theoretically not happen if the action type is correct
          throw new Error("Conversation loaded successfully but details are missing.");
        }
      } else {
        // Only access result.error when success is false
        const errorMessage = result.error || "Failed to load conversation details.";
        dispatch({ type: "LOAD_CONVERSATION_FAIL", payload: { error: errorMessage } });
        toast.error(errorMessage);
      }
      // --- END OF CORRECTION ---

    } catch (error) {
      // Catch errors from the `await getConversationDetails` call itself or the new Error thrown above
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      dispatch({ type: "LOAD_CONVERSATION_FAIL", payload: { error: `Failed to load conversation: ${message}` } });
      toast.error(`Failed to load conversation: ${message}`);
      console.error("Load conversation error:", error); // Log the error for debugging
    }
  }, [state.status, state.conversationId, dispatch]); // Keep dependencies



  const handleAskQuestion = useCallback(async (question: string) => {
    if (!state.conversationId || !state.originalContent || !state.userBackground) {
      toast.warning("Cannot ask question without an active conversation.");
      return;
    }
    if (state.status === "generatingChapter") {
      toast.info(`Please wait for Chapter ${state.generatingChapterNumber} to load.`);
      return;
    }
    if (state.status === "answering") {
      toast.info("Please wait for the current answer.");
      return;
    }


    prefetchTargetRef.current = null; // Stop prefetch when asking
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
          qaHistory: state.qaHistory, // Send current history *before* adding the new question locally
          userQuestion: question,
          userBackground: state.userBackground,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as AskQuestionResponse;
      dispatch({ type: "ANSWERING_SUCCESS", payload: { answer: data.answer } });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error.";
      dispatch({ type: "ANSWERING_FAIL", payload: { error: `Failed to get answer: ${message}` } });
      toast.error(`Failed to get answer: ${message}`);
    }
  }, [
    state.conversationId,
    state.originalContent,
    state.userBackground,
    state.generatedChapters,
    state.qaHistory,
    state.status,
    state.generatingChapterNumber,
    dispatch,
  ]);

  const handleDeleteConversation = useCallback(async (idToDelete: number) => {
    if (state.status === 'loadingConversation' && state.conversationId === idToDelete) {
      toast.warning("Cannot delete conversation while it's loading.");
      return;
    }
    if (state.status !== 'idle' && state.status !== 'error') {
      toast.info("Please wait for the current action to complete before deleting.");
      return;
    }

    // Add confirmation dialog here if desired

    try {
      const result = await deleteConversationAction(idToDelete);
      if (result.success) {
        toast.success(result.message);
        // Optimistically update UI or refetch
        setConversationList((prev) => prev.filter((c) => c.id !== idToDelete));
        if (state.conversationId === idToDelete) {
          prefetchTargetRef.current = null;
          isPrefetchingRef.current = false;
          dispatch({ type: "RESET" }); // Reset if deleting the active one
        }
      } else {
        toast.error(result.message || "Failed to delete conversation");
      }
    } catch (error) {
      toast.error("An error occurred while deleting the conversation");
      console.error("Delete conversation error:", error);
    }
  }, [state.conversationId, state.status, dispatch]);

  const handleNewConversation = useCallback(() => {
    if (state.status !== 'idle' && state.status !== 'error') {
      toast.warning("Please wait for the current action to finish.");
      return;
    }
    prefetchTargetRef.current = null;
    isPrefetchingRef.current = false;
    dispatch({ type: 'RESET' });
  }, [dispatch, state.status]);

  // --- Chapter Selection and Navigation ---
  const handleChapterSelect = useCallback((chapterNumber: number) => {
    // Check if the chapter content is already available
    if (state.generatedChapters[chapterNumber]) {
      dispatch({ type: "SET_DISPLAYED_CHAPTER", payload: { chapterNumber } });
    } else {
      // If not available, trigger fetch (user-initiated)
      fetchChapterContent(chapterNumber, false);
    }
  }, [state.generatedChapters, fetchChapterContent, dispatch]);

  const handleNextChapter = useCallback(() => {
    const nextChapter = (state.currentChapterNumber || 0) + 1;
    if (nextChapter <= state.chapterIndex.length) {
      handleChapterSelect(nextChapter); // Use handleChapterSelect to fetch if needed
    }
  }, [state.currentChapterNumber, state.chapterIndex.length, handleChapterSelect]);

  const handlePrevChapter = useCallback(() => {
    const prevChapter = (state.currentChapterNumber || 0) - 1;
    if (prevChapter >= 1) {
      handleChapterSelect(prevChapter); // Use handleChapterSelect to fetch if needed
    }
  }, [state.currentChapterNumber, handleChapterSelect]);

  // --- Derived State ---
  const currentChapterTitle =
    state.chapterIndex.find((item) => item.chapter === state.currentChapterNumber)?.title || "";

  const displayedContent = state.generatedChapters[state.currentChapterNumber] || "";
  const isContentSubmitted = state.conversationId !== null;
  // Is the *currently viewed* chapter loading?
  const isCurrentChapterLoading = state.status === "generatingChapter" && state.generatingChapterNumber === state.currentChapterNumber;
  // Is *any* chapter loading (for disabling nav)? Includes active generation or loading conversation state
  const isNavigatingDisabled = state.status === "generatingChapter" || state.status === "loadingConversation";
  // Is the whole app busy with a major action?
  const isGloballyDisabled = state.status === 'indexing' || state.status === 'loadingConversation' || state.status === 'answering' || state.status === 'initializing';

  // Render loading skeleton if user data hasn't loaded yet
  if (state.status === 'initializing' || !userData) {
    // You can replace this with a more sophisticated loading screen
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AppShell
      user={userData} // Pass fetched user data
      sidebar={
        <SidebarNav
          conversations={conversationList}
          currentConversationId={state.conversationId}
          chapters={state.chapterIndex}
          currentChapter={state.currentChapterNumber}
          onSelectConversation={handleLoadConversation}
          onSelectChapter={handleChapterSelect} // Use the combined handler
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation} // Pass delete handler
          isLoading={isGloballyDisabled || state.status === 'generatingChapter'} // Sidebar items disabled if globally busy or any chapter loading
          loadingChapter={state.generatingChapterNumber}
          isLoadingConversations={isLoadingConversations}
          currentlyLoadingConversationId={state.status === 'loadingConversation' ? state.conversationId : null}
        />
      }
      rightSidebar={
        // Only show Q&A sidebar if content has been submitted
        isContentSubmitted ? (
          <QASidebar
            history={state.qaHistory}
            onAskQuestion={handleAskQuestion}
            isLoading={state.status === "answering"} // Q&A sidebar loading state is specific to answering
          />
        ) : null
      }
      showRightSidebar={isContentSubmitted} // Control visibility
    >
      {/* Main Content Area */}
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
            isLoading={isCurrentChapterLoading} // Loading state for *this specific* chapter
            onNext={handleNextChapter}
            onPrev={handlePrevChapter}
            isNavDisabled={isNavigatingDisabled} // Disable nav if *any* chapter loading or convo loading
          />
        )}

        {/* Global error display at the bottom */}
        {state.status === "error" && state.error && (
          <div className="mt-4 p-3 border border-destructive/50 bg-destructive/10 rounded-md text-destructive text-sm">
            <p>
              <span className="font-medium">Error:</span> {state.error}
            </p>
          </div>
        )}
        {/* Optional: Show a subtle loading indicator when prefetching */}
        {isPrefetchingRef.current && (
          <div className="fixed bottom-4 right-4 text-xs text-muted-foreground animate-pulse">
            Loading next chapter...
          </div>
        )}
      </div>
    </AppShell>
  );
}
