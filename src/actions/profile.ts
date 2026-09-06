"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError, type ActionResult } from "@/lib/errors";
import { firstZodError, usernameSchema } from "@/lib/validation";

export async function resolveLoginEmailAction(identifier: string) {
  const cleaned = identifier.trim();
  if (!cleaned) return { ok: false as const, error: "Enter your email or username." };
  if (cleaned.includes("@")) {
    return { ok: true as const, data: cleaned };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_login_email", {
    _identifier: cleaned,
  });

  if (error || !data) {
    return {
      ok: false as const,
      error: "Email/username or password is incorrect.",
    };
  }

  return { ok: true as const, data: data as string };
}

export async function updateUsernameAction(
  username: string,
): Promise<ActionResult> {
  try {
    const parsed = usernameSchema.safeParse(username);
    if (!parsed.success) {
      return { ok: false, error: firstZodError(parsed.error) };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Please sign in to continue." };

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: parsed.data })
      .eq("id", user.id);

    if (error) throw error;

    await supabase.auth.updateUser({
      data: { full_name: parsed.data },
    });

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: friendlyError(error, "Could not update your username.") };
  }
}
