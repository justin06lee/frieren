"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiBase } from "./env";
import { clearSessionCookie, sessionToken, setSessionCookie } from "./session";
import type { ActionState } from "./types";

// Every write in the product goes through one of these. They talk to the
// backend with the viewer's session, so authorisation is decided there —
// nothing here is trusted to be the last word.

type Result = { ok: boolean; status: number; body: Record<string, unknown> };

async function post(path: string, payload: unknown): Promise<Result> {
  const base = apiBase();
  if (!base) return { ok: false, status: 0, body: { error: "No backend is configured." } };
  const token = await sessionToken();
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: { error: "The archive is unreachable right now." } };
  }
}

function reason(r: Result, fallback: string): string {
  return typeof r.body.error === "string" && r.body.error ? r.body.error : fallback;
}

export async function signIn(_prev: ActionState, form: FormData): Promise<ActionState> {
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!username || !password) return { error: "Enter your username and password." };

  const res = await post("/api/auth/login", { username, password });
  if (!res.ok) return { error: reason(res, "Incorrect username or password.") };
  await setSessionCookie(String(res.body.token));
  // redirect() signals by throwing, so it must sit outside the request above.
  redirect("/");
}

export async function signOut(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}

export async function changePassword(_prev: ActionState, form: FormData): Promise<ActionState> {
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (!current || !next) return { error: "Fill in both your current and new password." };
  if (next !== confirm) return { error: "The two new passwords don't match." };
  if (next.length < 8) return { error: "Your new password must be at least 8 characters." };
  if (next === current) return { error: "That's already your password." };

  const res = await post("/api/auth/password", { current, next });
  if (!res.ok) return { error: reason(res, "Could not change your password.") };
  // The backend retires sessions minted under the old password and returns a
  // replacement, so changing it doesn't sign you out of the tab you're in.
  if (typeof res.body.token === "string") await setSessionCookie(res.body.token);
  revalidatePath("/settings");
  return { ok: "Password updated." };
}

export async function claimSeat(_prev: ActionState, form: FormData): Promise<ActionState> {
  const username = String(form.get("username") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!username || !password) return { error: "A username and password are required." };
  if (password.length < 8) return { error: "The password must be at least 8 characters." };

  const res = await post("/api/auth/seats/claim", { username, name, password });
  if (!res.ok) return { error: reason(res, "Could not configure the seat.") };
  revalidatePath("/settings");
  return { ok: `Seat configured for ${username}.` };
}

export async function releaseSeat(_prev: ActionState, form: FormData): Promise<ActionState> {
  const username = String(form.get("username") ?? "").trim();
  const res = await post("/api/auth/seats/release", { username });
  if (!res.ok) return { error: reason(res, "Could not release the seat.") };
  revalidatePath("/settings");
  return { ok: "Seat released." };
}

export async function updateRepoSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  const repo = String(form.get("repo") ?? "");
  const payload: Record<string, unknown> = {};
  if (form.has("description")) payload.description = String(form.get("description") ?? "");
  if (form.has("private")) payload.private = form.get("private") === "private";

  const res = await post(`/api/repos/${encodeURIComponent(repo)}/settings`, payload);
  if (!res.ok) return { error: reason(res, "Could not save the repository settings.") };
  revalidatePath("/", "layout");
  return { ok: "Repository settings saved." };
}
