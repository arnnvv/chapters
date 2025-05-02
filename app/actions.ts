"use server";

import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  invalidateSession,
  type SessionValidationResult,
  validateSessionToken,
} from "@/lib/auth";
import { globalGETRateLimit, globalPOSTRateLimit } from "@/lib/requests";
import { deleteSessionTokenCookie } from "@/lib/session";
import type {
  Conversation,
  ChapterIndexItem,
  ChapterIndexItemDB,
  Message,
} from "@/lib/db/types";
import type { QAItem } from "./api/ask-question/route";

export const getCurrentSession = cache(
  async (): Promise<SessionValidationResult> => {
    const token = (await cookies()).get("session")?.value ?? null;
    if (token === null) {
      return { session: null, user: null };
    }
    const result = await validateSessionToken(token);
    return result;
  },
);

export const signOutAction = async (): Promise<{
  message: string;
  success: boolean;
}> => {
  const { session } = await getCurrentSession();
  if (session === null) return { message: "Not authenticated", success: false };

  if (!(await globalPOSTRateLimit())) {
    return { message: "Too many requests", success: false };
  }
  try {
    await invalidateSession(session.id);
    await deleteSessionTokenCookie();
    return {
      success: true,
      message: "Logged Out",
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Unknown error";
    return { message: `Error LoggingOut: ${error}`, success: false };
  }
};

export type ConversationListItem = Pick<Conversation, "id" | "created_at"> & {
  preview: string;
};

export const getUserConversations = async (): Promise<
  | { success: true; conversations: ConversationListItem[] }
  | { success: false; error: string }
> => {
  const { session, user } = await getCurrentSession();
  if (!session || !user) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }
  const userId = user.id;

  if (!(await globalGETRateLimit())) {
    return { success: false, error: "Rate limit exceeded." };
  }

  try {
    const result = await db.query<
      Pick<Conversation, "id" | "original_content" | "created_at">
    >(
      `SELECT id, original_content, created_at
       FROM conversations
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId],
    );

    const conversations: ConversationListItem[] = result.rows.map((row) => ({
      id: row.id,
      created_at: row.created_at,
      preview:
        row.original_content.length > 60
          ? `${row.original_content.substring(0, 60).replace(/\s+/g, " ")}...`
          : row.original_content.replace(/\s+/g, " "),
    }));

    return {
      success: true,
      conversations,
    };
  } catch (error) {
    console.error("Error fetching user conversations:", error);
    return { success: false, error: "Database error fetching conversations." };
  }
};

export interface ConversationDetails {
  conversation: Omit<Conversation, "chapter_index">;
  index: ChapterIndexItem[];
  messages: QAItem[];
}

export const getConversationDetails = async (
  conversationId: number,
): Promise<
  | { success: true; details: ConversationDetails }
  | { success: false; error: string }
> => {
  const { session, user } = await getCurrentSession();
  if (!session || !user) {
    return { success: false, error: "Unauthorized" };
  }
  const userId = user.id;

  if (typeof conversationId !== "number") {
    return { success: false, error: "Invalid conversation ID." };
  }

  if (!(await globalGETRateLimit())) {
    return { success: false, error: "Rate limit exceeded." };
  }

  const client = await db.connect();
  try {
    // Fetch conversation, index, and messages within a transaction for consistency
    await client.query("BEGIN");

    // Fetch conversation basics and verify ownership
    const convResult = await client.query<Conversation>(
      `SELECT id, user_id, original_content, user_background, created_at
       FROM conversations
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [conversationId, userId],
    );

    if (convResult.rowCount === 0) {
      throw new Error("Conversation not found or access denied.");
    }
    const conversationData = convResult.rows[0];

    // Fetch index items
    const indexResult = await client.query<ChapterIndexItemDB>(
      `SELECT chapter_number, title
       FROM chapter_index_items
       WHERE conversation_id = $1
       ORDER BY chapter_number ASC`,
      [conversationId],
    );
    const indexItems: ChapterIndexItem[] = indexResult.rows.map((row) => ({
      chapter: row.chapter_number,
      title: row.title,
    }));

    // Fetch messages (QA history)
    const messagesResult = await client.query<Message>(
      `SELECT sender, content
        FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC`,
      [conversationId],
    );
    // Map messages to QAItem structure expected by the client state
    const qaHistory: QAItem[] = [];
    let currentQuestion: string | null = null;
    for (const msg of messagesResult.rows) {
      if (msg.sender === "user") {
        currentQuestion = msg.content;
      } else if (msg.sender === "ai" && currentQuestion !== null) {
        qaHistory.push({ question: currentQuestion, answer: msg.content });
        currentQuestion = null; // Reset for the next pair
      }
    }

    await client.query("COMMIT"); // Commit the transaction

    return {
      success: true,
      details: {
        conversation: conversationData,
        index: indexItems,
        messages: qaHistory, // Return the processed QA history
      },
    };
  } catch (error) {
    await client.query("ROLLBACK"); // Rollback on error
    console.error("Error fetching conversation details:", error);
    const message = error instanceof Error ? error.message : "Database error.";
    return { success: false, error: message };
  } finally {
    client.release(); // Ensure client is released
  }
};
