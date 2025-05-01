import { cookies } from "next/headers";
import { generateState, google } from "@/lib/oauth";
import { globalGETRateLimit } from "@/lib/requests";
import { getCurrentSession } from "@/app/actions";

export async function GET(): Promise<Response> {
  const { session } = await getCurrentSession();
  if (session !== null)
    return new Response("Logged In", {
      status: 302,
      headers: {
        Location: "/",
      },
    });
  if (!(await globalGETRateLimit())) {
    return new Response("Too many requests", {
      status: 429,
    });
  }

  const state = generateState();
  const codeVerifier = generateState();
  const url = await google.createAuthorizationURL(state, codeVerifier, [
    "openid",
    "profile",
    "email",
  ]);

  (await cookies()).set("google_oauth_state", state, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    sameSite: "lax",
  });
  (await cookies()).set("google_code_verifier", codeVerifier, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    sameSite: "lax",
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
    },
  });
}
