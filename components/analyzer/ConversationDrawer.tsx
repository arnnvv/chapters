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
import { History } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export function ConversationDrawer({
  conversations,
  onSelectConversation,
  isLoading,
  isDisabled,
}: {
  conversations: ConversationListItem[];
  onSelectConversation: (conversationId: number) => void;
  isLoading: boolean;
  isDisabled: boolean;
}) {
  const handleSelect = (id: number) => {
    if (!isDisabled) {
      onSelectConversation(id);
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
              <SheetClose asChild key={convo.id}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start rounded-none px-6 py-3 text-left h-auto flex flex-col items-start",
                    isDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-accent hover:text-accent-foreground",
                  )}
                  onClick={() => handleSelect(convo.id)}
                  disabled={isDisabled}
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
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
