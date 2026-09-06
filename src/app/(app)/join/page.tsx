"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { joinGroupAction } from "@/actions/groups";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

export default function JoinPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await joinGroupAction(String(formData.get("code") ?? ""));
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.replace(`/groups/${result.data.id}`);
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-3xl font-extrabold">Join a Group</h1>
      <p className="text-sm text-splits-muted">
        Enter the invite code from a friend. You&apos;ll see their group right after.
      </p>
      <form action={onSubmit} className="space-y-4 rounded-[28px] bg-white p-5">
        <TextField
          label="Invite code"
          name="code"
          placeholder="BOIZ7K2"
          autoCapitalize="characters"
          required
        />
        {error ? <p className="text-sm text-splits-red">{error}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Joining…" : "Join Group"}
        </Button>
      </form>
    </div>
  );
}
