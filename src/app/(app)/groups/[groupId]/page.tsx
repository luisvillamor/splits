import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { InvitePanel } from "@/components/groups/InvitePanel";
import { getGroup } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { formatPeso } from "@/lib/money";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const data = await getGroup(groupId);
  if (!data) notFound();

  const { group, members, splits } = data;
  const finalized = splits.filter((split) => split.status === "finalized");
  const totalSpending = finalized.reduce((sum, split) => {
    const snapshot = split.snapshot as { grandTotal?: number } | null;
    return sum + (snapshot?.grandTotal ?? 0);
  }, 0);
  const average = finalized.length ? Math.round(totalSpending / finalized.length) : 0;

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-4">
        <Avatar name={group.name} id={group.id} src={group.avatar_url} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-extrabold">{group.name}</h1>
          <p className="text-sm text-splits-muted">{members.length} members</p>
        </div>
        <Link href={`/groups/${group.id}/splits/new`}>
          <Button className="w-auto px-5">New Split</Button>
        </Link>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <Stat label="Splits" value={String(splits.length)} />
        <Stat label="Total spending" value={formatPeso(totalSpending)} />
        <Stat label="Average split" value={formatPeso(average)} />
      </section>

      <section className="rounded-[28px] bg-white p-5">
        <h2 className="font-bold">Members</h2>
        <ul className="mt-3 flex flex-wrap gap-3">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-2">
              <Avatar
                name={member.profile.full_name}
                id={member.user_id}
                src={member.profile.avatar_url}
                size="sm"
              />
              <span className="text-sm font-medium">
                {member.profile.full_name}
                {member.role === "owner" ? (
                  <span className="ml-1 text-splits-muted">· owner</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <InvitePanel code={group.invite_code} groupName={group.name} />

      <section>
        <h2 className="mb-3 text-lg font-bold">Split sessions</h2>
        {splits.length === 0 ? (
          <EmptyState
            title="No splits yet."
            body="Start a Split when you and your friends go out."
            action={
              <Link href={`/groups/${group.id}/splits/new`}>
                <Button>Create Split</Button>
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {splits.map((split) => {
              const snapshot = split.snapshot as { grandTotal?: number } | null;
              return (
                <li key={split.id}>
                  <Link
                    href={`/splits/${split.id}`}
                    className="flex items-center justify-between rounded-[24px] bg-white px-4 py-4"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-splits-soft text-xl">
                        {split.emoji}
                      </span>
                      <span>
                        <span className="block font-semibold">{split.name}</span>
                        <span className="text-sm text-splits-muted">
                          {formatDate(split.occurred_on)}
                        </span>
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-bold text-splits-red">
                        {snapshot?.grandTotal ? formatPeso(snapshot.grandTotal) : "Open"}
                      </span>
                      <span className="text-xs font-semibold text-splits-muted">
                        {split.status === "finalized" ? "🔒 Finalized" : "Open"}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] bg-white p-4 text-center">
      <p className="text-lg font-extrabold text-splits-red">{value}</p>
      <p className="mt-1 text-[11px] font-medium text-splits-muted">{label}</p>
    </div>
  );
}
