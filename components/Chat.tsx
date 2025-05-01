"use client";

import { useEffect, useState, useCallback } from "react";
import type { JSX } from "react";
import { toast } from "sonner";
import { getUserConversations, getConversationDetails, type ConversationListItem } from "@/app/actions";
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
import { ChapterIndexItem } from "@/lib/db/types";
import { AskQuestionResponse, QAItem } from "@/app/api/ask-question/route";
import { GenerateChapterResponse } from "@/app/api/generate-chapter/route";
import { GenerateIndexApiResponse } from "@/app/api/generate-index/route";
import { ConversationDrawer } from "./analyzer/ConversationDrawer";

export function Chat({
  user,
}: {
  user: {
    name: string | null;
    picture: string | null;
  };
}): JSX.Element {
  // --- Existing State ---
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

  // --- New State for Conversation History ---
  const [conversationList, setConversationList] = useState<ConversationListItem[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(true); // Start true
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false); // For loading specific convo


  // --- Fetch Conversation List on Mount ---
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
  }, []); // Empty dependency array ensures this runs once on mount

  // --- Handlers (fetchChapterContent remains the same) ---
   const fetchChapterContent = useCallback(
    async (chapterNumber: number, chapIndex?: ChapterIndexItem[]) => { // Accept optional index
      const idx = chapIndex || chapterIndex; // Use passed index if available

      if (
        !originalContent ||
        idx.length === 0 || // Use idx here
        chapterNumber < 1 ||
        !userBackground ||
        !conversationId
      ) {
         return;
      }


      // Check generatedChapters first to avoid unnecessary fetches
       if (generatedChapters[chapterNumber]) {
        setDisplayedChapterContent(generatedChapters[chapterNumber]);
        if (currentChapter !== chapterNumber) setCurrentChapter(chapterNumber);
         return; // Already generated
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
             fullContent: originalContent, // Context might still be needed by prompt
             userBackground: userBackground, // Context might still be needed by prompt
             generatedChapters: previousChaptersContext, // Essential context
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
       // Remove chapterIndex from deps, use passed arg or state inside
       generatedChapters,
       userBackground,
       currentChapter,
       conversationId,
     ],
   );

  // --- Handler for Starting New Content Submission ---
  const handleContentSubmit = async (text: string, background: string) => {
    // ... (logic is the same as before, ensures reset)
    if (!background.trim()) {
      toast.error("Please describe your background knowledge.");
      return;
    }
    setIsIndexing(true);
    setError(null);
    setOriginalContent(text); // Set new content
    setUserBackground(background); // Set new background
    setIsContentSubmitted(true); // Mark as submitted
    // Reset all states related to the *previous* conversation/index
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
        setChapterIndex(data.index);
        setConversationId(data.conversationId);
        // Fetch the new conversation list after creating one
        const newListResult = await getUserConversations();
         if(newListResult.success) setConversationList(newListResult.conversations);

        await fetchChapterContent(1, data.index); // Pass index directly
      } else {
        setError("Could not generate index or conversation record.");
        toast.error("Could not generate chapter index.");
        setIsContentSubmitted(false); // Reset if failed
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error.";
      setError(`Failed to generate index: ${message}`);
      toast.error(`Failed to generate index: ${message}`);
      setIsContentSubmitted(false); // Reset if failed
    } finally {
      setIsIndexing(false);
    }
  };

  // --- Handler for Loading an Existing Conversation ---
  const handleLoadConversation = async (id: number) => {
    if (isLoadingDetails || isIndexing || isGeneratingChapter || isAnswering) {
      toast.info("Please wait for the current action to complete.");
      return;
    }
    setIsLoadingDetails(true);
    toast.info("Loading conversation...");
    setDisplayedChapterContent(""); // Clear display while loading
    setError(null);

    const result = await getConversationDetails(id);

    if (result.success) {
      const { conversation, index, messages } = result.details;

      setConversationId(conversation.id);
      setOriginalContent(conversation.original_content);
      setUserBackground(conversation.user_background);
      setChapterIndex(index);
      setQaHistory(messages); // Load past messages

      // Reset states specific to chapter generation/display for the *newly loaded* conversation
      setGeneratedChapters({});
      setCurrentChapter(0); // Will be set by fetchChapterContent
      setDisplayedChapterContent("");
      setIsContentSubmitted(true); // Mark as active conversation

      if (index.length > 0) {
         await fetchChapterContent(1, index); // Fetch first chapter of the loaded convo, pass index
      } else {
        // Handle case where loaded convo somehow has no index (though API should prevent this)
         setDisplayedChapterContent("No chapters found for this conversation.");
         setCurrentChapter(0);
      }

       toast.success("Conversation loaded.");

    } else {
      setError(`Failed to load conversation: ${result.error}`);
      toast.error(`Failed to load conversation: ${result.error}`);
       // Optionally reset some state if loading fails, or leave as is
      // setIsContentSubmitted(false);
    }
    setIsLoadingDetails(false);
  };

   // --- Handler for Asking Questions (remains mostly the same, ensure uses current conversationId) ---
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

     setQaHistory((prev) => [...prev, { question, answer: "" }]); // Optimistic UI

     try {
      const response = await fetch("/api/ask-question", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversationId,
          fullContent: originalContent, // Needed by prompt
           // API should fetch index based on conversationId now
           generatedChapters: generatedChapters, // Needed by prompt
          qaHistory: qaHistory, // Send history *before* optimistic update
          userQuestion: question,
           userBackground: userBackground, // Needed by prompt
         }),
       });


       if (!response.ok) {
        const errorData = await response.json();
         // Revert optimistic update on error
         setQaHistory((prev) => prev.slice(0, -1));
         throw new Error(
           errorData.error || `HTTP error! status: ${response.status}`,
         );
      }

       const data = (await response.json()) as AskQuestionResponse;

       // Update the optimistic entry with the real answer
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
      // Note: Question remains in history without an answer on error after optimistic update
    } finally {
       setIsAnswering(false);
     }
   };


  // Navigation handlers remain the same
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


  // Display calculations remain the same
   const currentChapterTitle =
     chapterIndex.find((item) => item.chapter === currentChapter)?.title ||
     (currentChapter > 0 ? `Chapter ${currentChapter}` : "Select a chapter"); // Updated default text

   const isAnythingLoading = isIndexing || isGeneratingChapter || isAnswering || isLoadingDetails; // Include detail loading
  const isOverallDisabled = isAnythingLoading || isLoadingConversations; // Disable drawer selections too


  // --- Render ---
  return (
    <div className="flex h-screen bg-background text-foreground relative">
      {/* Index Drawer */}
      <IndexDrawer
        index={chapterIndex}
        currentChapter={currentChapter}
        onChapterSelect={handleChapterSelect}
        isLoading={isAnythingLoading} // Disable selection while main actions are busy
      />
      {/* Conversation Drawer */}
       <ConversationDrawer
        conversations={conversationList}
        onSelectConversation={handleLoadConversation}
        isLoading={isLoadingConversations}
        isDisabled={isAnythingLoading} // Disable selection during main loads
      />


      {/* Main Content Area */}
       <div className="flex-grow flex flex-col p-4 md:p-6 lg:p-8 overflow-y-auto pl-16 md:pl-20 lg:pl-24 relative"> {/* Ensure parent allows scrolling */}
        {/* Avatar Dropdown */}
         <div className="absolute top-4 right-4 md:top-6 md:right-6 lg:top-8 lg:right-8 z-20">
          {/* ... DropdownMenu JSX ... */}
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


         {/* Title */}
         <h1 className="text-3xl font-bold mb-6 border-b pb-2 border-border pr-16"> {/* Padding for avatar */}
           Document Teaching Assistant
         </h1>


        {/* Input Area (Shows initially OR when no specific conversation is loaded?) */}
         {/* Let's adjust logic slightly: Show input if no content IS submitted YET */}
        {!isContentSubmitted && (
          <ContentInput onSubmit={handleContentSubmit} isLoading={isIndexing || isLoadingDetails} />
        )}


         {/* Display Area (Shows when content HAS been submitted/loaded) */}
         {isContentSubmitted && chapterIndex.length > 0 && (
           <>
            <ChapterDisplay
              title={currentChapterTitle}
               content={displayedChapterContent}
               isLoading={isGeneratingChapter || isLoadingDetails} // Show loading when details are loading too
             />
             {chapterIndex.length > 0 && (
               <Navigation
                 currentChapter={currentChapter}
                totalChapters={chapterIndex.length}
                onNext={handleNext}
                onPrev={handlePrev}
                 isLoading={isGeneratingChapter || isLoadingDetails} // Also disable nav on detail load
              />
             )}
           </>
         )}

         {/* Loading Indicators */}
         {(isIndexing || isLoadingDetails) && ( // Show loading for indexing or detail loading
           <p className="mt-4 text-muted-foreground italic">Loading...</p>
        )}


         {/* Error Display */}
         {error && !(isGeneratingChapter || isIndexing || isLoadingDetails) && (
          <p className="text-destructive mt-4">Error: {error}</p>
         )}
      </div>


      {/* QA Sidebar (Show only when content is submitted/loaded) */}
       {isContentSubmitted && (
        <aside className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0 h-screen flex flex-col"> {/* Flex container */}
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
