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

    const chapterInfoResult = await client.query<ChapterIndexItemDB>(
      `SELECT chapter_number, title, generated_content
       FROM chapter_index_items
       WHERE conversation_id = $1 AND chapter_number = $2
       LIMIT 1`,
      [conversationId, targetChapterNumber],
    );

    if (chapterInfoResult.rowCount === 0) {
      throw new Error(
        `Chapter number ${targetChapterNumber} not found for conversation ${conversationId}.`,
      );
    }

    const chapterInfo = chapterInfoResult.rows[0];

    if (chapterInfo.generated_content !== null) {
      client.release();
      return NextResponse.json({
        chapterContent: chapterInfo.generated_content,
      });
    }

    const indexResult = await client.query<ChapterIndexItemDB>(
      `SELECT chapter_number, title
         FROM chapter_index_items
         WHERE conversation_id = $1
         ORDER BY chapter_number ASC`,
      [conversationId],
    );

    const index: ChapterIndexItem[] = indexResult.rows.map((row) => ({
      chapter: row.chapter_number,
      title: row.title,
    }));

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
Your Task: - Teach only **Chapter ${targetChapterNumber}**: "${chapterInfo.title}"

**Formatting Rules:**
1.  Use standard Markdown for structure: Headings (e.g., #, ##), Lists (e.g., *, -), Bold/Italics.
2.  Ensure all actual programming code snippets, command outputs, and data structure examples (like tensors) are enclosed in triple backticks (\`\`\`) with their respective language (e.g., \`\`\`python ... \`\`\`).
3.  **CRITICAL Formatting Rule for Math:**
    - ALL mathematical variables, symbols, equations, and formulas MUST be enclosed in standard LaTeX delimiters.
    - Use single dollar signs (\`$ ... $\`) for inline math (like \`$V = (1/3) \\pi R^2 H$\`).
    - Use double dollar signs (\`$$ ... $$\`) for display/block math (like \`$$ V = \\int_{0}^{H} \\pi \\left(\\frac{R}{H} y\\right)^2 dy $$\`).
    - Do NOT use Unicode math symbols like π, ∫, ∑, ², ³ directly in the text. Use the LaTeX equivalents (e.g., \`\\pi\`, \`\\int\`, \`\\sum\`, \`^2\`, \`^3\`).
    - Do NOT put mathematical formulas inside Markdown code blocks (\`\`\`) unless you are showing actual programming code that *calculates* the math. Regular formulas should use \`$ ... $\` or \`$$ ... $$\`.

**Teaching Instructions:**
- Use the **Full Document** (provided below) as the primary source material for explaining the chapter's content.
- Use these references for context: - **Index**: ${indexJsonString} - **Summaries of earlier chapters**: ${previousChaptersContext}
- Infer which parts of the Full Document are relevant to **Chapter ${targetChapterNumber}**.
- Do not just copy text — explain and teach the concepts clearly.
- Break down complex ideas step-by-step.
- Explain the *purpose* or *why* behind code, algorithms, or theories relevant to this chapter.
- Use analogies and examples suitable for the learner’s background: "${userBackground}".
- When explaining operations like matrix multiplication, illustrate with concrete numerical examples if appropriate for the chapter content.

**Output Rules:**
- **Crucially:** Before explaining a specific section of the source text (code or paper paragraph), first quote that *exact* section using Markdown blockquotes (\`> ...\`). Then, provide your explanation immediately following the quote.
- Output only your explanation content specifically for **Chapter ${targetChapterNumber}**.
- Do NOT include any introductory or concluding phrases like “Let’s dive into Chapter X…” or “That concludes our look at…”.
- Do NOT mention this prompt or these instructions in your output.
- Strictly adhere to all **Formatting Rules** outlined above.

Full Document:
---
${fullContent}
---

Your Explanation for Chapter ${targetChapterNumber} ("${chapterInfo.title}"):
`;

    const newlyGeneratedContent: string = await callGemini(prompt);

    await client.query(
      `UPDATE chapter_index_items
         SET generated_content = $1
         WHERE conversation_id = $2 AND chapter_number = $3`,
      [newlyGeneratedContent, conversationId, targetChapterNumber],
    );

    const responseBody: GenerateChapterResponse = {
      chapterContent: newlyGeneratedContent,
    };
    return NextResponse.json(responseBody);
  } catch (error) {
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
