"use client";

import { useActionState } from "react";
import { signIn } from "@/lib/actions";
import type { ActionState } from "@/lib/types";
import SubmitButton from "./SubmitButton";
import { Flash, btnPrimary, input } from "./ui";

export default function LoginForm() {
  const [state, action] = useActionState<ActionState, FormData>(signIn, {});

  return (
    <form action={action} className="space-y-4">
      <Flash error={state.error} />

      <div className="space-y-1.5">
        <label htmlFor="username" className="block text-sm">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          autoFocus
          required
          className={input}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={input}
        />
      </div>

      <SubmitButton className={`${btnPrimary} w-full`} pending="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
