"use client";

import { useActionState, useState } from "react";
import { updateRepoSettings } from "@/lib/actions";
import type { ActionState } from "@/lib/types";
import SubmitButton from "./SubmitButton";
import { Flash, btn, btnDanger, input } from "./ui";

export function DescriptionForm({ repo, description }: { repo: string; description: string }) {
  const [state, action] = useActionState<ActionState, FormData>(updateRepoSettings, {});

  return (
    <form action={action} className="max-w-xl space-y-3">
      <Flash error={state.error} ok={state.ok} />
      <input type="hidden" name="repo" value={repo} />
      <label htmlFor="description" className="block text-sm font-semibold">
        Description
      </label>
      <input
        id="description"
        name="description"
        defaultValue={description}
        placeholder="Short description of this repository"
        className={input}
      />
      <p className="text-xs text-mute">
        Stored in the repository&apos;s own <code className="font-mono">description</code>{" "}
        file, the same one git uses.
      </p>
      <SubmitButton className={btn} pending="Saving…">
        Save
      </SubmitButton>
    </form>
  );
}

export function VisibilityForm({ repo, isPrivate }: { repo: string; isPrivate: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(updateRepoSettings, {});
  const [choice, setChoice] = useState(isPrivate ? "private" : "public");
  const changed = (choice === "private") !== isPrivate;

  return (
    <form action={action} className="space-y-4">
      <Flash error={state.error} ok={state.ok} />
      <input type="hidden" name="repo" value={repo} />

      <fieldset className="space-y-3">
        <legend className="sr-only">Repository visibility</legend>

        {(
          [
            {
              value: "public",
              title: "Public",
              blurb: "Anyone who can reach this archive can browse and clone it.",
            },
            {
              value: "private",
              title: "Private",
              blurb:
                "Hidden from guests everywhere — the list, the API, the built-in web UI, and git clone.",
            },
          ] as const
        ).map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer gap-3 rounded-md border p-3 transition-colors ${
              choice === option.value ? "border-link bg-link/5" : "border-line hover:bg-hover"
            }`}
          >
            <input
              type="radio"
              name="private"
              value={option.value}
              checked={choice === option.value}
              onChange={() => setChoice(option.value)}
              className="mt-1 accent-[color:var(--color-link)]"
            />
            <span>
              <span className="block text-sm font-semibold">{option.title}</span>
              <span className="block text-xs text-mute">{option.blurb}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <SubmitButton className={changed ? btnDanger : btn} pending="Applying…">
        {changed
          ? `Make this repository ${choice}`
          : `Already ${choice}`}
      </SubmitButton>
    </form>
  );
}
