"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Avatar } from "@/components/ui/Avatar";
import type { Profile, SplitParticipant } from "@/types/database";

type Participant = SplitParticipant & { profile: Profile };

type Props = {
  currentUserId: string;
  isCreator: boolean;
  participants: Participant[];
  initial?: {
    name: string;
    amount: string;
    type: "individual" | "shared";
    participantIds: string[];
  };
  submitLabel: string;
  onSubmit: (input: {
    name: string;
    amount: string;
    type: "individual" | "shared";
    participantIds: string[];
  }) => Promise<string | null>;
};

export function ExpenseForm({
  currentUserId,
  isCreator,
  participants,
  initial,
  submitLabel,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [type, setType] = useState<"individual" | "shared">(initial?.type ?? "individual");
  const [selected, setSelected] = useState<string[]>(
    initial?.participantIds ?? [currentUserId],
  );
  const [assignee, setAssignee] = useState(initial?.participantIds[0] ?? currentUserId);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const allIds = participants.map((item) => item.user_id);
  const everyoneSelected =
    type === "shared" && allIds.every((id) => selected.includes(id));

  const shareHint = useMemo(() => {
    if (type !== "shared" || selected.length === 0 || !amount) return null;
    return `${selected.length} people`;
  }, [amount, selected.length, type]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const participantIds =
      type === "individual"
        ? [isCreator ? assignee : currentUserId]
        : selected;
    const message = await onSubmit({ name, amount, type, participantIds });
    if (message) setError(message);
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextField
        label="Item"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Carbonara"
        required
      />
      <TextField
        label="Price"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        inputMode="decimal"
        placeholder="280"
        required
      />
      <div>
        <p className="mb-2 text-sm font-medium">Type</p>
        <div className="grid grid-cols-2 gap-2">
          {(["individual", "shared"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={`min-h-11 rounded-full font-semibold capitalize ${
                type === value
                  ? "bg-splits-red text-white"
                  : "bg-splits-soft text-splits-red"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {type === "individual" ? (
        isCreator ? (
          <div>
            <p className="mb-2 text-sm font-medium">Assigned to</p>
            <div className="flex flex-wrap gap-2">
              {participants.map((participant) => (
                <button
                  key={participant.user_id}
                  type="button"
                  onClick={() => setAssignee(participant.user_id)}
                  className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium ${
                    assignee === participant.user_id
                      ? "bg-splits-red text-white"
                      : "bg-splits-soft"
                  }`}
                >
                  <Avatar
                    name={participant.profile.full_name}
                    id={participant.user_id}
                    size="sm"
                  />
                  {participant.profile.full_name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="rounded-2xl bg-splits-soft px-4 py-3 text-sm">
            Assigned to you. Only the Split creator can add someone else&apos;s
            individual order.
          </p>
        )
      ) : (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Shared by</p>
            <button
              type="button"
              className="text-sm font-semibold text-splits-red"
              onClick={() =>
                setSelected(everyoneSelected ? [currentUserId] : allIds)
              }
            >
              {everyoneSelected ? "Clear" : "Everyone"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {participants.map((participant) => {
              const checked = selected.includes(participant.user_id);
              return (
                <label
                  key={participant.user_id}
                  className={`flex min-h-12 items-center gap-2 rounded-2xl px-3 text-sm font-medium ${
                    checked ? "bg-splits-red text-white" : "bg-splits-soft"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => {
                      setSelected((current) =>
                        checked
                          ? current.filter((id) => id !== participant.user_id)
                          : [...current, participant.user_id],
                      );
                    }}
                  />
                  {participant.profile.full_name.split(" ")[0]}
                </label>
              );
            })}
          </div>
          {shareHint ? (
            <p className="mt-2 text-sm text-splits-muted">
              Split equally among {shareHint}.
            </p>
          ) : null}
        </div>
      )}

      {error ? <p className="text-sm text-splits-red">{error}</p> : null}
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
