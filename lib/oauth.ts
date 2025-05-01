import {
  decodeBase64urlIgnorePadding,
  encodeBase64urlNoPadding,
} from "./encoding";
import { Google } from "./google";

export function generateState(): string {
  const randomValues = new Uint8Array(32);
  crypto.getRandomValues(randomValues);
  return encodeBase64urlNoPadding(randomValues);
}

export function decodeIdToken(idToken: string): object {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid Token");
    }
    let jsonPayload: string;
    try {
      jsonPayload = new TextDecoder().decode(
        decodeBase64urlIgnorePadding(parts[1]),
      );
    } catch {
      throw new Error("Invalid Token: Invalid base64url encoding");
    }
    let payload: unknown;
    try {
      payload = JSON.parse(jsonPayload);
    } catch {
      throw new Error("Invalid Token: Invalid JSON encoding");
    }
    if (typeof payload !== "object" || payload === null) {
      throw new Error("Invalid Token: Invalid payload");
    }
    return payload as object;
  } catch (e) {
    throw new Error("Invalid ID token", {
      cause: e,
    });
  }
}

const getOAuthCredentials = (): {
  clientId: string;
  clientSecret: string;
  redirectURL: string;
} => {
  const clientIdEnv = process.env.GOOGLE_CLIENT_ID;
  const clientSecretEnv = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUrlEnv = process.env.GOOGLE_REDIRECT_URL;

  if (!clientIdEnv || clientIdEnv.length === 0)
    throw new Error("GOOGLE_CLIENT_ID missing");

  if (!clientSecretEnv || clientSecretEnv.length === 0)
    throw new Error("GOOGLE_CLIENT_SECRET missing");

  if (!redirectUrlEnv || redirectUrlEnv.length === 0)
    throw new Error("GOOGLE_REDIRECT_URL missing");

  return {
    clientId: clientIdEnv,
    clientSecret: clientSecretEnv,
    redirectURL: redirectUrlEnv,
  };
};

export const google = new Google(
  getOAuthCredentials().clientId,
  getOAuthCredentials().clientSecret,
  getOAuthCredentials().redirectURL,
);
