import { notFound } from "next/navigation";
import { SplitWorkspace } from "@/components/splits/SplitWorkspace";
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

  return <SplitWorkspace initial={bundle} currentUserId={user.id} />;
}
