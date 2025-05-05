"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, SendHorizontal, Loader2, Paperclip } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { cn } from "@/lib/utils";

// Ensure the worker is available in your public folder
const PDF_WORKER_SRC = "/pdf.worker.min.mjs";

interface ContentSubmissionFormProps {
  onSubmit: (text: string, background: string) => void;
  isLoading: boolean;
}

export function ContentSubmissionForm({
  onSubmit,
  isLoading,
}: ContentSubmissionFormProps) {
  const [textContent, setTextContent] = useState("");
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [userBackground, setUserBackground] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
    }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextContent(e.target.value);
  };

  const handleBackgroundChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setUserBackground(e.target.value);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setTextContent("");
    setFileName(null);
    toast.info(`Processing ${file.name}...`);

    try {
      if (file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = (event) => {
          setTextContent(event.target?.result as string);
          setIsProcessingFile(false);
          setFileName(file.name);
          toast.success("Text file loaded successfully.");
        };
        reader.onerror = () => {
          throw new Error("Failed to read text file.");
        };
        reader.readAsText(file);
      } else if (file.type === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContentData = await page.getTextContent();
          const pageText = (
            textContentData.items as Array<{ str: string }>
          )
            .map((item) => item.str)
            .join(" ");
          fullText += pageText + "\n\n";
        }
        setTextContent(fullText.trim());
        setIsProcessingFile(false);
        setFileName(file.name);
        toast.success("PDF content extracted successfully.");
      } else {
        throw new Error("Unsupported file type. Please upload .txt or .pdf");
      }
    } catch (error) {
      console.error("File processing error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error processing file.";
      toast.error(`Error: ${message}`);
      setTextContent("");
      setFileName(null);
      setIsProcessingFile(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!textContent.trim()) {
      toast.error(
        "Content cannot be empty. Please type, paste, or upload content.",
      );
      return;
    }
    if (!userBackground.trim()) {
      toast.error(
        "Background knowledge is required. Please describe your current understanding.",
      );
      return;
    }
    onSubmit(textContent, userBackground);
  };

  const anyLoading = isLoading || isProcessingFile;

  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-4 pt-8 pb-20">
      <h2 className="text-3xl font-semibold mb-8 text-center text-foreground/90">
        Upload papers or code you want to understand
      </h2>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl flex flex-col items-center gap-4"
      >
        {/* Main Input Area Container */}
        <div className="relative w-full">
          {/* --- Main Textarea and its icons --- */}
          <Input
            id="fileUploadHidden"
            type="file"
            accept=".txt,.pdf"
            onChange={handleFileChange}
            disabled={anyLoading}
            className="hidden"
            ref={fileInputRef}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            asChild
            className={cn(
              "absolute left-2 bottom-2 z-10 h-8 w-8 text-muted-foreground hover:text-foreground",
              anyLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer",
            )}
            disabled={anyLoading}
          >
            <label htmlFor="fileUploadHidden">
              <Paperclip className="h-5 w-5" />
              <span className="sr-only">Upload file</span>
            </label>
          </Button>
          <Textarea
            id="textContent"
            placeholder={
              isProcessingFile
                ? "Processing file..."
                : fileName
                  ? `File "${fileName}" loaded. Add context or background below.`
                  : "Paste text, code, or upload a file..."
            }
            rows={5}
            value={textContent}
            onChange={handleTextChange}
            disabled={anyLoading}
            required
            // Main input styling
            className="block w-full resize-none rounded-2xl border border-border/50 bg-muted/30 focus:bg-muted/50 dark:bg-input/20 dark:focus:bg-input/40 shadow-lg p-4 pr-12 pl-12 min-h-[56px] text-base focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-primary focus-visible:ring-primary transition-shadow duration-200"
          />
          <Button
            type="submit"
            size="icon"
            className={cn(
              "absolute right-2 bottom-2 z-10 h-8 w-8 rounded-lg",
              (!textContent.trim() || !userBackground.trim() || anyLoading) &&
              "bg-muted/60 text-muted-foreground hover:bg-muted/60 cursor-not-allowed",
              textContent.trim() &&
              userBackground.trim() &&
              !anyLoading &&
              "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
            disabled={!textContent.trim() || !userBackground.trim() || anyLoading}
            aria-label="Submit content"
          >
            {isLoading || isProcessingFile ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <SendHorizontal className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Background Knowledge Textarea - MODIFIED Styling */}
        <div className="w-full max-w-3xl mt-2">
          <Textarea
            id="userBackground"
            placeholder="Please share your current knowledge level and what you're hoping to get out of this material (e.g., 'Python basics, want to understand the core algorithm')..."
            rows={3} // Can make it slightly shorter than main input
            value={userBackground}
            onChange={handleBackgroundChange}
            disabled={anyLoading}
            required
            className={cn(
              // Base styles copied from main input for consistency
              "block w-full resize-none rounded-2xl shadow-lg p-4 min-h-[56px] text-base", // Match padding/rounding/min-height
              "transition-shadow duration-200",
              // Unique background/border for this field
              "bg-muted/20 focus:bg-muted/40 dark:bg-input/10 dark:focus:bg-input/30", // Slightly different background
              "border border-amber-400/60 dark:border-amber-600/50", // Amber border always visible but subtle
              // Focus visible styles for the amber border
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-500/60 dark:focus-visible:ring-amber-400/60 focus-visible:ring-offset-background", // Amber ring on focus
            )}
          />
        </div>
      </form>
    </div>
  );
}
