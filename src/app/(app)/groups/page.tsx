import Link from "next/link";
import { getMyGroups } from "@/lib/data";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { formatPeso } from "@/lib/money";

export default async function GroupsPage() {
  const groups = await getMyGroups();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">Groups</h1>
        <Link href="/groups/new">
          <Button className="w-auto px-5">New</Button>
        </Link>
      </div>
      {groups.length === 0 ? (
        <EmptyState
          title="No groups yet."
          body="Create your first friend group and start splitting expenses together."
          action={
            <Link href="/groups/new">
              <Button>Create Group</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                className="flex items-center gap-4 rounded-[28px] bg-white p-4 shadow-[0_8px_30px_rgba(220,31,46,0.05)]"
              >
                <Avatar name={group.name} id={group.id} src={group.avatar_url} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{group.name}</p>
                  <p className="text-sm text-splits-muted">
                    {group.members.length} members · {group.splitCount} splits
                  </p>
                </div>
                <p className="font-bold text-splits-red">{formatPeso(group.totalSpending)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
