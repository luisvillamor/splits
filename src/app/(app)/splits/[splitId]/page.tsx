import Link from "next/link";
import { notFound } from "next/navigation";
import { SplitWorkspace } from "@/components/splits/SplitWorkspace";
import { Button } from "@/components/ui/Button";
import { getCurrentProfile, getSplitBundle } from "@/lib/data";

export default async function SplitPage({
  params,
}: {
  params: Promise<{ splitId: string }>;
}) {
  const { splitId } = await params;
  const [{ user }, bundle] = await Promise.all([
    getCurrentProfile(),
    getSplitBundle(splitId),
  ]);

  if (!bundle || !user) notFound();

  const isParticipant = bundle.participants.some((item) => item.user_id === user.id);
  if (!isParticipant) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-10 text-center">
        <h1 className="text-2xl font-extrabold">You&apos;re not in this Split</h1>
        <p className="text-sm text-splits-muted">
          {bundle.split.emoji} {bundle.split.name} is only for the people who were
          added to this session.
        </p>
        <Link href={`/groups/${bundle.group.id}`} className="block">
          <Button>Back to {bundle.group.name}</Button>
        </Link>
      </div>
    );
  }

  return <SplitWorkspace initial={bundle} currentUserId={user.id} />;
}
