import { Loader2 } from "lucide-react";
import type { JSX } from "react";

export function IndexingLoader(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full text-center px-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
      <h2 className="text-2xl font-semibold mb-3 text-foreground/90">
        Performing Deep Analysis
      </h2>
      <p className="text-lg text-muted-foreground max-w-md">
        This involves understanding the structure and content of your document.
        It usually takes 1-2 minutes, please wait...
      </p>
    </div>
  );
}
