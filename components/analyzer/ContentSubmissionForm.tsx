"use client";

import type { FormEvent, ChangeEvent } from "react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
// Import pdfjs-dist
import * as pdfjsLib from "pdfjs-dist";

// --- IMPORTANT: Set up PDF.js worker ---
// Make sure you've copied pdf.worker.min.mjs to your public folder
const PDF_WORKER_SRC = "/pdf.worker.min.mjs"; // Adjust path if needed

export function ContentSubmissionForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (text: string, background: string) => void;
  isLoading: boolean;
}) {
  // State to hold the content from textarea or file
  const [textContent, setTextContent] = useState("");
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [userBackground, setUserBackground] = useState("");

  // Effect to set worker source once on component mount
  useEffect(() => {
    // Check if window is defined (for SSR safety, though this is client-side)
    if (typeof window !== "undefined") {
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
    }
  }, []);

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setTextContent(e.target.value);
  };

  const handleBackgroundChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setUserBackground(e.target.value);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setTextContent(""); // Clear existing text
    toast.info(`Processing ${file.name}...`);

    try {
      if (file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = (event) => {
          setTextContent(event.target?.result as string);
          setIsProcessingFile(false);
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
          //textContentData.items is an array of objects with 'str' property
          const pageText = textContentData.items
            .map((item: any) => item.str)
            .join(" ");
          fullText += pageText + "\n\n"; // Add space between pages
        }
        setTextContent(fullText.trim());
        setIsProcessingFile(false);
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
      setTextContent(""); // Clear on error
      setIsProcessingFile(false);
    } finally {
      // Reset the file input so the same file can be selected again if needed
      e.target.value = "";
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Use state values instead of formData directly for text
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
    <form onSubmit={handleSubmit} className="mb-4 space-y-4">
      {/* File Upload Input */}
      <div>
        <label htmlFor="fileUpload" className="block text-sm font-medium mb-1">
          Upload Content File (Optional)
        </label>
        <input
          type="file"
          id="fileUpload"
          name="fileUpload"
          accept=".txt,.pdf"
          onChange={handleFileChange}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={anyLoading}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Accepts .txt and .pdf files. Uploading will replace the text below.
        </p>
      </div>

      {/* Text Area Input */}
      <div>
        <label htmlFor="textContent" className="block text-sm font-medium mb-1">
          Content to Analyze (or Paste Here)
        </label>
        <textarea
          id="textContent"
          name="textContent"
          rows={10}
          placeholder={
            isProcessingFile
              ? "Extracting text from file..."
              : "Paste your code or text here, or upload a file above..."
          }
          className="w-full p-2 border rounded bg-input text-foreground border-border"
          required
          value={textContent} // Controlled component
          onChange={handleTextChange} // Allow manual editing/pasting
          disabled={anyLoading}
        />
      </div>

      {/* Background Knowledge Input */}
      <div>
        <label
          htmlFor="userBackground"
          className="block text-sm font-medium mb-1"
        >
          Your Background Knowledge
        </label>
        <textarea
          id="userBackground"
          name="userBackground"
          rows={3}
          placeholder="Briefly describe your relevant knowledge (e.g., 'Know Python basics', 'Familiar with calculus but not linear algebra')..."
          className="w-full p-2 border rounded bg-input text-foreground border-border"
          required
          value={userBackground}
          onChange={handleBackgroundChange}
          disabled={anyLoading}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-wait" // cursor-wait when loading
        disabled={anyLoading}
      >
        {isLoading
          ? "Analyzing..."
          : isProcessingFile
            ? "Processing File..."
            : "Start Learning"}
      </button>
    </form>
  );
}
