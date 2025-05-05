"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, SendHorizontal, Loader2, Paperclip, X, FileText } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { cn } from "@/lib/utils";

// Ensure the worker is available in your public folder
const PDF_WORKER_SRC = "/pdf.worker.min.mjs";

const ALLOWED_CODE_EXTENSIONS = new Set([
  ".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".java", ".c",
  ".cpp", ".cs", ".go", ".php", ".rb", ".rs", ".swift", ".kt", ".kts",
  ".sql", ".sh", ".json", ".yml", ".yaml", ".md",
]);

// --- REFINED: Function to get file extension (including the dot) ---
const getFileExtension = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf(".");
  // Ensure dot exists, is not the first character, and there's something after it
  if (lastDotIndex > 0 && lastDotIndex < filename.length - 1) {
    return filename.substring(lastDotIndex).toLowerCase(); // Includes the dot
  }
  return ""; // No valid extension found
};
// --- End Refined ---

interface ContentSubmissionFormProps {
  onSubmit: (text: string, background: string) => void;
  isLoading: boolean; // Loading state from parent (API call)
}

export function ContentSubmissionForm({
  onSubmit,
  isLoading,
}: ContentSubmissionFormProps) {
  const [textContent, setTextContent] = useState("");
  const [isProcessingFileSelection, setIsProcessingFileSelection] = useState(false);
  const [isReadingFileOnSubmit, setIsReadingFileOnSubmit] = useState(false);
  const [userBackground, setUserBackground] = useState("");
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingFileSelection(true);
    // Don't clear text content anymore
    // setTextContent("");

    const newlyAddedFiles: File[] = [];
    const newlyAddedFileNames: string[] = [];
    const skippedFiles: string[] = [];

    for (const file of Array.from(files)) {
      if (fileNames.includes(file.name)) {
        skippedFiles.push(`${file.name} (duplicate)`);
        continue;
      }

      // --- ADDED: Debugging Logs ---
      const fileExtension = getFileExtension(file.name);
      const isAllowedCodeFile = ALLOWED_CODE_EXTENSIONS.has(fileExtension);
      console.log(`File: ${file.name}, Type: ${file.type}, Extension: "${fileExtension}", Is Code Allowed: ${isAllowedCodeFile}`);
      // --- End Debugging Logs ---

      const isAllowedType =
        file.type === "text/plain" ||
        file.type === "application/pdf" ||
        isAllowedCodeFile; // Relies on isAllowedCodeFile check

      if (!isAllowedType) {
        console.log(`Skipping ${file.name} because isAllowedType is false.`); // Added skip log
        skippedFiles.push(`${file.name} (unsupported type)`);
        continue;
      }

      newlyAddedFiles.push(file);
      newlyAddedFileNames.push(file.name);
    }

    if (newlyAddedFiles.length > 0) {
      setSelectedFiles((prevFiles) => [...prevFiles, ...newlyAddedFiles]);
      setFileNames((prevNames) => [...prevNames, ...newlyAddedFileNames]);
      toast.success(
        `Added ${newlyAddedFiles.length} file(s): ${newlyAddedFileNames.join(", ")}`,
      );
    }

    if (skippedFiles.length > 0) {
      toast.warning(`Skipped ${skippedFiles.length} file(s): ${skippedFiles.join(", ")}`);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsProcessingFileSelection(false);
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles((prevFiles) =>
      prevFiles.filter((_, index) => index !== indexToRemove),
    );
    setFileNames((prevNames) =>
      prevNames.filter((_, index) => index !== indexToRemove),
    );
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!userBackground.trim()) {
      toast.error(
        "Background knowledge is required. Please describe your current understanding.",
      );
      return;
    }

    let finalContent = "";
    let contentSource = "";

    if (selectedFiles.length > 0) {
      setIsReadingFileOnSubmit(true);
      const fileContents: string[] = [];
      contentSource = `${selectedFiles.length} file(s)`;
      try {
        for (const file of selectedFiles) {
          let fileText = "";
          fileContents.push(`--- START FILE: ${file.name} ---\n`);

          if (file.type === "application/pdf") {
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
              fullText += pageText + (i < pdf.numPages ? "\n\n" : "");
            }
            fileText = fullText.trim();
          } else {
            // Read TXT and allowed code files as text
            fileText = await file.text();
          }

          fileContents.push(fileText);
          fileContents.push(`\n--- END FILE: ${file.name} ---`);
        }
        finalContent = fileContents.join("\n\n");

      } catch (error) {
        console.error("Error reading files on submit:", error);
        toast.error(
          `Failed to read file content: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        setIsReadingFileOnSubmit(false);
        return;
      } finally {
        setIsReadingFileOnSubmit(false);
      }
    } else {
      if (!textContent.trim()) {
        toast.error(
          "Content cannot be empty. Please type, paste, or upload files.",
        );
        return;
      }
      finalContent = textContent.trim();
      contentSource = "pasted text";
    }

    if (!finalContent) {
      toast.error("Could not obtain content to submit.");
      return;
    }

    console.log(`Submitting content from ${contentSource}`);
    onSubmit(finalContent, userBackground);
  };

  const anyLoading =
    isLoading || isProcessingFileSelection || isReadingFileOnSubmit;
  const canSubmit =
    (selectedFiles.length > 0 || textContent.trim()) &&
    userBackground.trim() &&
    !anyLoading;

  const acceptedFileTypes = ".txt,.pdf," + Array.from(ALLOWED_CODE_EXTENSIONS).join(',');

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
            accept={acceptedFileTypes}
            onChange={handleFileChange}
            disabled={anyLoading}
            className="hidden"
            ref={fileInputRef}
            multiple
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
              <span className="sr-only">Upload file(s)</span>
            </label>
          </Button>
          <Textarea
            id="textContent"
            placeholder={
              selectedFiles.length > 0
                ? `${selectedFiles.length} file(s) selected. Add optional context or paste different text...`
                : "Paste text, code, or upload file(s) (.txt, .pdf, .py, .js...)"
            }
            rows={3}
            value={textContent}
            onChange={handleTextChange}
            disabled={anyLoading}
            className={cn(
              "block w-full resize-y rounded-2xl border border-border/50 bg-muted/30 focus:bg-muted/50 dark:bg-input/20 dark:focus:bg-input/40 shadow-lg p-4 pr-12 pl-12 min-h-[48px] text-base focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-primary focus-visible:ring-primary transition-shadow duration-200",
            )}
          />
          <Button
            type="submit"
            size="icon"
            className={cn(
              "absolute right-2 bottom-2 z-10 h-8 w-8 rounded-lg",
              !canSubmit &&
              "bg-muted/60 text-muted-foreground hover:bg-muted/60 cursor-not-allowed",
              canSubmit &&
              "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
            disabled={!canSubmit}
            aria-label="Submit content"
          >
            {isLoading || isReadingFileOnSubmit ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <SendHorizontal className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* File Indicator Chips Area */}
        {fileNames.length > 0 && (
          <div className="w-full max-w-3xl flex flex-wrap gap-2 mt-[-8px] px-2 justify-start mb-2">
            {fileNames.map((name, index) => (
              <div
                key={`${name}-${index}`}
                className="inline-flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/30 border border-amber-400/60 dark:border-amber-600/50 rounded-full px-2.5 py-1 text-xs text-amber-900 dark:text-amber-200 shadow-sm"
              >
                <FileText className="h-3 w-3" />
                <span className="font-medium truncate max-w-[150px]">
                  {name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 rounded-full text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/50 ml-1"
                  onClick={() => handleRemoveFile(index)}
                  disabled={anyLoading}
                  aria-label={`Remove file ${name}`}
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Background Knowledge Textarea */}
        <div className="w-full max-w-3xl mt-0">
          <Textarea
            id="userBackground"
            placeholder="Please share your current knowledge level and what you're hoping to get out of this material (e.g., 'Python basics, want to understand the core algorithm')..."
            rows={3}
            value={userBackground}
            onChange={handleBackgroundChange}
            disabled={anyLoading}
            required
            className={cn(
              "block w-full resize-none rounded-2xl shadow-lg p-4 min-h-[56px] text-base",
              "transition-shadow duration-200",
              "bg-muted/20 focus:bg-muted/40 dark:bg-input/10 dark:focus:bg-input/30",
              "border border-amber-400/60 dark:border-amber-600/50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-500/60 dark:focus-visible:ring-amber-400/60 focus-visible:ring-offset-background",
            )}
          />
        </div>
      </form>
    </div>
  );
}
