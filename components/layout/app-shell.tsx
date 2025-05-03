import { cn } from "@/lib/utils";
import type React from "react";
import { UserNav } from "./user-nav";
import { ThemeToggle } from "../ui/theme-toggle";

interface AppShellProps {
  children: React.ReactNode;
  user: {
    name: string | null;
    picture: string | null;
  };
  sidebar?: React.ReactNode;
  rightSidebar?: React.ReactNode;
  showRightSidebar?: boolean;
}

export function AppShell({
  children,
  user,
  sidebar,
  rightSidebar,
  showRightSidebar = true,
}: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main sidebar */}
      {sidebar && (
        <aside className="hidden md:flex md:w-64 lg:w-72 border-r border-border flex-col h-full bg-card">
          {sidebar}
        </aside>
      )}

      {/* Main content area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border px-4 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10">
          <div className="flex items-center gap-2">
            {/* Maybe add a mobile sidebar trigger here if needed later */}
            <h1 className="text-xl font-semibold">Chapters</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserNav user={user} />
          </div>
        </header>

        {/* Content area with optional right sidebar */}
        <div className="flex flex-1 overflow-hidden">
          <div
            className={cn(
              "flex-1 overflow-auto",
              // Removed md:border-r as the right sidebar itself has border-l
            )}
          >
            {children}
          </div>

          {showRightSidebar && rightSidebar && (
            <aside className="hidden md:flex md:w-80 lg:w-96 flex-col h-full border-l border-border bg-muted/20">
              {rightSidebar}
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
