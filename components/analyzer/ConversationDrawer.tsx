"use client";

import type { ConversationListItem } from "@/app/actions";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { History, Loader2, Trash2 } from "lucide-react"; // Import Loader2 for spinner
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { MouseEvent } from "react";

export function ConversationDrawer({
  conversations,
  onSelectConversation,
  isLoading,
  isDisabled, // Represents global disabling states like indexing/initial load
  currentlyLoadingConversationId, // New prop: ID of the convo being loaded
  onDeleteConversation,
}: {
  conversations: ConversationListItem[];
  onSelectConversation: (conversationId: number) => void;
  isLoading: boolean; // General loading indicator for the list itself
  isDisabled: boolean; // Disables interaction during major operations
  currentlyLoadingConversationId: number | null; // ID of the specific conversation being loaded
  onDeleteConversation: (conversationId: number) => void;
}) {
  const handleSelect = (id: number) => {
    // Prevent selecting if globally disabled or if this specific one is loading
    if (!isDisabled && currentlyLoadingConversationId !== id) {
      onSelectConversation(id);
    }
  };

  const handleDeleteClick = (
    e: MouseEvent<HTMLButtonElement>,
    id: number,
  ) => {
    e.stopPropagation();
    // Prevent deleting if globally disabled or if this specific one is loading
    if (!isDisabled && currentlyLoadingConversationId !== id) {
      if (window.confirm("Are you sure you want to delete this conversation? This cannot be undone.")) {
        onDeleteConversation(id);
      }
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="absolute top-16 left-4 md:top-20 md:left-6 lg:top-24 lg:left-8 z-10"
          aria-label="Open conversation history"
          disabled={isDisabled} // Disable trigger if globally disabled
        >
          <History className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[300px] sm:w-[350px] p-0 flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> My Conversations
          </SheetTitle>
        </SheetHeader>
        <div className="flex-grow overflow-y-auto py-2">
          {isLoading ? ( // Show general loading state for the list
            <div className="p-6 text-center text-muted-foreground">
              Loading history...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground italic">
              No conversations yet.
            </div>
          ) : (
            conversations.map((convo) => {
              const isThisOneLoading = currentlyLoadingConversationId === convo.id;
              const isButtonDisabled = isDisabled || isThisOneLoading;

              return (
                <div key={convo.id} className="flex items-center pr-2 group">
                  {/* Wrap button in SheetClose conditionally only if not loading */}
                  {isThisOneLoading ? (
                    <Button // Render as plain button if loading this one
                      variant="ghost"
                      className={cn(
                        "flex-grow justify-start rounded-none pl-6 pr-3 py-3 text-left h-auto flex flex-col items-start min-w-0",
                        "opacity-50 cursor-not-allowed", // Style as disabled
                      )}
                      disabled={true}
                      aria-label={`Loading conversation from ${formatDistanceToNow(new Date(convo.created_at), { addSuffix: true })}`}
                    >
                      <span
                        className="text-sm font-medium mb-1 w-full whitespace-normal break-words"
                        title={convo.preview}
                      >
                        {convo.preview || "Untitled Conversation"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(convo.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </Button>
                  ) : (
                    <SheetClose asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "flex-grow justify-start rounded-none pl-6 pr-3 py-3 text-left h-auto flex flex-col items-start min-w-0", // Ensure min-width is 0 for flex wrapping
                          isButtonDisabled // Check general disable flag too
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-accent hover:text-accent-foreground",
                        )}
                        onClick={() => handleSelect(convo.id)}
                        disabled={isButtonDisabled} // Use combined disable flag
                        aria-label={`Select conversation from ${formatDistanceToNow(new Date(convo.created_at), { addSuffix: true })}`}
                      >
                        {/* Title - Allow wrapping */}
                        <span
                          className="text-sm font-medium mb-1 w-full whitespace-normal break-words"
                          title={convo.preview}
                        >
                          {convo.preview || "Untitled Conversation"}
                        </span>
                        {/* Date */}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(convo.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </Button>
                    </SheetClose>
                  )}
                  {/* Delete Button - show spinner if loading this item */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "ml-auto h-8 w-8 shrink-0 text-muted-foreground opacity-70 hover:opacity-100 transition-opacity",
                      isButtonDisabled ? "cursor-not-allowed !opacity-30" : "hover:text-destructive hover:bg-destructive/10"
                    )}
                    onClick={(e) => handleDeleteClick(e, convo.id)}
                    disabled={isButtonDisabled}
                    aria-label="Delete conversation"
                  >
                    {isThisOneLoading ? (
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
      </SheetContent>
    </Sheet>
  );
}
