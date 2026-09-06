"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateUsernameAction } from "@/actions/profile";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

export function ProfileForm({
  userId,
  username,
  email,
  avatarUrl,
}: {
  userId: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameNotice, setNameNotice] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function saveUsername(formData: FormData) {
    setSavingName(true);
    setNameError(null);
    setNameNotice(null);
    const result = await updateUsernameAction(String(formData.get("username") ?? ""));
    if (!result.ok) setNameError(result.error);
    else {
      setNameNotice("Username updated.");
      router.refresh();
    }
    setSavingName(false);
  }

  async function savePassword(formData: FormData) {
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordNotice(null);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirmPassword") ?? "");
    if (password.length < 8) {
      setPasswordError("Use at least 8 characters.");
      setSavingPassword(false);
      return;
    }
    if (password !== confirm) {
      setPasswordError("Passwords do not match.");
      setSavingPassword(false);
      return;
    }
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPasswordNotice("Password updated.");
    } catch (error) {
      setPasswordError(friendlyError(error, "Could not update your password."));
    } finally {
      setSavingPassword(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header className="flex items-center gap-4">
        <Avatar name={username} id={userId} src={avatarUrl} size="lg" />
        <div>
          <h1 className="text-3xl font-extrabold">Profile</h1>
          <p className="text-sm text-splits-muted">{email}</p>
        </div>
      </header>

      <form action={saveUsername} className="space-y-4 rounded-[28px] bg-white p-5">
        <h2 className="font-bold">Username</h2>
        <TextField
          label="Username"
          name="username"
          defaultValue={username}
          autoComplete="username"
          required
        />
        {nameError ? <p className="text-sm text-splits-red">{nameError}</p> : null}
        {nameNotice ? <p className="text-sm text-splits-ink">{nameNotice}</p> : null}
        <Button type="submit" disabled={savingName}>
          {savingName ? "Saving…" : "Save username"}
        </Button>
      </form>

      <form action={savePassword} className="space-y-4 rounded-[28px] bg-white p-5">
        <h2 className="font-bold">Password</h2>
        <TextField
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <TextField
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
        {passwordError ? <p className="text-sm text-splits-red">{passwordError}</p> : null}
        {passwordNotice ? <p className="text-sm text-splits-ink">{passwordNotice}</p> : null}
        <Button type="submit" disabled={savingPassword}>
          {savingPassword ? "Saving…" : "Update password"}
        </Button>
      </form>

      <div className="rounded-[28px] bg-white p-5">
        <Button type="button" variant="danger" onClick={signOut} disabled={signingOut}>
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
      </div>
    </div>
  );
}
