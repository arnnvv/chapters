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
import { History, Trash2 } from "lucide-react"; // Added Trash2
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { MouseEvent } from "react"; // Added MouseEvent type

export function ConversationDrawer({
  conversations,
  onSelectConversation,
  isLoading,
  isDisabled,
  onDeleteConversation, // Added onDeleteConversation prop
}: {
  conversations: ConversationListItem[];
  onSelectConversation: (conversationId: number) => void;
  isLoading: boolean;
  isDisabled: boolean;
  onDeleteConversation: (conversationId: number) => void; // Added prop type
}) {
  const handleSelect = (id: number) => {
    if (!isDisabled) {
      onSelectConversation(id);
    }
  };

  // --- NEW HANDLER ---
  const handleDeleteClick = (
    e: MouseEvent<HTMLButtonElement>,
    id: number,
  ) => {
    e.stopPropagation(); // Prevent triggering sheet close or selection
    if (!isDisabled) {
      if (window.confirm("Are you sure you want to delete this conversation? This cannot be undone.")) {
        onDeleteConversation(id);
      }
    }
  };
  // --- END NEW HANDLER ---

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="absolute top-16 left-4 md:top-20 md:left-6 lg:top-24 lg:left-8 z-10" // Adjusted top positioning slightly
          aria-label="Open conversation history"
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
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">
              Loading history...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground italic">
              No conversations yet.
            </div>
          ) : (
            conversations.map((convo) => (
              <div key={convo.id} className="flex items-center pr-2 group"> {/* Added group for hover state */}
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex-grow justify-start rounded-none pl-6 pr-3 py-3 text-left h-auto flex flex-col items-start", // Adjusted padding
                      isDisabled
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-accent hover:text-accent-foreground",
                    )}
                    onClick={() => handleSelect(convo.id)}
                    disabled={isDisabled}
                    aria-label={`Select conversation from ${formatDistanceToNow(new Date(convo.created_at), { addSuffix: true })}`}
                  >
                    <span
                      className="text-sm font-medium mb-1 truncate w-full"
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
                </SheetClose>
                {/* --- NEW DELETE BUTTON --- */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "ml-auto h-8 w-8 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity",
                    isDisabled ? "cursor-not-allowed !opacity-30" : "hover:text-destructive hover:bg-destructive/10"
                  )}
                  onClick={(e) => handleDeleteClick(e, convo.id)}
                  disabled={isDisabled}
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                {/* --- END NEW DELETE BUTTON --- */}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
