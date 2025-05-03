"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookOpen, History, Loader2, Plus, Trash2 } from "lucide-react";
import type { ConversationListItem } from "@/app/actions";
import type { ChapterIndexItem } from "@/lib/db/types";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type MouseEvent, useEffect, useState } from "react";

interface SidebarNavProps {
  conversations: ConversationListItem[];
  currentConversationId: number | null;
  chapters: ChapterIndexItem[];
  currentChapter: number;
  onSelectConversation: (id: number) => void;
  onSelectChapter: (chapter: number) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: number) => void;
  isLoading: boolean;
  loadingChapter: number | null;
  isLoadingConversations: boolean;
  currentlyLoadingConversationId: number | null;
}

export function SidebarNav({
  conversations,
  currentConversationId,
  chapters,
  currentChapter,
  onSelectConversation,
  onSelectChapter,
  onNewConversation,
  onDeleteConversation,
  isLoading,
  loadingChapter,
  isLoadingConversations,
  currentlyLoadingConversationId,
}: SidebarNavProps) {
  const [activeTab, setActiveTab] = useState<"chapters" | "history">(
    "chapters",
  );

  const handleDeleteClick = (e: MouseEvent<HTMLButtonElement>, id: number) => {
    e.stopPropagation();
    if (!isLoading && currentlyLoadingConversationId !== id) {
      if (
        window.confirm(
          "Are you sure you want to delete this conversation? This cannot be undone.",
        )
      ) {
        onDeleteConversation(id);
      }
    }
  };

  useEffect(() => {
    setActiveTab(currentConversationId ? "chapters" : "history");
  }, [currentConversationId]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center justify-between border-b">
        <div className="flex items-center space-x-2">
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
          variant="ghost"
          size="icon"
          onClick={onNewConversation}
          disabled={isLoading}
          title="New conversation"
          className="h-8 w-8"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex border-b">
        <Button
          variant="ghost"
          className={cn(
            "flex-1 justify-center rounded-none border-b-2 px-4 py-2 text-sm font-medium h-auto",
            activeTab === "chapters"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setActiveTab("chapters")}
          disabled={!currentConversationId}
        >
          Chapters
        </Button>
        <Button
          variant="ghost"
          className={cn(
            "flex-1 justify-center rounded-none border-b-2 px-4 py-2 text-sm font-medium h-auto",
            activeTab === "history"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setActiveTab("history")}
        >
          History
        </Button>
      </div>

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
                const isDisabled = isChapterLoading || isLoading;

                return (
                  <Button
                    key={chapter.chapter}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start text-left mb-1 h-auto py-2 px-3 group",
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
                const isButtonDisabled = isLoading || isThisLoading;

                return (
                  <div
                    key={conversation.id}
                    className="flex items-center group mb-1"
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
                        <span className="w-full text-sm font-medium whitespace-normal break-words">
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
                        "ml-1 h-7 w-7 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity",
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
