"use client";

import { useState } from "react";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

export function SocialAuth({
  next = "/dashboard",
  onError,
}: {
  next?: string;
  onError: (message: string | null) => void;
}) {
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onGoogle() {
    setGoogleLoading(true);
    onError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });
      if (error) throw error;
    } catch (err) {
      onError(friendlyError(err, "Google sign-in is not available right now."));
      setGoogleLoading(false);
    }
  }

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3 text-[#9a9a9a]">
        <span className="h-px flex-1 border-t border-dashed border-[#cfcfcf]" />
        <span className="text-sm">or</span>
        <span className="h-px flex-1 border-t border-dashed border-[#cfcfcf]" />
      </div>
      <button
        type="button"
        onClick={onGoogle}
        disabled={googleLoading}
        className="mt-5 inline-flex h-[48px] w-full items-center justify-center gap-3 rounded-full border border-splits-line bg-white text-[16px] font-medium text-splits-ink transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon className="h-5 w-5" />
        {googleLoading ? "Connecting to Google…" : "Continue with Google"}
      </button>
    </div>
  );
}
