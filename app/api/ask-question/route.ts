import { NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import { getCurrentSession } from "@/app/actions";
import { db } from "@/lib/db";
import type { ChapterIndexItem, ChapterIndexItemDB } from "@/lib/db/types";

export interface QAItem {
  question: string;
  answer: string;
}

interface AskQuestionRequest {
  conversationId: number;
  fullContent: string;
  generatedChapters: Record<string | number, string>;
  qaHistory: QAItem[];
  userQuestion: string;
  userBackground: string;
}

export interface AskQuestionResponse {
  answer: string;
}

export async function POST(request: Request) {
  const { session, user } = await getCurrentSession();
  if (!session || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user.id;

  let requestBody: AskQuestionRequest;
  try {
    requestBody = (await request.json()) as AskQuestionRequest;
    if (typeof requestBody.conversationId !== "number") {
      return NextResponse.json(
        { error: "'conversationId' must be a number." },
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
      typeof requestBody.generatedChapters !== "object" ||
      requestBody.generatedChapters === null
    ) {
      return NextResponse.json(
        { error: "'generatedChapters' must be an object." },
        { status: 400 },
      );
    }
    if (!Array.isArray(requestBody.qaHistory)) {
      return NextResponse.json(
        { error: "'qaHistory' must be an array." },
        { status: 400 },
      );
    }
    if (
      !requestBody.userQuestion ||
      typeof requestBody.userQuestion !== "string" ||
      requestBody.userQuestion.trim() === ""
    ) {
      return NextResponse.json(
        { error: "'userQuestion' is required and must be non-empty." },
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
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to parse request body." },
      { status: 400 },
    );
  }

  const {
    conversationId,
    fullContent,
    generatedChapters,
    qaHistory,
    userQuestion,
    userBackground,
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
    const index: ChapterIndexItem[] = indexResult.rows.map((row) => ({
      chapter: row.chapter_number,
      title: row.title,
    }));

    const indexJsonString = JSON.stringify(index, null, 2);
    let chaptersContext = "No chapters generated yet.";
    const chapterNumbers = Object.keys(generatedChapters)
      .map((numStr) => Number.parseInt(numStr, 10))
      .filter((num) => !Number.isNaN(num))
      .sort((a, b) => a - b);
    if (chapterNumbers.length > 0) {
      const relevantTitles: Record<number, string> = {};
      for (const item of index) {
        relevantTitles[item.chapter] = item.title;
      }
      const chapterContentParts = chapterNumbers.map((num) => {
        const title = relevantTitles[num] || `Chapter ${num}`;
        const content =
          generatedChapters[num] ||
          generatedChapters[String(num)] ||
          "[Content not found]";
        const truncatedContent =
          content.length > 500 ? `${content.substring(0, 500)}...` : content;
        return `Chapter ${num} ("${title}") Summary:\n${truncatedContent}\n---`;
      });
      chaptersContext = `Generated Chapter Content Summary:\n${chapterContentParts.join("\n")}`;
    }

    const maxHistoryItems = 5;
    const recentHistory = qaHistory.slice(-maxHistoryItems);
    const historyJsonString = JSON.stringify(
      recentHistory.map((item) => ({
        User: item.question,
        Assistant: item.answer,
      })),
      null,
      2,
    );
    const historyContext =
      recentHistory.length > 0
        ? `Recent Conversation History:\n${historyJsonString}`
        : "No previous conversation history.";

    const prompt = `
Act as a helpful and knowledgeable AI teaching assistant. You are answering a question from a learner whose background is: "${userBackground}".
Your task is to answer the user's question accurately and clearly, explaining concepts in a way the learner can understand.

**Prioritize information found within the provided context below**, especially when the question is specifically about the document's content. However, you **may use your general knowledge** to provide broader context or answer more general questions (like asking about other common architectures) if the provided document doesn't cover it or is limited.

**Formatting Rules:**
1.  Ensure all actual programming code snippets, command outputs, and data structure examples (like tensors) are enclosed in triple backticks (\`\`\`) with their respective language (e.g., \`\`\`python ... \`\`\`).
2.  **CRITICAL Formatting Rule for Math:**
    - ALL mathematical variables, symbols, equations, and formulas MUST be enclosed in standard LaTeX delimiters.
    - Use single dollar signs (\`$ ... $\`) for inline math (like \`$V = (1/3) \\pi R^2 H$\`).
    - Use double dollar signs (\`$$ ... $$\`) for display/block math (like \`$$ V = \\int_{0}^{H} \\pi \\left(\\frac{R}{H} y\\right)^2 dy $$\`).
    - Do NOT use Unicode math symbols like π, ∫, ∑, ², ³ directly in the text. Use the LaTeX equivalents (e.g., \`\\pi\`, \`\\int\`, \`\\sum\`, \`^2\`, \`^3\`).
    - Do NOT put mathematical formulas inside Markdown code blocks (\`\`\`) unless you are showing actual programming code that *calculates* the math. Regular formulas should use \`$ ... $\` or \`$$ ... $$\`.

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
Now, answer the following user question. Remember your role as a teacher, consider the learner's background, and strictly follow all formatting rules above.

**User Question:** ${userQuestion}

**Your Answer (as a helpful teacher. Answer directly without introductory phrases like "Okay, let's look..." or "Sure, I can help..."):**
`;

    const answer: string = await callGemini(prompt);
    console.log("Raw AI Answer (JSON Stringified):\n", JSON.stringify(answer));
    await Promise.all([
      client.query(
        `INSERT INTO messages (conversation_id, sender, content, created_at)
          VALUES ($1, 'user', $2, NOW())`,
        [conversationId, userQuestion],
      ),
      client.query(
        `INSERT INTO messages (conversation_id, sender, content, created_at)
         VALUES ($1, 'ai', $2, NOW())`,
        [conversationId, answer],
      ),
    ]);

    await client.query("COMMIT");

    const responseBody: AskQuestionResponse = { answer };
    return NextResponse.json(responseBody);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error asking question or saving messages:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json(
      { error: `Failed to get answer: ${errorMessage}` },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
