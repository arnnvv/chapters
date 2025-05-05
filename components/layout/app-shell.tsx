import { cn } from "@/lib/utils";
import type React from "react";
import { UserNav } from "./user-nav";
import { ThemeToggle } from "../ui/theme-toggle";
import { Button } from "../ui/button"; // Import Button
import {
  PanelLeftOpen,
  PanelLeftClose,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react"; // Import icons
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Import Tooltip

interface AppShellProps {
  children: React.ReactNode;
  user: {
    name: string | null;
    picture: string | null;
  };
  sidebar?: React.ReactNode;
  rightSidebar?: React.ReactNode;
  showRightSidebar?: boolean;
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
}

export function AppShell({
  children,
  user,
  sidebar,
  rightSidebar,
  showRightSidebar = true,
  isLeftSidebarOpen,
  isRightSidebarOpen,
  toggleLeftSidebar,
  toggleRightSidebar,
}: AppShellProps) {
  // Condition for constraining the main content width
  const constrainMainContent =
    !isLeftSidebarOpen && (!showRightSidebar || !isRightSidebarOpen);

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Main sidebar - Conditionally render and add transition */}
        {sidebar && (
          <aside
            className={cn(
              "hidden md:flex flex-col h-full bg-card border-r border-border transition-all duration-300 ease-in-out",
              // Fixed width when open
              "md:w-64 lg:w-72",
              // Apply transform to hide/show
              isLeftSidebarOpen ? "md:translate-x-0" : "md:-translate-x-full",
              // Add absolute positioning when closed to prevent layout shifts
              !isLeftSidebarOpen &&
                "md:absolute md:left-0 md:top-0 md:bottom-0",
              // Ensure it's visually hidden when closed
              !isLeftSidebarOpen && "md:opacity-0 md:pointer-events-none",
            )}
          >
            {sidebar}
          </aside>
        )}

        {/* Main content area */}
        <main className="flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out">
          {/* Header */}
          <header
            className={cn(
              "h-14 border-b border-border px-4 flex items-center justify-between shrink-0 sticky top-0 bg-background/95 backdrop-blur z-20", // Increased z-index
              "transition-all duration-300 ease-in-out",
            )}
          >
            {/* Left side of header */}
            <div className="flex items-center gap-2">
              {/* Left Sidebar Toggle Button */}
              {sidebar && ( // Only show toggle if sidebar exists
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleLeftSidebar}
                      className="hidden md:inline-flex h-8 w-8" // Show on medium+ screens
                    >
                      {isLeftSidebarOpen ? (
                        <PanelLeftClose className="h-4 w-4" />
                      ) : (
                        <PanelLeftOpen className="h-4 w-4" />
                      )}
                      <span className="sr-only">
                        {isLeftSidebarOpen ? "Close" : "Open"} left sidebar
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>
                      {isLeftSidebarOpen ? "Close" : "Open"} chapters/history
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
              <h1 className="text-xl font-semibold">Chapters</h1>
            </div>

            {/* Right side of header */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserNav user={user} />
              {/* Right Sidebar Toggle Button */}
              {rightSidebar &&
                showRightSidebar && ( // Only show if exists and should be shown
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleRightSidebar}
                        className="hidden md:inline-flex h-8 w-8" // Show on medium+ screens
                      >
                        {isRightSidebarOpen ? (
                          <PanelRightClose className="h-4 w-4" />
                        ) : (
                          <PanelRightOpen className="h-4 w-4" />
                        )}
                        <span className="sr-only">
                          {isRightSidebarOpen ? "Close" : "Open"} right sidebar
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{isRightSidebarOpen ? "Close" : "Open"} Q&A</p>
                    </TooltipContent>
                  </Tooltip>
                )}
            </div>
          </header>

          {/* Content area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Main child content - takes remaining space */}
            {/* --- MODIFIED: Added inner div for conditional width constraint --- */}
            <div className="flex-1 overflow-auto">
              <div
                className={cn(
                  "h-full w-full transition-all duration-300 ease-in-out",
                  // Apply margin auto and max-width only when both sidebars are effectively closed
                  constrainMainContent && "mx-auto max-w-7xl", // ~65-70% on larger screens
                )}
              >
                {children}
              </div>
            </div>
            {/* ---------------------------------------------------------------- */}

            {/* Right Sidebar - Conditionally render and set width/transition */}
            {showRightSidebar && rightSidebar && (
              <aside
                className={cn(
                  "hidden md:flex flex-col h-full border-l border-border bg-muted/20 transition-all duration-300 ease-in-out flex-shrink-0",
                  // --- MODIFIED: Changed width to 50% ---
                  "md:w-1/2",
                  // Translate when closed
                  isRightSidebarOpen
                    ? "md:translate-x-0"
                    : "md:translate-x-full",
                  // Hide when closed using width and opacity for smoother transition
                  !isRightSidebarOpen &&
                    "md:w-0 md:opacity-0 md:pointer-events-none md:border-l-0",
                )}
              >
                {rightSidebar}
              </aside>
            )}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
