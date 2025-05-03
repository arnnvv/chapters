"use client";

import * as React from "react"; // Import React
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookOpen, History, Loader2, Plus, Trash2 } from "lucide-react"; // Added History, Loader2, Trash2
// Use types from actions.ts directly
import type { ConversationListItem } from "@/app/actions";
import type { ChapterIndexItem } from "@/lib/db/types";
import { formatDistanceToNow } from "date-fns"; // Import date-fns if not already
import { ScrollArea } from "@radix-ui/react-scroll-area";

interface SidebarNavProps {
  conversations: ConversationListItem[];
  currentConversationId: number | null;
  chapters: ChapterIndexItem[];
  currentChapter: number;
  onSelectConversation: (id: number) => void;
  onSelectChapter: (chapter: number) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: number) => void; // Added delete handler prop
  isLoading: boolean; // Global loading state
  loadingChapter: number | null;
  isLoadingConversations: boolean; // Loading state for the list itself
  currentlyLoadingConversationId: number | null; // Specific conversation loading
}

export function SidebarNav({
  conversations,
  currentConversationId,
  chapters,
  currentChapter,
  onSelectConversation,
  onSelectChapter,
  onNewConversation,
  onDeleteConversation, // Destructure delete handler
  isLoading, // Global busy state
  loadingChapter,
  isLoadingConversations, // Conversation list loading
  currentlyLoadingConversationId, // Specific conversation loading
}: SidebarNavProps) {
  const [activeTab, setActiveTab] = React.useState<"chapters" | "history">(
    "chapters",
  );

  const handleDeleteClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    id: number,
  ) => {
    e.stopPropagation(); // Prevent triggering conversation selection
    if (!isLoading && currentlyLoadingConversationId !== id) {
      // Simple confirmation for now
      if (
        window.confirm(
          "Are you sure you want to delete this conversation? This cannot be undone.",
        )
      ) {
        onDeleteConversation(id);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b">
        <div className="flex items-center space-x-2">
          {/* Icon changes based on active tab */}
          {activeTab === "chapters" ? (
            <BookOpen className="h-5 w-5" />
          ) : (
            <History className="h-5 w-5" />
          )}
          <h2 className="text-lg font-semibold">
            {activeTab === "chapters" ? "Chapters" : "History"}
          </h2>
        </div>
        <Button
          variant="ghost" // Changed to ghost to match target screenshot better
          size="icon"
          onClick={onNewConversation}
          disabled={isLoading} // Disable if globally busy
          title="New conversation"
          className="h-8 w-8" // Smaller icon button
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <Button
          variant="ghost"
          className={cn(
            "flex-1 justify-center rounded-none border-b-2 px-4 py-2 text-sm font-medium h-auto", // Adjusted styling
            activeTab === "chapters"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setActiveTab("chapters")}
          disabled={!currentConversationId} // Disable chapters tab if no conversation selected
        >
          Chapters
        </Button>
        <Button
          variant="ghost"
          className={cn(
            "flex-1 justify-center rounded-none border-b-2 px-4 py-2 text-sm font-medium h-auto", // Adjusted styling
            activeTab === "history"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setActiveTab("history")}
        >
          History
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === "chapters" ? (
          <div className="p-2">
            {!currentConversationId ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Submit or select a document first.
              </div>
            ) : chapters.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No chapters generated for this document.
              </div>
            ) : (
              chapters.map((chapter) => {
                const isActive = chapter.chapter === currentChapter;
                const isChapterLoading = chapter.chapter === loadingChapter;
                const isDisabled = isChapterLoading || isLoading; // Disable if this specific chapter or globally busy

                return (
                  <Button
                    key={chapter.chapter}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start text-left mb-1 h-auto py-2 px-3 group", // Added group class
                      isDisabled && "opacity-70 cursor-not-allowed",
                    )}
                    onClick={() =>
                      !isDisabled && onSelectChapter(chapter.chapter)
                    }
                    disabled={isDisabled}
                  >
                    <div className="flex items-center w-full min-w-0">
                      <span className="font-mono text-xs w-6 text-muted-foreground mr-2 shrink-0">
                        {chapter.chapter}.
                      </span>
                      <span className="flex-1 truncate whitespace-normal break-words">
                        {chapter.title}
                      </span>
                      {isChapterLoading && (
                        <Loader2 className="h-4 w-4 animate-spin ml-2 shrink-0" />
                      )}
                    </div>
                  </Button>
                );
              })
            )}
          </div>
        ) : (
          /* History Tab */
          <div className="p-2">
            {isLoadingConversations ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading history...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No conversation history yet.
              </div>
            ) : (
              conversations.map((conversation) => {
                const isCurrent = conversation.id === currentConversationId;
                const isThisLoading =
                  currentlyLoadingConversationId === conversation.id;
                const isButtonDisabled = isLoading || isThisLoading; // Disable if globally busy OR this specific one is loading

                return (
                  <div
                    key={conversation.id}
                    className="flex items-center group mb-1" // Added group class for hover effect on delete
                  >
                    <Button
                      variant={isCurrent ? "secondary" : "ghost"}
                      className={cn(
                        "flex-1 justify-start text-left h-auto py-2 px-3",
                        isButtonDisabled && "opacity-70 cursor-not-allowed",
                      )}
                      onClick={() =>
                        !isButtonDisabled &&
                        onSelectConversation(conversation.id)
                      }
                      disabled={isButtonDisabled}
                    >
                      <div className="flex flex-col items-start w-full min-w-0">
                        <span className="truncate w-full text-sm font-medium">
                          {conversation.preview || "Untitled Conversation"}
                        </span>
                        <span className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(
                            new Date(conversation.created_at),
                            {
                              addSuffix: true,
                            },
                          )}
                        </span>
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "ml-1 h-7 w-7 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity", // Show on hover
                        isButtonDisabled
                          ? "cursor-not-allowed !opacity-30"
                          : "hover:text-destructive hover:bg-destructive/10",
                      )}
                      onClick={(e) => handleDeleteClick(e, conversation.id)}
                      disabled={isButtonDisabled}
                      aria-label="Delete conversation"
                    >
                      {isThisLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
