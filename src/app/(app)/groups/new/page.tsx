"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createGroupAction } from "@/actions/groups";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

export default function NewGroupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await createGroupAction(formData);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.replace(`/groups/${result.data.id}`);
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-3xl font-extrabold">Create a Group</h1>
      <p className="text-sm text-splits-muted">
        Groups are permanent. Create one for the friend circle, then start Splits
        whenever you go out.
      </p>
      <form action={onSubmit} className="space-y-4 rounded-[28px] bg-white p-5">
        <TextField label="Group name" name="name" placeholder="Boiz" required />
        {error ? <p className="text-sm text-splits-red">{error}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create Group"}
        </Button>
      </form>
    </div>
  );
}
