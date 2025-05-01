import { NextResponse } from "next/server";
import { callGeminiForJson } from "@/lib/gemini";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/app/actions";
import type { Conversation, ChapterIndexItem } from "@/lib/db/types";

interface GenerateIndexRequest {
  content: string;
  userBackground: string;
}

export interface GenerateIndexApiResponse {
  index: ChapterIndexItem[];
  conversationId: number;
}

export type GenerateIndexResponseData = ChapterIndexItem[];

export async function POST(request: Request) {
  const { session, user } = await getCurrentSession();
  if (!session || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user.id;

  let requestBody: GenerateIndexRequest;
  try {
    requestBody = (await request.json()) as GenerateIndexRequest;
    if (
      !requestBody ||
      typeof requestBody.content !== "string" ||
      requestBody.content.trim() === ""
    ) {
      return NextResponse.json({ error: "Invalid 'content'" }, { status: 400 });
    }
    if (
      !requestBody.userBackground ||
      typeof requestBody.userBackground !== "string" ||
      requestBody.userBackground.trim() === ""
    ) {
      return NextResponse.json(
        { error: "Invalid 'userBackground'" },
        { status: 400 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to parse request body." },
      { status: 400 },
    );
  }

  const { content, userBackground } = requestBody;

  const prompt = `
Analyze the document below and extract logical learning units (chapters) as if you're designing the **index of a beginner-friendly book**.
Context: - The material should be structured for someone with this background: "${userBackground}"
- The book starts from **first principles** and builds up concepts gradually.
- Aim to create **25–40 chapters** to cover the material thoroughly but in digestible units.
Instructions: - Treat the document as educational material (code, research paper, etc.).
- Output a **JSON array** of objects with: "chapter" (number, starting from 1), "title" (concise, clearly reflects the topic of that chapter)
Constraints: - Titles must aid structured learning and reflect progressive understanding.
- No explanations, no markdown, no text before/after the JSON.
Document:
---
${content}
---
JSON Output:
`;

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const indexData: GenerateIndexResponseData =
      await callGeminiForJson<GenerateIndexResponseData>(prompt);

    if (
      !Array.isArray(indexData) ||
      indexData.length === 0 ||
      indexData.some(
        (item) =>
          typeof item.chapter !== "number" || typeof item.title !== "string",
      )
    ) {
      console.error("Gemini returned invalid index data:", indexData);
      throw new Error("Received invalid or empty index structure from AI.");
    }

    const conversationResult = await client.query<Conversation>(
      `INSERT INTO conversations (user_id, original_content, user_background, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [userId, content, userBackground],
    );

    const newConversationId = conversationResult.rows[0]?.id;
    if (!newConversationId) {
      throw new Error("Failed to insert conversation into database.");
    }

    const insertPromises = indexData.map((item) =>
      client.query(
        `INSERT INTO chapter_index_items (conversation_id, chapter_number, title)
         VALUES ($1, $2, $3)`,
        [newConversationId, item.chapter, item.title],
      ),
    );

    await Promise.all(insertPromises);

    await client.query("COMMIT");

    const responseBody: GenerateIndexApiResponse = {
      index: indexData,
      conversationId: newConversationId,
    };
    return NextResponse.json(responseBody);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error generating index or saving conversation:", error);
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
