import Link from "next/link";
import { formatPeso } from "@/lib/money";
import { firstName, formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import {
  getCurrentProfile,
  getMyGroups,
  getOutstandingForUser,
} from "@/lib/data";

export default async function DashboardPage() {
  const { user, profile } = await getCurrentProfile();
  const groups = await getMyGroups();
  const outstanding = user ? await getOutstandingForUser(user.id) : [];
  const recentSplits = groups.flatMap((group) =>
    group.recentSplits.map((split) => ({
      ...split,
      groupName: group.name,
      groupId: group.id,
    })),
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-splits-muted">Welcome back</p>
        <h1 className="text-3xl font-extrabold text-splits-ink">
          Hi, {firstName(profile?.full_name ?? "there")}
        </h1>
        <p className="mt-1 text-sm text-splits-muted">
          Split dinner with friends without the group-chat math.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/groups/new">
          <Button>Create a Group</Button>
        </Link>
        <Link href={groups[0] ? `/groups/${groups[0].id}/splits/new` : "/groups/new"}>
          <Button variant="secondary">New Split</Button>
        </Link>
      </div>

      {outstanding.length > 0 ? (
        <section className="rounded-[28px] bg-white p-5 shadow-[0_12px_40px_rgba(220,31,46,0.06)]">
          <h2 className="text-lg font-bold">Still to pay</h2>
          <ul className="mt-3 space-y-3">
            {outstanding.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/splits/${item.splitId}`}
                  className="flex items-center justify-between rounded-2xl bg-splits-soft px-4 py-3"
                >
                  <span>
                    <span className="block font-semibold">
                      {item.emoji} {item.splitName}
                    </span>
                    <span className="text-sm text-splits-muted">{item.groupName}</span>
                  </span>
                  <span className="font-bold text-splits-red">
                    {formatPeso(item.amount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Your groups</h2>
          <Link href="/groups" className="text-sm font-semibold text-splits-red">
            See all
          </Link>
        </div>
        {groups.length === 0 ? (
          <EmptyState
            title="No groups yet."
            body="Create your first friend group and start splitting expenses together."
            action={
              <Link href="/groups/new" className="inline-flex">
                <Button className="w-auto px-8">Create Group</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="rounded-[28px] bg-white p-5 shadow-[0_12px_40px_rgba(220,31,46,0.06)]"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={group.name} id={group.id} src={group.avatar_url} />
                  <div>
                    <p className="font-bold">{group.name}</p>
                    <p className="text-sm text-splits-muted">
                      {group.members.length} members · {group.splitCount} splits
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-splits-muted">Total spending</p>
                <p className="text-xl font-extrabold text-splits-red">
                  {formatPeso(group.totalSpending)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Recent splits</h2>
        {recentSplits.length === 0 ? (
          <EmptyState
            title="No splits yet."
            body="Start a Split when you and your friends go out."
          />
        ) : (
          <ul className="space-y-3">
            {recentSplits.slice(0, 6).map((split) => (
              <li key={split.id}>
                <Link
                  href={`/splits/${split.id}`}
                  className="flex items-center justify-between rounded-[24px] bg-white px-4 py-4 shadow-[0_8px_30px_rgba(220,31,46,0.05)]"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-splits-soft text-xl">
                      {split.emoji}
                    </span>
                    <span>
                      <span className="block font-semibold">{split.name}</span>
                      <span className="text-sm text-splits-muted">
                        {split.groupName} · {formatDate(split.occurred_on)}
                      </span>
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-splits-red">
                    {split.status === "finalized" ? "Finalized" : "Open"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
