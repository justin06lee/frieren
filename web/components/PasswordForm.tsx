"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword } from "@/lib/actions";
import type { ActionState } from "@/lib/types";
import SubmitButton from "./SubmitButton";
import { Flash, input } from "./ui";

export default function PasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(changePassword, {});
  const form = useRef<HTMLFormElement>(null);

  // Don't leave the old password sitting in the fields once it's been changed.
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state.ok]);

  return (
    <form ref={form} action={action} className="max-w-md space-y-4">
      <Flash error={state.error} ok={state.ok} />

      <div className="space-y-1.5">
        <label htmlFor="current" className="block text-sm font-semibold">
          Current password
        </label>
        <input
          id="current"
          name="current"
          type="password"
          autoComplete="current-password"
          required
          className={input}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="next" className="block text-sm font-semibold">
          New password
        </label>
        <input
          id="next"
          name="next"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={input}
        />
        <p className="text-xs text-mute">At least 8 characters. Spaces are allowed.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm" className="block text-sm font-semibold">
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={input}
        />
      </div>

      <SubmitButton pending="Updating…">Update password</SubmitButton>

      <p className="text-xs text-mute">
        Changing your password signs out every other session, but keeps this one.
      </p>
    </form>
  );
}
