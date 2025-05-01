import { db } from "./db";
import type { User, Session } from "./db/types";
import { sha256 } from "./sha";
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from "./encoding";

export type SessionValidationResult =
  | { session: Session; user: User }
  | { session: null; user: null };

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const token = encodeBase32LowerCaseNoPadding(bytes);
  return token;
}

export async function createSession(
  token: string,
  userId: number,
): Promise<Session> {
  const sessionId = encodeHexLowerCase(
    await sha256(new TextEncoder().encode(token)),
  );
  const session: Session = {
    id: sessionId,
    user_id: userId,
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  };
  await db.query(
    "INSERT INTO oauthtry_sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
    [session.id, session.user_id, session.expires_at],
  );
  return session;
}

export async function validateSessionToken(
  token: string,
): Promise<SessionValidationResult> {
  "use cache";
  const sessionId = encodeHexLowerCase(
    await sha256(new TextEncoder().encode(token)),
  );

  const res = await db.query(
    `SELECT
       u.id as u_id, u.google_id, u.email, u.name, u.picture,
       s.id as s_id, s.user_id, s.expires_at
     FROM oauthtry_sessions s
     INNER JOIN oauthtry_users u ON s.user_id = u.id
     WHERE s.id = $1
     LIMIT 1`,
    [sessionId],
  );

  if (res.rowCount === 0) {
    return { session: null, user: null };
  }
  const row = res.rows[0];

  const session: Session = {
    id: row.s_id,
    user_id: row.user_id,
    expires_at: row.expires_at,
  };

  const user: User = {
    id: row.u_id,
    google_id: row.google_id,
    email: row.email,
    name: row.name,
    picture: row.picture,
  };

  const now = Date.now();
  const expiresAtMs = session.expires_at.getTime();

  if (now >= expiresAtMs) {
    await db.query("DELETE FROM oauthtry_sessions WHERE id = $1", [session.id]);
    return { session: null, user: null };
  }

  // Refresh if expiring in less than 15 days
  const fifteenDays = 1000 * 60 * 60 * 24 * 15;
  if (now >= expiresAtMs - fifteenDays) {
    const newExpiresAt = new Date(now + 1000 * 60 * 60 * 24 * 30);
    await db.query(
      "UPDATE oauthtry_sessions SET expires_at = $1 WHERE id = $2",
      [newExpiresAt, session.id],
    );
    session.expires_at = newExpiresAt;
  }

  return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.query("DELETE FROM oauthtry_sessions WHERE id = $1", [sessionId]);
}
