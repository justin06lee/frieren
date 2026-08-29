"use client";

import { useActionState } from "react";
import { claimSeat, releaseSeat } from "@/lib/actions";
import type { ActionState } from "@/lib/types";
import SubmitButton from "./SubmitButton";
import { Flash, btnDanger, input } from "./ui";

export function ClaimSeatForm() {
  const [state, action] = useActionState<ActionState, FormData>(claimSeat, {});

  return (
    <form action={action} className="max-w-md space-y-4">
      <Flash error={state.error} ok={state.ok} />

      <div className="space-y-1.5">
        <label htmlFor="seat-username" className="block text-sm font-semibold">
          Username
        </label>
        <input
          id="seat-username"
          name="username"
          required
          pattern="[A-Za-z0-9][A-Za-z0-9-]*"
          className={input}
        />
        <p className="text-xs text-mute">Letters, digits and dashes.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="seat-name" className="block text-sm font-semibold">
          Display name <span className="font-normal text-mute">(optional)</span>
        </label>
        <input id="seat-name" name="name" className={input} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="seat-password" className="block text-sm font-semibold">
          Password
        </label>
        <input
          id="seat-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={input}
        />
      </div>

      <SubmitButton pending="Configuring…">Configure seat</SubmitButton>
    </form>
  );
}

export function ReleaseSeatForm({ username }: { username: string }) {
  const [state, action] = useActionState<ActionState, FormData>(releaseSeat, {});

  return (
    <form action={action} className="space-y-3">
      <Flash error={state.error} ok={state.ok} />
      <input type="hidden" name="username" value={username} />
      <SubmitButton className={btnDanger} pending="Releasing…">
        Release this seat
      </SubmitButton>
    </form>
  );
}
