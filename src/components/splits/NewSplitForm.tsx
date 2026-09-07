"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSplitAction } from "@/actions/groups";
import { MemberPicker, type PickerMember } from "@/components/groups/MemberPicker";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { SPLIT_EMOJIS } from "@/lib/format";

export function NewSplitForm({
  groupId,
  currentUserId,
  members,
}: {
  groupId: string;
  currentUserId: string;
  members: PickerMember[];
}) {
  const router = useRouter();
  const [emoji, setEmoji] = useState("🍕");
  const [mode, setMode] = useState<"everyone" | "selected">("everyone");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    members.map((member) => member.userId),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    formData.set("emoji", emoji);
    formData.set("participantMode", mode);
    if (mode === "selected") {
      for (const id of selectedIds) {
        formData.append("participantIds", id);
      }
    }
    const result = await createSplitAction(groupId, formData);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.replace(`/splits/${result.data.id}`);
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-3xl font-extrabold">New Split</h1>
      <p className="text-sm text-splits-muted">
        Choose who was actually there. People who stay in the group but skip this
        night will not be on the bill.
      </p>
      <form action={onSubmit} className="space-y-4 rounded-[28px] bg-white p-5">
        <div>
          <p className="mb-2 text-sm font-medium">Icon</p>
          <div className="flex flex-wrap gap-2">
            {SPLIT_EMOJIS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setEmoji(item)}
                className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${
                  emoji === item ? "bg-splits-red text-white" : "bg-splits-soft"
                }`}
                aria-label={`Choose ${item}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <TextField label="Split name" name="name" placeholder="Dinner" required />
        <TextField
          label="Date"
          name="occurredOn"
          type="date"
          defaultValue={today}
          required
        />
        <div>
          <p className="mb-2 text-sm font-medium">Who is in this Split?</p>
          <div className="flex gap-2">
            {(
              [
                ["everyone", "Everyone"],
                ["selected", "Selected members"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  if (value === "selected") {
                    setSelectedIds((ids) =>
                      Array.from(new Set([currentUserId, ...ids])),
                    );
                  }
                }}
                className={`min-h-11 flex-1 rounded-full text-sm font-semibold ${
                  mode === value
                    ? "bg-splits-red text-white"
                    : "bg-splits-soft text-splits-red"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === "everyone" ? (
            <p className="mt-2 text-sm text-splits-muted">
              All {members.length} current group members will be added.
            </p>
          ) : (
            <div className="mt-3 rounded-[20px] bg-[#fff8f8] p-3">
              <MemberPicker
                members={members}
                selectedIds={selectedIds}
                lockedIds={[currentUserId]}
                onChange={setSelectedIds}
              />
            </div>
          )}
        </div>
        {error ? <p className="text-sm text-splits-red">{error}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create Split"}
        </Button>
      </form>
    </div>
  );
}
