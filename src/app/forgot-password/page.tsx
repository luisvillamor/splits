"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

export default function ForgotPasswordPage() {
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        String(formData.get("email") ?? ""),
        { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
      );
      if (resetError) throw resetError;
      setNotice("If that email is in Splits, a reset link is on the way.");
    } catch (err) {
      setError(friendlyError(err, "Could not send a reset email."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Forgot Password">
      <form action={onSubmit} className="space-y-5">
        <TextField underline label="Email" name="email" type="email" required />
        {error ? <p className="text-sm text-splits-red">{error}</p> : null}
        {notice ? <p className="text-sm text-splits-ink">{notice}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/sign-in" className="font-bold text-splits-red">
          Back to Sign In
        </Link>
      </p>
    </AuthShell>
  );
}
