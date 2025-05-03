"use client";

import { signOutAction } from "@/app/actions"; // Use your existing action
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Loader2 } from "lucide-react"; // Added Loader2
import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation"; // Import router

interface UserNavProps {
  user: {
    name: string | null;
    picture: string | null;
  };
}

export function UserNav({ user }: UserNavProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter(); // Get router instance

  const handleSignOut = () => {
    startTransition(async () => {
      try {
        const result = await signOutAction();
        if (result.success) {
          toast.success("Signed out successfully");
          // Redirect to login page after successful sign out
          router.push("/login");
          router.refresh(); // Force refresh to clear cached user data
        } else {
          toast.error(result.message || "Failed to sign out");
        }
      } catch (error) {
        toast.error("An unexpected error occurred while signing out");
        console.error("Sign out error:", error);
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={user?.picture ?? undefined}
              alt={user?.name ?? "User Avatar"}
            />
            <AvatarFallback>
              {user?.name ? (
                user.name.charAt(0).toUpperCase()
              ) : (
                <User className="h-5 w-5" />
              )}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user?.name || "User"}
            </p>
            {/* Optionally display email if available */}
            {/* <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p> */}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Use DropdownMenuItem for better accessibility and consistency */}
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={handleSignOut}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          <span>{isPending ? "Signing out..." : "Sign out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
