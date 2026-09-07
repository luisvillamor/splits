import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getMyGroups } from "@/lib/data";

export default async function NewSplitChooserPage() {
  const groups = await getMyGroups();

  if (groups.length === 1) {
    redirect(`/groups/${groups[0].id}/splits/new`);
  }

  if (groups.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-3xl font-extrabold">New Split</h1>
        <EmptyState
          title="Create a group first."
          body="A Split is one night out. It lives inside a Group, which is your friend circle."
          action={
            <Link href="/groups/new">
              <Button>Create Group</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold">New Split</h1>
        <p className="mt-2 text-sm text-splits-muted">
          Pick which group this night out is for.
        </p>
      </header>
      <ul className="space-y-3">
        {groups.map((group) => (
          <li key={group.id}>
            <Link
              href={`/groups/${group.id}/splits/new`}
              className="flex items-center gap-4 rounded-[28px] bg-white p-4 shadow-[0_8px_30px_rgba(220,31,46,0.05)]"
            >
              <Avatar name={group.name} id={group.id} src={group.avatar_url} />
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{group.name}</span>
                <span className="text-sm text-splits-muted">
                  {group.members.length} members
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
