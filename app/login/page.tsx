import type { JSX } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChromeIcon } from "lucide-react";

export default function LoginPage(): JSX.Element {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        {" "}
        <CardHeader className="space-y-1.5 text-center pb-4">
          {" "}
          <CardTitle className="text-2xl font-bold tracking-tight">
            {" "}
            Welcome to Ace
          </CardTitle>
          <CardDescription>
            Your AI-powered document teaching assistant
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 pb-6">
          {" "}
          <div className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
            <p>Learn from any document with AI explanations.</p>
            <p>Ask questions and get instant, contextual answers.</p>
            <p>Upload PDF or TXT files, or paste text directly.</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            asChild
            className="w-full flex items-center justify-center"
            size="lg"
          >
            <a href="/login/google">
              <ChromeIcon className="mr-2 h-4 w-4" />
              Sign in with Google
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
