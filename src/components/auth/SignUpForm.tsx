"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { SocialAuth } from "@/components/auth/SocialAuth";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import { signUpSchema } from "@/lib/validation";

function nameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "Friend";
  const spaced = local.replace(/[._-]+/g, " ").trim();
  if (!spaced) return "Friend";
  return spaced.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setNotice(null);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const parsed = signUpSchema.safeParse({
      email,
      password,
      fullName: nameFromEmail(email),
    });
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        nextErrors[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: { full_name: parsed.data.fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signUpError) throw signUpError;
      if (!data.session) {
        setNotice("Check your email to confirm your account, then sign in.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(friendlyError(err, "Could not create your account."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Sign Up">
      <form action={onSubmit} className="space-y-5">
        <TextField
          underline
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          error={fieldErrors.email}
        />
        <TextField
          underline
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          error={fieldErrors.password}
        />
        {error ? <p className="text-sm text-splits-red">{error}</p> : null}
        {notice ? <p className="text-sm text-splits-ink">{notice}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Creating account…" : "Sign Up"}
        </Button>
      </form>
      <p className="mt-6 text-center text-[13px] font-medium text-splits-red">
        Dont have an Account?{" "}
        <Link href="/sign-in" className="font-semibold">
          Sign In!
        </Link>
      </p>
      <SocialAuth onError={setError} />
    </AuthShell>
  );
}
