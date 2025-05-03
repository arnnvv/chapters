"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChromeIcon } from "lucide-react"; // Using Lucide directly
import { Loader2 } from "lucide-react"; // For loading state

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  // Keep your existing redirect logic
  const handleGoogleLogin = () => {
    setIsLoading(true);
    // Redirect to your backend route which handles OAuth flow
    window.location.href = "/login/google";
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-lg"> {/* Added shadow */}
        <CardHeader className="space-y-1.5 text-center pb-4"> {/* Adjusted spacing */}
          {/* Optional: Add an icon or logo here */}
          <CardTitle className="text-2xl font-bold tracking-tight"> {/* Adjusted tracking */}
            Welcome to Chapters
          </CardTitle>
          <CardDescription>
            Your AI-powered document teaching assistant
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 pb-6"> {/* Adjusted padding */}
          <div className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
            <p>Learn from any document with AI explanations.</p>
            <p>Ask questions and get instant, contextual answers.</p>
            <p>Upload PDF or TXT files, or paste text directly.</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            size="lg" // Make button larger
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting...
              </>
            ) : (
              <>
                <ChromeIcon className="mr-2 h-4 w-4" /> {/* Using Lucide Chrome icon */}
                Sign in with Google
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
