"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSplitAction } from "@/actions/groups";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { SPLIT_EMOJIS } from "@/lib/format";

export function NewSplitForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [emoji, setEmoji] = useState("🍕");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    formData.set("emoji", emoji);
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
        Everyone in the group is added automatically. You can lock the bill later.
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
        {error ? <p className="text-sm text-splits-red">{error}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create Split"}
        </Button>
      </form>
    </div>
  );
}
