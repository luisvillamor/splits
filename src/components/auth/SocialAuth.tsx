"use client";

import { useState } from "react";
import { GoogleIcon, WhatsAppIcon } from "@/components/auth/GoogleIcon";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

export function SocialAuth({
  next = "/dashboard",
  onError,
}: {
  next?: string;
  onError: (message: string) => void;
}) {
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onGoogle() {
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
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
      <div className="mt-5 flex items-center justify-center gap-8">
        <button
          type="button"
          onClick={onGoogle}
          disabled={googleLoading}
          className="flex h-11 w-11 items-center justify-center"
          aria-label="Continue with Google"
        >
          <GoogleIcon />
        </button>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center text-black"
          aria-label="WhatsApp sign-in is coming soon"
          onClick={() => onError("WhatsApp sign-in is coming soon.")}
        >
          <WhatsAppIcon />
        </button>
      </div>
    </div>
  );
}
