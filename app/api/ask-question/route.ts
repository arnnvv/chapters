import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import type { ChapterIndexItem } from "../generate-index/route";

export interface QAItem {
  question: string;
  answer: string;
}

interface AskQuestionRequest {
  fullContent: string;
  index: ChapterIndexItem[];
  generatedChapters: Record<string | number, string>;
  qaHistory: QAItem[];
  userQuestion: string;
  userBackground: string; // Added
}

export interface AskQuestionResponse {
  answer: string;
}

export async function POST(request: Request) {
  let requestBody: AskQuestionRequest;

  try {
    requestBody = (await request.json()) as AskQuestionRequest;
    const {
      fullContent,
      index,
      generatedChapters,
      qaHistory,
      userQuestion,
      userBackground, // Added
    } = requestBody;

    if (!fullContent || typeof fullContent !== "string" || fullContent.trim() === "") {
      return NextResponse.json({ error: "'fullContent' is required." }, { status: 400 });
    }
    if (!Array.isArray(index)) {
      return NextResponse.json({ error: "'index' must be an array." }, { status: 400 });
    }
    if (typeof generatedChapters !== 'object' || generatedChapters === null) {
      return NextResponse.json({ error: "'generatedChapters' must be an object." }, { status: 400 });
    }
    if (!Array.isArray(qaHistory)) {
      return NextResponse.json({ error: "'qaHistory' must be an array." }, { status: 400 });
    }
    if (!userQuestion || typeof userQuestion !== "string" || userQuestion.trim() === "") {
      return NextResponse.json({ error: "'userQuestion' is required and must be non-empty." }, { status: 400 });
    }
    if (!userBackground || typeof userBackground !== 'string') { // Validate background
      return NextResponse.json({ error: "'userBackground' must be a non-empty string." }, { status: 400 });
    }

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to parse request body." },
      { status: 400 },
    );
  }

  const {
    fullContent,
    index,
    generatedChapters,
    qaHistory,
    userQuestion,
    userBackground,
  } = requestBody;

  const indexJsonString = JSON.stringify(index, null, 2);

  let chaptersContext = "No chapters generated yet.";
  const chapterNumbers = Object.keys(generatedChapters)
    .map(numStr => parseInt(numStr, 10))
    .filter(num => !isNaN(num))
    .sort((a, b) => a - b);

  if (chapterNumbers.length > 0) {
    const relevantTitles: Record<number, string> = {};
    index.forEach(item => { relevantTitles[item.chapter] = item.title; });
    const chapterContentParts = chapterNumbers.map(num => {
      const title = relevantTitles[num] || `Chapter ${num}`;
      const content = generatedChapters[num] || generatedChapters[String(num)] || "[Content not found]";
      const truncatedContent = content.length > 500 ? content.substring(0, 500) + "..." : content;
      return `Chapter ${num} ("${title}") Summary:\n${truncatedContent}\n---`;
    });
    chaptersContext = `Generated Chapter Content Summary:\n${chapterContentParts.join("\n")}`;
  }

  const maxHistoryItems = 5;
  const recentHistory = qaHistory.slice(-maxHistoryItems);
  const historyJsonString = JSON.stringify(recentHistory.map(item => ({
    User: item.question,
    Assistant: item.answer
  })), null, 2);
  const historyContext = recentHistory.length > 0
    ? `Recent Conversation History:\n${historyJsonString}`
    : "No previous conversation history.";

  // Modified Prompt for Q&A
  // Prompt for Q&A (Modified for Markdown Breaks)
  // Modified Prompt for Q&A
  const prompt = `
Act as a helpful and knowledgeable AI teaching assistant. You are answering a question from a learner whose background is: "${userBackground}".
Your task is to answer the user's question accurately and clearly, explaining concepts in a way the learner can understand.

**Prioritize information found within the provided context below**, especially when the question is specifically about the document's content. However, you **may use your general knowledge** to provide broader context or answer more general questions (like asking about other common architectures) if the provided document doesn't cover it or is limited.

Provided Context for Your Reference:

1.  **Full Original Document:**
    --- START DOCUMENT ---
    ${fullContent}
    --- END DOCUMENT ---

2.  **Document Structure (Chapter Index):**
    ${indexJsonString}

3.  **Generated Explanations Summary (for chapters processed so far):**
    ${chaptersContext}

4.  **Recent Conversation History (User Questions & Your Previous Answers):**
    ${historyContext}

---
Now, answer the following user question. Remember your role as a teacher and consider the learner's background.

**User Question:** ${userQuestion}

**Your Answer (as a helpful teacher. Answer directly without introductory phrases like "Okay, let's look..." or "Sure, I can help..."):**
`; // Added instruction for direct answer
  try {
    const answer: string = await callGemini(prompt);
    const responseBody: AskQuestionResponse = { answer };
    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Error answering question:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json(
      { error: `Failed to get answer: ${errorMessage}` },
      { status: 500 },
    );
  }
}
