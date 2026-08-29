"use client";

import { useFormStatus } from "react-dom";
import { btnPrimary } from "./ui";

// Disables itself while its form's action is in flight, so a slow password
// derivation on the server can't be double-submitted.
export default function SubmitButton({
  children,
  pending: label,
  className = btnPrimary,
}: {
  children: React.ReactNode;
  pending?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? (label ?? "Working…") : children}
    </button>
  );
}
