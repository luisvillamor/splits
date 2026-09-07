"use client";

import { Avatar } from "@/components/ui/Avatar";

export type PickerMember = {
  userId: string;
  name: string;
  avatarUrl?: string | null;
};

export function MemberPicker({
  members,
  selectedIds,
  lockedIds = [],
  onChange,
}: {
  members: PickerMember[];
  selectedIds: string[];
  lockedIds?: string[];
  onChange: (ids: string[]) => void;
}) {
  const selected = new Set(selectedIds);
  const locked = new Set(lockedIds);

  function toggle(userId: string) {
    if (locked.has(userId)) return;
    if (selected.has(userId)) {
      onChange(selectedIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedIds, userId]);
    }
  }

  return (
    <ul className="space-y-2">
      {members.map((member) => {
        const checked = selected.has(member.userId) || locked.has(member.userId);
        const isLocked = locked.has(member.userId);
        return (
          <li key={member.userId}>
            <label
              className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 ${
                isLocked ? "bg-splits-soft" : "bg-white"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={isLocked}
                onChange={() => toggle(member.userId)}
                className="h-5 w-5 accent-[#C32A2A]"
              />
              <Avatar
                name={member.name}
                id={member.userId}
                src={member.avatarUrl}
                size="sm"
              />
              <span className="text-sm font-medium">
                {member.name}
                {isLocked ? (
                  <span className="ml-1 text-splits-muted">· you</span>
                ) : null}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
