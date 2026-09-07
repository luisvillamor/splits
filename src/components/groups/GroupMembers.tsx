"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteGroupAction, removeGroupMemberAction } from "@/actions/groups";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { GroupMember, Profile } from "@/types/database";

export function GroupMembers({
  groupId,
  groupName,
  isOwner,
  members,
}: {
  groupId: string;
  groupName: string;
  isOwner: boolean;
  members: Array<GroupMember & { profile: Profile }>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<
    (GroupMember & { profile: Profile }) | null
  >(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function removeMember() {
    if (!removeTarget) return;
    setBusy(true);
    setError(null);
    const result = await removeGroupMemberAction(groupId, removeTarget.user_id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRemoveTarget(null);
    router.refresh();
  }

  async function deleteGroup() {
    setBusy(true);
    setError(null);
    const result = await deleteGroupAction(groupId);
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <>
      <section className="rounded-[28px] bg-white p-5">
        <h2 className="font-bold">Members</h2>
        <ul className="mt-3 space-y-3">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-2">
              <Avatar
                name={member.profile.full_name}
                id={member.user_id}
                src={member.profile.avatar_url}
                size="sm"
              />
              <span className="min-w-0 flex-1 text-sm font-medium">
                {member.profile.full_name}
                {member.role === "owner" ? (
                  <span className="ml-1 text-splits-muted">· owner</span>
                ) : null}
              </span>
              {isOwner && member.role !== "owner" ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-splits-red"
                  onClick={() => {
                    setError(null);
                    setRemoveTarget(member);
                  }}
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {error ? <p className="mt-3 text-sm text-splits-red">{error}</p> : null}
      </section>

      {isOwner ? (
        <section className="rounded-[28px] bg-white p-5">
          <h2 className="font-bold">Danger zone</h2>
          <p className="mt-1 text-sm text-splits-muted">
            Deleting {groupName} removes every Split, expense, and settlement in
            it. Members will lose access immediately.
          </p>
          <Button
            type="button"
            variant="danger"
            className="mt-4"
            onClick={() => {
              setError(null);
              setDeleteOpen(true);
            }}
          >
            Delete group
          </Button>
        </section>
      ) : null}

      <Sheet
        open={Boolean(removeTarget)}
        title="Remove this member?"
        onClose={() => {
          if (!busy) setRemoveTarget(null);
        }}
      >
        <p className="text-sm leading-6 text-splits-muted">
          {removeTarget?.profile.full_name} will lose access to this group and
          any open Splits. They will not be removed from finalized Splits, but
          they will not be able to open them.
        </p>
        <div className="mt-5 grid gap-2">
          <Button type="button" variant="danger" disabled={busy} onClick={removeMember}>
            {busy ? "Removing…" : "Remove from group"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => setRemoveTarget(null)}
          >
            Cancel
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={deleteOpen}
        title="Delete this group?"
        onClose={() => {
          if (!busy) setDeleteOpen(false);
        }}
      >
        <p className="text-sm leading-6 text-splits-muted">
          This permanently deletes {groupName}, including every Split session.
          This cannot be undone.
        </p>
        <div className="mt-5 grid gap-2">
          <Button type="button" variant="danger" disabled={busy} onClick={deleteGroup}>
            {busy ? "Deleting…" : "Delete group"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => setDeleteOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </Sheet>
    </>
  );
}
