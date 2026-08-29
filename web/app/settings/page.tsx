import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSeats } from "@/lib/api";
import { getViewer } from "@/lib/session";
import { fullDate } from "@/lib/format";
import PasswordForm from "@/components/PasswordForm";
import { ClaimSeatForm, ReleaseSeatForm } from "@/components/SeatForms";
import { Avatar, panel } from "@/components/ui";
import { PersonIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const SECTIONS = [
  { id: "account", label: "Account" },
  { id: "password", label: "Password" },
  { id: "seats", label: "Seats" },
];

export default async function SettingsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const seats = (await getSeats().catch(() => null)) ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center gap-3 border-b border-hair pb-4">
        <Avatar name={viewer.username} size={40} />
        <div>
          <h1 className="text-2xl font-light leading-tight">{viewer.username}</h1>
          <p className="text-sm text-mute">
            Seat {viewer.seat}
            {viewer.owner ? " · owner of this archive" : ""}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-8 md:flex-row md:gap-10">
        <nav className="shrink-0 md:w-56">
          <ul className="flex gap-1 md:flex-col">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block rounded-md px-3 py-1.5 text-sm text-ink transition-colors hover:bg-raised"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1 space-y-10">
          <section id="account" className="scroll-mt-6">
            <h2 className="border-b border-hair pb-2 text-lg font-normal">Account</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-semibold">Username</dt>
                <dd className="mt-0.5 font-mono text-sm text-mute">{viewer.username}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold">Role</dt>
                <dd className="mt-0.5 text-sm text-mute">
                  {viewer.owner ? "Owner — full read and write" : "Member — reads everything"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold">Seat</dt>
                <dd className="mt-0.5 text-sm text-mute">
                  {viewer.seat} of 2
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold">Password last changed</dt>
                <dd className="mt-0.5 text-sm text-mute">
                  {viewer.passwordChangedAt ? fullDate(viewer.passwordChangedAt) : "unknown"}
                </dd>
              </div>
            </dl>
          </section>

          <section id="password" className="scroll-mt-6">
            <h2 className="border-b border-hair pb-2 text-lg font-normal">Change password</h2>
            <p className="mt-3 max-w-md text-sm text-mute">
              Two-factor authentication isn&apos;t set up on this archive, so your password
              is the only thing standing between a stranger and your private repositories.
            </p>
            <div className="mt-4">
              <PasswordForm />
            </div>
          </section>

          <section id="seats" className="scroll-mt-6">
            <h2 className="border-b border-hair pb-2 text-lg font-normal">Seats</h2>
            <p className="mt-3 max-w-xl text-sm text-mute">
              frieren has exactly two seats and no sign-up. Everyone holding one reads every
              repository, public or private; only the owner changes repository settings.
            </p>

            <ul className={`mt-4 ${panel} divide-y divide-hair`}>
              {seats.map((seat) => (
                <li key={seat.seat} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  {seat.configured ? (
                    <Avatar name={seat.username} size={32} />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-line text-faint">
                      <PersonIcon className="h-4 w-4" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {seat.configured ? seat.username : "Unconfigured"}
                      {seat.username === viewer.username && (
                        <span className="ml-2 rounded-full border border-line px-2 py-[1px] text-xs font-normal text-mute">
                          you
                        </span>
                      )}
                      {seat.owner && (
                        <span className="ml-2 rounded-full border border-link/40 px-2 py-[1px] text-xs font-normal text-link">
                          owner
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-mute">
                      Seat {seat.seat}
                      {seat.configured && seat.name && seat.name !== seat.username
                        ? ` · ${seat.name}`
                        : ""}
                      {!seat.configured && " · nobody can sign in with it yet"}
                    </p>
                  </div>
                  {viewer.owner && seat.configured && !seat.owner && (
                    <ReleaseSeatForm username={seat.username} />
                  )}
                </li>
              ))}
            </ul>

            {viewer.owner && seats.some((s) => !s.configured) && (
              <div className="mt-6">
                <h3 className="text-base font-semibold">Configure the spare seat</h3>
                <p className="mb-4 mt-1 max-w-md text-sm text-mute">
                  Give the second seat a username and password. Whoever holds it can sign in
                  and read everything, including private repositories.
                </p>
                <ClaimSeatForm />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
