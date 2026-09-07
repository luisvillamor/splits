"use client";

import { useEffect } from "react";
import { shouldClearSession } from "@/lib/auth/remember";
import { createClient } from "@/lib/supabase/client";

export function RememberSession() {
  useEffect(() => {
    if (!shouldClearSession()) return;

    const supabase = createClient();
    void supabase.auth.signOut().then(() => {
      if (window.location.pathname !== "/sign-in") {
        window.location.replace("/sign-in");
      }
    });
  }, []);

  return null;
}
