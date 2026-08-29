import { cookies } from "next/headers";
import { cache } from "react";
import { apiBase } from "./env";
import type { Viewer } from "./types";

// The browser holds one opaque, http-only cookie: a session token minted by
// the backend. Every server render trades it for the viewer it belongs to.

export const SESSION_COOKIE = "frieren_session";
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export async function sessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

// getViewer resolves the signed-in user, or null for a guest. Cached per
// request so a page and its layout don't ask twice. A backend that is down
// makes everyone a guest rather than an error — public pages still render.
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const base = apiBase();
  const token = await sessionToken();
  if (!base || !token) return null;
  try {
    const res = await fetch(`${base}/api/auth/session`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { user: Viewer | null };
    return body.user ?? null;
  } catch {
    return null;
  }
});
