import { redirect } from "next/navigation";
import { dec } from "@/lib/params";

// Branches and tags used to share one page. Keep the old URL working.
export default async function RefsPage({ params }: { params: Promise<{ repo: string }> }) {
  const repo = dec((await params).repo);
  redirect(`/${encodeURIComponent(repo)}/branches`);
}
