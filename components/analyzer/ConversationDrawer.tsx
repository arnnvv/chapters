// components/analyzer/ConversationDrawer.tsx
"use client";

import type { ConversationListItem } from "@/app/actions"; // Use the list item type
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react"; // Use History icon
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns'; // For user-friendly dates


interface ConversationDrawerProps {
  conversations: ConversationListItem[];
  onSelectConversation: (conversationId: number) => void;
  isLoading: boolean; // For list loading state
  isDisabled: boolean; // To disable selection while main content is loading
}

export function ConversationDrawer({
  conversations,
  onSelectConversation,
  isLoading,
  isDisabled,
}: ConversationDrawerProps) {

  const handleSelect = (id: number) => {
    if (!isDisabled) { // Only allow selection if main area isn't busy
       onSelectConversation(id);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="absolute top-16 left-4 md:top-20 md:left-6 lg:top-24 lg:left-8 z-10" // Positioned below index drawer button
          aria-label="Open conversation history"
        >
          <History className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[300px] sm:w-[350px] p-0 flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()} // Prevent focus stealing
      >
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> My Conversations
          </SheetTitle>
        </SheetHeader>
        <div className="flex-grow overflow-y-auto py-2"> {/* Reduced padding */}
          {isLoading ? (
             <div className="p-6 text-center text-muted-foreground">Loading history...</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground italic">No conversations yet.</div>
          ) : (
            conversations.map((convo) => (
              <SheetClose asChild key={convo.id}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start rounded-none px-6 py-3 text-left h-auto flex flex-col items-start", // Allow multi-line text
                    isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-accent hover:text-accent-foreground",
                  )}
                  onClick={() => handleSelect(convo.id)}
                  disabled={isDisabled}
                >
                  <span className="text-sm font-medium mb-1 truncate w-full" title={convo.preview}> {/* Added title for full text */}
                    {convo.preview || "Untitled Conversation"}
                  </span>
                   <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(convo.created_at), { addSuffix: true })}
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
