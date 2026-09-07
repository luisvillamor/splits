import { notFound } from "next/navigation";
import { NewSplitForm } from "@/components/splits/NewSplitForm";
import { getCurrentProfile, getGroup } from "@/lib/data";

export default async function NewSplitPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const [{ user }, data] = await Promise.all([
    getCurrentProfile(),
    getGroup(groupId),
  ]);
  if (!user || !data) notFound();

  return (
    <NewSplitForm
      groupId={groupId}
      currentUserId={user.id}
      members={data.members.map((member) => ({
        userId: member.user_id,
        name: member.profile.full_name,
        avatarUrl: member.profile.avatar_url,
      }))}
    />
  );
}
