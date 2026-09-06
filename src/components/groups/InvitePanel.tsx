"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function InvitePanel({
  code,
  groupName,
}: {
  code: string;
  groupName: string;
}) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const link =
    typeof window === "undefined"
      ? `/join/${code}`
      : `${window.location.origin}/join/${code}`;

  async function copy(value: string, kind: "code" | "link") {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1600);
  }

  return (
    <section className="rounded-[28px] bg-white p-5">
      <h2 className="font-bold">Invite to {groupName}</h2>
      <p className="mt-1 text-sm text-splits-muted">
        Friends join with a code or link. Codes are random, not guessed from the group name.
      </p>
      <p className="mt-4 text-center text-3xl font-extrabold tracking-[0.25em] text-splits-red">
        {code}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button type="button" onClick={() => copy(code, "code")}>
          {copied === "code" ? "Copied code" : "Copy invite code"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => copy(link, "link")}>
          {copied === "link" ? "Copied link" : "Copy invite link"}
        </Button>
      </div>
    </section>
  );
}
