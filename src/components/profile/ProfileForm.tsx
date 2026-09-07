"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { updateAvatarUrlAction, updateUsernameAction } from "@/actions/profile";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { firstZodError, passwordSchema } from "@/lib/validation";

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameNotice, setNameNotice] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
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

  async function onPhotoChange(file: File | undefined) {
    if (!file) return;
    setPhotoError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoError("Use a JPG, PNG, or WebP photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Keep the photo under 5MB.");
      return;
    }

    setUploadingPhoto(true);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("avatars").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const result = await updateAvatarUrlAction(path);
      if (!result.ok) throw new Error(result.error);
      router.refresh();
    } catch (error) {
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);
      setPhotoError(friendlyError(error, "Could not update your photo."));
    } finally {
      setUploadingPhoto(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function savePassword(formData: FormData) {
    setSavingPassword(true);
    setPasswordError(null);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirmPassword") ?? "");
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setPasswordError(firstZodError(parsed.error));
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
      setPasswordOpen(false);
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
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploadingPhoto}
          className="relative shrink-0 rounded-full disabled:opacity-70"
          aria-label="Change profile picture"
        >
          <Avatar name={username} id={userId} src={previewUrl ?? avatarUrl} size="lg" />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-splits-red text-white shadow-sm">
            <CameraIcon />
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => void onPhotoChange(event.target.files?.[0])}
        />
        <div>
          <h1 className="text-3xl font-extrabold">Profile</h1>
          <p className="text-sm text-splits-muted">{email}</p>
          <p className="mt-1 text-xs font-medium text-splits-red">
            {uploadingPhoto ? "Uploading photo…" : "Tap the photo to change it"}
          </p>
          {photoError ? <p className="mt-1 text-sm text-splits-red">{photoError}</p> : null}
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

      <div className="space-y-3 rounded-[28px] bg-white p-5">
        <h2 className="font-bold">Password</h2>
        {passwordNotice ? <p className="text-sm text-splits-ink">{passwordNotice}</p> : null}
        <Button type="button" variant="secondary" onClick={() => {
          setPasswordError(null);
          setPasswordOpen(true);
        }}>
          Change password
        </Button>
      </div>

      <div className="rounded-[28px] bg-white p-5">
        <Button type="button" variant="danger" onClick={signOut} disabled={signingOut}>
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
      </div>

      <Sheet
        open={passwordOpen}
        title="Change password"
        onClose={() => {
          if (!savingPassword) setPasswordOpen(false);
        }}
      >
        <form action={savePassword} className="space-y-4">
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
          <Button type="submit" disabled={savingPassword}>
            {savingPassword ? "Saving…" : "Update password"}
          </Button>
        </form>
      </Sheet>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M9 4h6l1.2 2H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.8L9 4Zm3 13.2A4.2 4.2 0 1 0 12 8.8a4.2 4.2 0 0 0 0 8.4Z" />
    </svg>
  );
}
