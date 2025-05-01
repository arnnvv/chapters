import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import { getCurrentSession } from "@/app/actions";
import { db } from "@/lib/db";
import type { ChapterIndexItem, ChapterIndexItemDB } from "@/lib/db/types";

interface GenerateChapterRequest {
  conversationId: number;
  targetChapterNumber: number;
  fullContent: string;
  userBackground: string;
  generatedChapters: Record<string | number, string>;
}

export interface GenerateChapterResponse {
  chapterContent: string;
}

export async function POST(request: Request) {
  const { session, user } = await getCurrentSession();
  if (!session || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user.id;

  let requestBody: GenerateChapterRequest;
  try {
    requestBody = (await request.json()) as GenerateChapterRequest;
    if (typeof requestBody.conversationId !== "number") {
      return NextResponse.json(
        { error: "'conversationId' must be a number." },
        { status: 400 },
      );
    }
    if (
      typeof requestBody.targetChapterNumber !== "number" ||
      requestBody.targetChapterNumber < 1
    ) {
      return NextResponse.json(
        { error: "'targetChapterNumber' must be a positive number." },
        { status: 400 },
      );
    }
    if (
      !requestBody.fullContent ||
      typeof requestBody.fullContent !== "string" ||
      requestBody.fullContent.trim() === ""
    ) {
      return NextResponse.json(
        { error: "'fullContent' is required." },
        { status: 400 },
      );
    }
    if (
      !requestBody.userBackground ||
      typeof requestBody.userBackground !== "string"
    ) {
      return NextResponse.json(
        { error: "'userBackground' must be a non-empty string." },
        { status: 400 },
      );
    }
    if (
      typeof requestBody.generatedChapters !== "object" ||
      requestBody.generatedChapters === null
    ) {
      return NextResponse.json(
        { error: "'generatedChapters' must be an object." },
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
    conversationId,
    targetChapterNumber,
    fullContent,
    userBackground,
    generatedChapters,
  } = requestBody;

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const convCheckResult = await client.query<{ user_id: number }>(
      "SELECT user_id FROM conversations WHERE id = $1 LIMIT 1",
      [conversationId],
    );
    if (
      convCheckResult.rowCount === 0 ||
      convCheckResult.rows[0].user_id !== userId
    ) {
      throw new Error("Conversation not found or access denied");
    }

    const indexResult = await client.query<ChapterIndexItemDB>(
      `SELECT chapter_number, title
       FROM chapter_index_items
       WHERE conversation_id = $1
       ORDER BY chapter_number ASC`,
      [conversationId],
    );

    if (indexResult.rowCount === 0) {
      throw new Error(
        `No index items found for conversation ${conversationId}`,
      );
    }

    const index: ChapterIndexItem[] = indexResult.rows.map((row) => ({
      chapter: row.chapter_number,
      title: row.title,
    }));

    const targetChapterInfo = index.find(
      (item) => item.chapter === targetChapterNumber,
    );
    if (!targetChapterInfo) {
      throw new Error(
        `Chapter number ${targetChapterNumber} not found in the fetched index for conversation ${conversationId}.`,
      );
    }

    await client.query("COMMIT");

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
Learner Background: - "${userBackground}"
Your Task: - Teach only **Chapter ${targetChapterNumber}**: "${targetChapterInfo.title}"
- Use the **Full Document** (see below) to explain the chapter's content.
- Use these references: - **Index**: ${indexJsonString} - **Summaries of earlier chapters**: ${previousChaptersContext}
Instructions: - Do not copy text — explain and teach.
- Infer which parts of the document match this chapter. - Break down complex ideas step-by-step.
- Explain the *purpose* or *why* behind code, algorithms, or theories. - Use analogies/examples that suit the learner’s background.
-when your code deals with matrix multiplication or similar operations, explain it using actual matrices with real numbers. don't just talk theory-show a concrete example that people can follow.
- Use Markdown for structure: - Headings (e.g., #, ##) - Lists (e.g., *, -) - Code blocks (\`\`\`language ... \`\`\`)
Output Rules: - first write the exact part of that code or paper you are explaining as it is and then start the explaination
- Output only your explanation for Chapter ${targetChapterNumber}.
- No introductions or summaries like “Let’s dive in…” or “That wraps up…” - No mention of the prompt or instructions.
Full Document:
---
${fullContent}
---
Your Explanation for Chapter ${targetChapterNumber} ("${targetChapterInfo.title}"):
`;

    const chapterContent: string = await callGemini(prompt);
    const responseBody: GenerateChapterResponse = { chapterContent };
    return NextResponse.json(responseBody);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(
      `Error generating content for chapter ${targetChapterNumber}:`,
      error,
    );
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json(
      { error: `Failed to process request: ${errorMessage}` },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
