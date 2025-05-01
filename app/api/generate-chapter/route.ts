import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import type { ChapterIndexItem } from "../generate-index/route";

interface GenerateChapterRequest {
  fullContent: string;
  index: ChapterIndexItem[];
  targetChapterNumber: number;
  generatedChapters: Record<string | number, string>;
  userBackground: string; // Added
}

export interface GenerateChapterResponse {
  chapterContent: string;
}

export async function POST(request: Request) {
  let requestBody: GenerateChapterRequest;

  try {
    requestBody = (await request.json()) as GenerateChapterRequest;
    const {
      fullContent,
      index,
      targetChapterNumber,
      generatedChapters,
      userBackground,
    } = requestBody; // Added userBackground

    if (
      !fullContent ||
      typeof fullContent !== "string" ||
      fullContent.trim() === ""
    ) {
      return NextResponse.json(
        { error: "'fullContent' must be a non-empty string." },
        { status: 400 },
      );
    }
    if (!Array.isArray(index) || index.length === 0) {
      return NextResponse.json(
        { error: "'index' must be a non-empty array." },
        { status: 400 },
      );
    }
    if (typeof targetChapterNumber !== "number" || targetChapterNumber < 1) {
      return NextResponse.json(
        { error: "'targetChapterNumber' must be a positive number." },
        { status: 400 },
      );
    }
    if (typeof generatedChapters !== "object" || generatedChapters === null) {
      return NextResponse.json(
        { error: "'generatedChapters' must be an object (can be empty)." },
        { status: 400 },
      );
    }
    if (!userBackground || typeof userBackground !== "string") {
      // Validate background
      return NextResponse.json(
        { error: "'userBackground' must be a non-empty string." },
        { status: 400 },
      );
    }

    const targetChapterInfo = index.find(
      (item) => item.chapter === targetChapterNumber,
    );
    if (!targetChapterInfo) {
      return NextResponse.json(
        {
          error: `Chapter number ${targetChapterNumber} not found in the provided index.`,
        },
        { status: 400 },
      );
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
    targetChapterNumber,
    generatedChapters,
    userBackground,
  } = requestBody;
  const targetChapterInfo = index.find(
    (item) => item.chapter === targetChapterNumber,
  );

  if (!targetChapterInfo) {
    throw new Error(`Chapter ${targetChapterNumber} not found in index`);
  }
  const indexJsonString = JSON.stringify(index, null, 2);

  let previousChaptersContext = "No preceding chapters generated yet.";
  const chapterNumbers = Object.keys(generatedChapters)
    .map((numStr) => Number.parseInt(numStr, 10))
    .filter((num) => !Number.isNaN(num) && num < targetChapterNumber)
    .sort((a, b) => a - b);

  if (chapterNumbers.length > 0) {
    const relevantTitles: Record<number, string> = {};
    for (const item of index) {
      relevantTitles[item.chapter] = item.title;
    }

    const previousContentParts = chapterNumbers.map((num) => {
      const title = relevantTitles[num] || `Chapter ${num}`;
      const content =
        generatedChapters[num] ||
        generatedChapters[String(num)] ||
        "[Content not found]";
      const truncatedContent =
        content.length > 1000 ? `${content.substring(0, 1000)}...` : content;
      return `--- START Chapter ${num} ("${title}") ---\n${truncatedContent}\n--- END Chapter ${num} ---`;
    });
    previousChaptersContext = `For context, here is the summarized content of the preceding chapters you have already generated:\n${previousContentParts.join("\n\n")}`;
  }

  const prompt = `
Act as an expert professor and clear teacher.

Learner Background:
- "${userBackground}"

Your Task:
- Teach only **Chapter ${targetChapterNumber}**: "${targetChapterInfo.title}"
- Use the **Full Document** (see below) to explain the chapter's content.
- Use these references:
  - **Index**: ${indexJsonString}
  - **Summaries of earlier chapters**: ${previousChaptersContext}

Instructions:
- Do not copy text — explain and teach.
- Infer which parts of the document match this chapter.
- Break down complex ideas step-by-step.
- Explain the *purpose* or *why* behind code, algorithms, or theories.
- Use analogies/examples that suit the learner’s background.
-when your code deals with matrix multiplication or similar operations, explain it using actual matrices with real numbers. don't just talk theory-show a concrete example that people can follow.
- Use Markdown for structure:
  - Headings (e.g., #, ##)          
  - Lists (e.g., *, -)             
  - Code blocks (\`\`\`language ... \`\`\`) 

Output Rules:
- first write the exact part of that code or paper you are explaining as it is and then start the explaination
- Output only your explanation for Chapter ${targetChapterNumber}.
- No introductions or summaries like “Let’s dive in…” or “That wraps up…”
- No mention of the prompt or instructions.

Full Document:
---
${fullContent}
---

Your Explanation for Chapter ${targetChapterNumber} ("${targetChapterInfo.title}"):
`;

  try {
    const chapterContent: string = await callGemini(prompt);
    const responseBody: GenerateChapterResponse = { chapterContent };
    return NextResponse.json(responseBody);
  } catch (error) {
    console.error(
      `Error generating content for chapter ${targetChapterNumber}:`,
      error,
    );
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json(
      {
        error: `Failed to generate content for chapter ${targetChapterNumber}: ${errorMessage}`,
      },
      { status: 500 },
    );
  }
}
