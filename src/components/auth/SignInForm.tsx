"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { resolveLoginEmailAction } from "@/actions/profile";
import { AuthShell } from "@/components/auth/AuthShell";
import { SocialAuth } from "@/components/auth/SocialAuth";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { setRememberPreference } from "@/lib/auth/remember";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import { firstZodError, signInSchema } from "@/lib/validation";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);

  async function onSubmit(formData: FormData) {
    setError(null);
    const parsed = signInSchema.safeParse({
      identifier: String(formData.get("identifier") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setFieldErrors({ [String(issue.path[0])]: firstZodError(parsed.error) });
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const resolved = await resolveLoginEmailAction(parsed.data.identifier);
      if (!resolved.ok) {
        setError(resolved.error);
        return;
      }
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: resolved.data,
        password: parsed.data.password,
      });
      if (signInError) throw signInError;
      setRememberPreference(remember);
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(friendlyError(err, "Email/username or password is incorrect."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Sign In">
      <form action={onSubmit} className="space-y-5">
        <TextField
          underline
          label="Email / username"
          name="identifier"
          type="text"
          autoComplete="username"
          inputMode="email"
          required
          error={fieldErrors.identifier}
        />
        <div>
          <TextField
            underline
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            error={fieldErrors.password}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-splits-red">
              <input
                type="checkbox"
                name="remember"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="h-4 w-4 rounded border-[#c8c8c8] accent-splits-red"
              />
              Remember me
            </label>
            <Link href="/forgot-password" className="text-[13px] font-medium text-splits-red">
              Forgot Password?
            </Link>
          </div>
        </div>
        {error ? <p className="text-sm text-splits-red">{error}</p> : null}
        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? "Signing in…" : "Sign In"}
        </Button>
      </form>
      <p className="mt-6 text-center text-[13px] font-medium text-splits-red">
        Dont have an account?{" "}
        <Link href="/sign-up" className="font-semibold">
          Sign Up!
        </Link>
      </p>
      <SocialAuth next={next} onError={setError} />
    </AuthShell>
  );
}
