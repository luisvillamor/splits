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
    const { data, error } = await supabase.rpc("create_group", {
      _name: parsed.data.name,
    });

    if (!error && data) {
      revalidatePath("/dashboard");
      revalidatePath("/groups");
      return { ok: true, data: { id: data as string } };
    }

    const rpcMissing =
      error?.code === "PGRST202" ||
      error?.message?.toLowerCase().includes("create_group");

    if (error && !rpcMissing) {
      throw error;
    }

    // Fallback if the create_group SQL has not been run yet.
    // Do not .select() the new row: SELECT RLS requires membership first.
    const groupId = crypto.randomUUID();
    const { error: insertError } = await supabase.from("groups").insert({
      id: groupId,
      name: parsed.data.name,
      creator_id: user.id,
      invite_code: randomInviteCode(),
    });

    if (insertError) throw insertError;

    const { error: memberError } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: user.id,
      role: "owner",
    });

    if (memberError && memberError.code !== "23505") throw memberError;

    revalidatePath("/dashboard");
    revalidatePath("/groups");
    return { ok: true, data: { id: groupId } };
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
      participantMode: String(formData.get("participantMode") ?? "everyone"),
      participantIds: formData.getAll("participantIds").map(String),
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

    const { data: members } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId);

    const memberIds = new Set((members ?? []).map((member) => member.user_id));
    let participantIds: string[];
    if (parsed.data.participantMode === "everyone") {
      participantIds = [...memberIds];
    } else {
      participantIds = Array.from(
        new Set([user.id, ...parsed.data.participantIds.filter((id) => memberIds.has(id))]),
      );
    }

    if (!participantIds.includes(user.id)) {
      participantIds.push(user.id);
    }
    if (participantIds.length === 0) {
      return { ok: false, error: "Pick at least one person for this Split." };
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

    const { error: participantError } = await supabase
      .from("split_participants")
      .insert(
        participantIds.map((userId) => ({
          split_id: split.id,
          user_id: userId,
        })),
      );

    if (participantError) throw participantError;

    await supabase.from("activity_logs").insert({
      split_id: split.id,
      user_id: user.id,
      action: "created_split",
      entity_type: "split",
      entity_id: split.id,
      new_data: {
        name: parsed.data.name,
        participantCount: participantIds.length,
      },
    });

    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/dashboard");
    return { ok: true, data: { id: split.id } };
  } catch (error) {
    return { ok: false, error: friendlyError(error, "Could not create the Split.") };
  }
}

function isMissingRpc(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST202" ||
    (error?.message ?? "").toLowerCase().includes("could not find the function")
  );
}

export async function deleteGroupAction(groupId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { data: group } = await supabase
      .from("groups")
      .select("id, creator_id")
      .eq("id", groupId)
      .maybeSingle();
    if (!group) return { ok: false, error: "This group could not be found." };
    if (group.creator_id !== user.id) {
      return { ok: false, error: "Only the group owner can delete this group." };
    }

    const { error } = await supabase.rpc("delete_group", { _group_id: groupId });
    if (error) {
      if (isMissingRpc(error)) {
        return {
          ok: false,
          error: "This feature needs a database update. Run the latest SQL in Supabase.",
        };
      }
      throw error;
    }

    revalidatePath("/dashboard");
    revalidatePath("/groups");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: friendlyError(error, "Could not delete this group.") };
  }
}

export async function removeGroupMemberAction(
  groupId: string,
  userId: string,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    if (userId === user.id) {
      return { ok: false, error: "You cannot remove yourself from the group." };
    }

    const { data: group } = await supabase
      .from("groups")
      .select("id, creator_id")
      .eq("id", groupId)
      .maybeSingle();
    if (!group) return { ok: false, error: "This group could not be found." };
    if (group.creator_id !== user.id) {
      return { ok: false, error: "Only the group owner can remove members." };
    }

    const { error } = await supabase.rpc("remove_group_member", {
      _group_id: groupId,
      _user_id: userId,
    });
    if (error) {
      if (isMissingRpc(error)) {
        return {
          ok: false,
          error: "This feature needs a database update. Run the latest SQL in Supabase.",
        };
      }
      throw error;
    }

    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/dashboard");
    revalidatePath("/groups");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: friendlyError(error, "Could not remove that member.") };
  }
}
