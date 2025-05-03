import * as React from "react";

const MOBILE_BREAKPOINT = 768; // Standard md breakpoint

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    // Check if window is defined (for SSR safety)
    if (typeof window === "undefined") {
      return;
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Initial check
    onChange();

    // Add listener
    mql.addEventListener("change", onChange);

    // Cleanup listener
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Return !!isMobile to ensure it's always boolean (true/false) after initial undefined state
  return !!isMobile;
}
