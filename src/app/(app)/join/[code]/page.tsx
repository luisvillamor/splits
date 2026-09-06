import { redirect } from "next/navigation";
import { joinGroupAction } from "@/actions/groups";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default async function JoinCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const result = await joinGroupAction(code);

  if (result.ok) {
    redirect(`/groups/${result.data.id}`);
  }

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-[28px] bg-white p-6 text-center">
      <h1 className="text-2xl font-extrabold">Could not join</h1>
      <p className="text-sm text-splits-muted">{result.error}</p>
      <Link href="/join">
        <Button>Try another code</Button>
      </Link>
    </div>
  );
}
