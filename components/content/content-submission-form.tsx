"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, Upload, Loader2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

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
  const [fileName, setFileName] = useState<string | null>(null); // State to store filename

  useEffect(() => {
    if (typeof window !== "undefined") {
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
    }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextContent(e.target.value);
  };

  const handleBackgroundChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserBackground(e.target.value);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setTextContent(""); // Clear existing text
    setFileName(null); // Reset file name
    toast.info(`Processing ${file.name}...`);

    try {
      if (file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = (event) => {
          setTextContent(event.target?.result as string);
          setIsProcessingFile(false);
          setFileName(file.name); // Set file name on success
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
          // Type assertion for items
          const textContent = await page.getTextContent();
          const pageText = (textContent.items as Array<{ str: string }>)
            .map((item) => item.str)
            .join(" ");
          fullText += pageText + "\n\n"; // Add space between pages
        }

        setTextContent(fullText.trim());
        setIsProcessingFile(false);
        setFileName(file.name); // Set file name on success
        toast.success("PDF content extracted successfully.");
      } else {
        throw new Error("Unsupported file type. Please upload .txt or .pdf");
      }
    } catch (error) {
      console.error("File processing error:", error);
      const message =
        error instanceof Error ? error.message : "Unknown error processing file.";
      toast.error(`Error: ${message}`);
      setTextContent(""); // Clear on error
      setFileName(null);
      setIsProcessingFile(false);
    } finally {
      // Reset the file input so the same file can be selected again if needed
      e.target.value = "";
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
      toast.error("Please describe your background knowledge.");
      return;
    }

    onSubmit(textContent, userBackground);
  };

  const anyLoading = isLoading || isProcessingFile;

  return (
    // Centering the card
    <div className="flex justify-center items-start pt-10 min-h-full">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Upload Document
          </CardTitle>
          <CardDescription>
            Upload a document or paste content to analyze and learn from.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fileUpload">Upload File (Optional)</Label>
              <div className="flex items-center justify-center w-full">
                <Label
                  htmlFor="fileUpload"
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted/50 transition-colors ${anyLoading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                    <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                    {fileName ? (
                      <p className="text-sm font-medium text-foreground truncate max-w-[90%]">
                        {fileName}
                      </p>
                    ) : (
                      <p className="mb-1 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      TXT or PDF files
                    </p>
                  </div>
                  <Input
                    id="fileUpload"
                    type="file"
                    accept=".txt,.pdf"
                    onChange={handleFileChange}
                    disabled={anyLoading}
                    className="hidden"
                  />
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="textContent">Content to Analyze (or Paste Here)</Label>
              <Textarea
                id="textContent"
                placeholder={
                  isProcessingFile
                    ? "Extracting text from file..."
                    : "Paste your code or text here, or upload a file above..."
                }
                rows={10}
                value={textContent}
                onChange={handleTextChange}
                disabled={anyLoading}
                className="min-h-[150px] resize-y" // Allow vertical resize
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userBackground">Your Background Knowledge</Label>
              <Textarea
                id="userBackground"
                placeholder="Briefly describe your relevant knowledge (e.g., 'Know Python basics', 'Familiar with calculus but not linear algebra'). This helps tailor explanations."
                rows={3}
                value={userBackground}
                onChange={handleBackgroundChange}
                disabled={anyLoading}
                className="min-h-[80px] resize-y" // Allow vertical resize
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={anyLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : isProcessingFile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing File...
                </>
              ) : (
                "Start Learning"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
