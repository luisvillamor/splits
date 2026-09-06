"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError, type ActionResult } from "@/lib/errors";
import { randomInviteCode } from "@/lib/format";
import { firstZodError, groupSchema, splitSchema } from "@/lib/validation";
import { SPLIT_EMOJIS } from "@/lib/format";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Please sign in to continue.");
  }
  return { supabase, user };
}

export async function createGroupAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = groupSchema.safeParse({
      name: String(formData.get("name") ?? ""),
    });
    if (!parsed.success) {
      return { ok: false, error: firstZodError(parsed.error) };
    }

    const { supabase, user } = await requireUser();
    const { data, error } = await supabase
      .from("groups")
      .insert({
        name: parsed.data.name,
        creator_id: user.id,
        invite_code: randomInviteCode(),
      })
      .select("id")
      .single();

    if (error || !data) {
      throw error ?? new Error("Could not create the group.");
    }

    const { error: memberError } = await supabase.from("group_members").insert({
      group_id: data.id,
      user_id: user.id,
      role: "owner",
    });

    if (memberError) throw memberError;

    revalidatePath("/dashboard");
    revalidatePath("/groups");
    return { ok: true, data: { id: data.id } };
  } catch (error) {
    return { ok: false, error: friendlyError(error, "Could not create the group.") };
  }
}

export async function joinGroupAction(
  code: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const trimmed = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6,12}$/.test(trimmed)) {
      return { ok: false, error: "Enter a valid invite code." };
    }

    const { supabase } = await requireUser();
    const { data, error } = await supabase.rpc("join_group_by_code", {
      _code: trimmed,
    });

    if (error) throw error;
    revalidatePath("/dashboard");
    revalidatePath("/groups");
    return { ok: true, data: { id: data as string } };
  } catch (error) {
    return {
      ok: false,
      error: friendlyError(error, "Could not join that group."),
    };
  }
}

export async function previewGroupAction(code: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("preview_group_by_code", {
    _code: code.trim(),
  });
  if (error) {
    return { ok: false as const, error: "That invite code is not valid." };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { ok: false as const, error: "That invite code is not valid." };
  }
  return {
    ok: true as const,
    data: row as { id: string; name: string; member_count: number },
  };
}

export async function createSplitAction(
  groupId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = splitSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      occurredOn: String(formData.get("occurredOn") ?? ""),
      emoji: String(formData.get("emoji") ?? "🧾") || "🧾",
    });
    if (!parsed.success) {
      return { ok: false, error: firstZodError(parsed.error) };
    }
    const emoji = (SPLIT_EMOJIS as readonly string[]).includes(parsed.data.emoji)
      ? parsed.data.emoji
      : "🧾";

    const { supabase, user } = await requireUser();
    const { data: membership } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return { ok: false, error: "You are not a member of this group." };
    }

    const { data: split, error } = await supabase
      .from("split_sessions")
      .insert({
        group_id: groupId,
        creator_id: user.id,
        name: parsed.data.name,
        emoji,
        occurred_on: parsed.data.occurredOn,
      })
      .select("id")
      .single();

    if (error || !split) throw error ?? new Error("Could not create the Split.");

    const { data: members } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId);

    const { error: participantError } = await supabase
      .from("split_participants")
      .insert(
        (members ?? []).map((member) => ({
          split_id: split.id,
          user_id: member.user_id,
        })),
      );

    if (participantError) throw participantError;

    await supabase.from("activity_logs").insert({
      split_id: split.id,
      user_id: user.id,
      action: "created_split",
      entity_type: "split",
      entity_id: split.id,
      new_data: { name: parsed.data.name },
    });

    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/dashboard");
    return { ok: true, data: { id: split.id } };
  } catch (error) {
    return { ok: false, error: friendlyError(error, "Could not create the Split.") };
  }
}
