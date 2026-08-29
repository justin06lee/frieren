import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";
import LoginForm from "@/components/LoginForm";
import { FrierenMark } from "@/components/icons";
import { panel } from "@/components/ui";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getViewer()) redirect("/");

  return (
    <div className="mx-auto w-full max-w-[340px] py-8">
      <div className="flex justify-center">
        <FrierenMark className="h-12 w-12 text-ink" />
      </div>
      <h1 className="mt-4 text-center text-2xl font-light">Sign in to frieren</h1>

      <div className={`mt-6 ${panel} px-4 py-5`}>
        <LoginForm />
      </div>

      <div className={`mt-4 ${panel} px-4 py-4 text-center text-sm text-mute`}>
        <p>
          There is no sign-up: this archive has two seats and no third.{" "}
          <Link href="/" className="text-link hover:underline">
            Continue as a guest
          </Link>{" "}
          to browse the public repositories.
        </p>
      </div>
    </div>
  );
}
