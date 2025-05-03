/* START OF MODIFIED FILE: components/analyzer/ConversationDrawer.tsx */
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
import { History, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { MouseEvent } from "react";

export function ConversationDrawer({
  conversations,
  onSelectConversation,
  isLoading,
  isDisabled,
  currentlyLoadingConversationId,
  onDeleteConversation,
}: {
  conversations: ConversationListItem[];
  onSelectConversation: (conversationId: number) => void;
  isLoading: boolean;
  isDisabled: boolean;
  currentlyLoadingConversationId: number | null;
  onDeleteConversation: (conversationId: number) => void;
}) {
  const handleSelect = (id: number) => {
    if (!isDisabled && currentlyLoadingConversationId !== id) {
      onSelectConversation(id);
    }
  };

  const handleDeleteClick = (e: MouseEvent<HTMLButtonElement>, id: number) => {
    e.stopPropagation();
    if (!isDisabled && currentlyLoadingConversationId !== id) {
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
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="absolute top-16 left-4 md:top-20 md:left-6 lg:top-24 lg:left-8 z-10"
          aria-label="Open conversation history"
          disabled={isDisabled}
        >
          <History className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[300px] sm:w-[350px] p-0 flex flex-col max-w-full"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> My Conversations
          </SheetTitle>
        </SheetHeader>
        <div className="flex-grow overflow-y-auto py-2">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">
              Loading history...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground italic">
              No conversations yet.
            </div>
          ) : (
            conversations.map((convo) => {
              const isThisOneLoading =
                currentlyLoadingConversationId === convo.id;
              const isButtonDisabled = isDisabled || isThisOneLoading;

              return (
                <div key={convo.id} className="flex items-center pr-2 group">
                  {isThisOneLoading ? (
                    <Button
                      variant="ghost"
                      className={cn(
                        "flex-grow justify-start rounded-none pl-6 pr-3 py-3 text-left h-auto flex flex-col items-start min-w-0 overflow-hidden",
                        "opacity-50 cursor-not-allowed",
                      )}
                      disabled={true}
                      aria-label={`Loading conversation from ${formatDistanceToNow(new Date(convo.created_at), { addSuffix: true })}`}
                    >
                      <div className="w-full overflow-x-hidden">
                        <span
                          className="text-sm font-medium mb-1 block whitespace-normal break-words overflow-wrap-anywhere"
                          title={convo.preview}
                        >
                          {convo.preview || "Untitled Conversation"}
                        </span>
                      </div>
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
                          "flex-grow justify-start rounded-none pl-6 pr-3 py-3 text-left h-auto flex flex-col items-start min-w-0 overflow-hidden",
                          isButtonDisabled
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-accent hover:text-accent-foreground",
                        )}
                        onClick={() => handleSelect(convo.id)}
                        disabled={isButtonDisabled}
                        aria-label={`Select conversation from ${formatDistanceToNow(new Date(convo.created_at), { addSuffix: true })}`}
                      >
                        <div className="w-full overflow-x-hidden">
                          <span
                            className="text-sm font-medium mb-1 block whitespace-normal break-words overflow-wrap-anywhere"
                            title={convo.preview}
                          >
                            {convo.preview || "Untitled Conversation"}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(convo.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </Button>
                    </SheetClose>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "ml-auto h-8 w-8 shrink-0 text-muted-foreground opacity-70 hover:opacity-100 transition-opacity",
                      isButtonDisabled
                        ? "cursor-not-allowed !opacity-30"
                        : "hover:text-destructive hover:bg-destructive/10",
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
/* END OF MODIFIED FILE: components/analyzer/ConversationDrawer.tsx */
