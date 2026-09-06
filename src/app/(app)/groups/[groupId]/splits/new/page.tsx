import { NewSplitForm } from "@/components/splits/NewSplitForm";

export default async function NewSplitPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <NewSplitForm groupId={groupId} />;
}
