import { DatabaseError } from "pg";
import { db } from "./db";
import type { User } from "./db/types";

export async function createUser(
  googleId: string,
  email: string,
  name: string,
  picture: string,
): Promise<User> {
  try {
    const res = await db.query<User>(
      `INSERT INTO users (google_id, email, name, picture, last_login_at, last_active_at, session_count)
       VALUES ($1, $2, $3, $4, NOW(), NOW(), 1)
       RETURNING id, google_id, email, name, picture, last_login_at, last_active_at, session_count`,
      [googleId, email, name, picture],
    );

    return res.rows[0];
  } catch (error) {
    if (error instanceof DatabaseError && error.code === "23505") {
      console.error("Unique constraint violation:", error.detail);
      throw new Error("A user with this Google ID or email already exists");
    }
    throw error;
  }
}

export async function getUserFromGoogleId(
  googleId: string,
): Promise<User | null> {
  try {
    const res = await db.query<User>(
      `SELECT id, google_id, email, name, picture, last_login_at, last_active_at, session_count
       FROM users
       WHERE google_id = $1
       LIMIT 1`,
      [googleId],
    );

    const user = res.rows[0];

    return user ?? null;
  } catch (error) {
    console.error("Error fetching user by Google ID:", error);
    throw error;
  }
}
