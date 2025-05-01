import { NextResponse } from "next/server";
import { callGeminiForJson } from "@/lib/gemini"; // Use the JSON helper

// Define the expected structure for the request body
interface GenerateIndexRequest {
  content: string;
  userBackground: string; // Add userBackground here
}

// Define the expected structure for a single chapter in the index
export interface ChapterIndexItem {
  chapter: number;
  title: string;
}

// Define the expected structure for the successful response body
export type GenerateIndexResponse = ChapterIndexItem[];

export async function POST(request: Request) {
  let requestBody: GenerateIndexRequest;
  let userBackground: string; // Declare variable here

  // 1. Parse and Validate Request Body
  try {
    requestBody = (await request.json()) as GenerateIndexRequest;
    if (
      !requestBody ||
      typeof requestBody.content !== "string" ||
      requestBody.content.trim() === ""
    ) {
      return NextResponse.json(
        {
          error: "Invalid request body. 'content' must be a non-empty string.",
        },
        { status: 400 }, // Bad Request
      );
    }
    // Validate userBackground
    if (
      !requestBody.userBackground ||
      typeof requestBody.userBackground !== "string" ||
      requestBody.userBackground.trim() === ""
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid request body. 'userBackground' must be a non-empty string.",
        },
        { status: 400 },
      );
    }
    // Assign userBackground after validation
    userBackground = requestBody.userBackground;
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to parse request body." },
      { status: 400 },
    );
  }

  // Destructure content *after* validation
  const { content } = requestBody;

  // 2. Construct Prompt for Gemini - Use the correct variable name
  const prompt = `
Analyze the document below and extract logical learning units (chapters) as if you're designing the **index of a beginner-friendly book**.

Context:
- The material should be structured for someone with this background: "${userBackground}"
- The book starts from **first principles** and builds up concepts gradually.
- Aim to create **25–40 chapters** to cover the material thoroughly but in digestible units.

Instructions:
- Treat the document as educational material (code, research paper, etc.).
- Output a **JSON array** of objects with:
  - "chapter" (number, starting from 1)
  - "title" (concise, clearly reflects the topic of that chapter)

Constraints:
- Titles must aid structured learning and reflect progressive understanding.
- No explanations, no markdown, no text before/after the JSON.

Document:
---
${content}
---

JSON Output:
`;

  // 3. Call Gemini API
  try {
    // Use the specific JSON helper function
    const index: GenerateIndexResponse =
      await callGeminiForJson<GenerateIndexResponse>(prompt);

    // Optional: Add validation for the received index structure if needed
    if (
      !Array.isArray(index) ||
      index.some(
        (item) =>
          typeof item.chapter !== "number" || typeof item.title !== "string",
      )
    ) {
      console.error("Gemini returned malformed JSON for index:", index);
      throw new Error("Received malformed index structure from AI.");
    }

    // 4. Return Successful Response
    return NextResponse.json(index);
  } catch (error) {
    console.error("Error generating index:", error);
    // Determine if it was a Gemini/parsing error or something else
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json(
      { error: `Failed to generate chapter index: ${errorMessage}` },
      { status: 500 }, // Internal Server Error
    );
  }
}
