"use server";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  invalidateSession,
  type SessionValidationResult,
  validateSessionToken,
} from "@/lib/auth";
import { globalPOSTRateLimit } from "@/lib/requests";
import { deleteSessionTokenCookie } from "@/lib/session";

export const getCurrentSession = cache(
  async (): Promise<SessionValidationResult> => {
    const token = (await cookies()).get("session")?.value ?? null;
    if (token === null) {
      return {
        session: null,
        user: null,
      };
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
  if (session === null)
    return {
      message: "Not authenticated",
      success: false,
    };

  if (!(await globalPOSTRateLimit())) {
    return {
      message: "Too many requests",
      success: false,
    };
  }
  try {
    await invalidateSession(session.id);
    await deleteSessionTokenCookie();
    return {
      success: true,
      message: "Logged Out",
    };
  } catch (e) {
    return {
      message: `Error LoggingOut ${e}`,
      success: false,
    };
  }
};
