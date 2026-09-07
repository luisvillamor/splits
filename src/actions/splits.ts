"use server";

import { revalidatePath } from "next/cache";
import { calculateSplit } from "@/lib/calc/engine";
import { checkReceipt } from "@/lib/calc/engine";
import { settleBalances } from "@/lib/settlement/engine";
import { friendlyError, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { getSplitBundle } from "@/lib/data";
import { bundleToCalcInput, money } from "@/lib/split/map";
import { parsePesoInput } from "@/lib/money";
import { expenseSchema, feeSchema, firstZodError } from "@/lib/validation";
import { paymentProviders } from "@/lib/payments/provider";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to continue.");
  return { supabase, user };
}

async function loadContext(splitId: string) {
  const { supabase, user } = await requireUser();
  const bundle = await getSplitBundle(splitId);
  if (!bundle) throw new Error("This Split could not be found.");
  const isParticipant = bundle.participants.some((item) => item.user_id === user.id);
  if (!isParticipant) throw new Error("You are not in this Split.");
  const isCreator = bundle.split.creator_id === user.id;
  const isOpen = bundle.split.status === "open";
  return { supabase, user, bundle, isCreator, isOpen };
}

function revalidateSplit(splitId: string, groupId: string) {
  revalidatePath(`/splits/${splitId}`);
  revalidatePath(`/splits/${splitId}/review`);
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/dashboard");
}

export async function addExpenseAction(
  splitId: string,
  input: {
    name: string;
    amount: string;
    type: "individual" | "shared";
    participantIds: string[];
  },
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = expenseSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };

    const amount = parsePesoInput(parsed.data.amount);
    const { supabase, user, bundle, isCreator, isOpen } = await loadContext(splitId);
    if (!isOpen) return { ok: false, error: "This Split is finalized and locked." };

    let participantIds = parsed.data.participantIds;
    if (parsed.data.type === "individual") {
      if (!isCreator) participantIds = [user.id];
      if (participantIds.length !== 1) {
        return { ok: false, error: "An individual expense must belong to one person." };
      }
      if (!isCreator && participantIds[0] !== user.id) {
        return { ok: false, error: "You can only add your own individual expenses." };
      }
    } else if (participantIds.length < 2) {
      return { ok: false, error: "A shared expense needs at least two people." };
    }

    const allowed = new Set(bundle.participants.map((item) => item.user_id));
    if (participantIds.some((id) => !allowed.has(id))) {
      return { ok: false, error: "Every assignee must be in this Split." };
    }

    const { data: expense, error } = await supabase
      .from("expenses")
      .insert({
        split_id: splitId,
        created_by: user.id,
        name: parsed.data.name,
        amount_centavos: amount,
        type: parsed.data.type,
      })
      .select("id")
      .single();

    if (error || !expense) throw error;

    const { error: participantError } = await supabase
      .from("expense_participants")
      .insert(
        participantIds.map((userId) => ({
          expense_id: expense.id,
          user_id: userId,
        })),
      );
    if (participantError) throw participantError;

    await supabase.from("activity_logs").insert({
      split_id: splitId,
      user_id: user.id,
      action: parsed.data.type === "shared" ? "added_shared_expense" : "added_expense",
      entity_type: "expense",
      entity_id: expense.id,
      new_data: {
        name: parsed.data.name,
        amount,
        participantCount: participantIds.length,
      },
    });

    revalidateSplit(splitId, bundle.group.id);
    return { ok: true, data: { id: expense.id } };
  } catch (error) {
    return { ok: false, error: friendlyError(error, "Could not add that expense.") };
  }
}

export async function updateExpenseAction(
  splitId: string,
  expenseId: string,
  input: {
    name: string;
    amount: string;
    type: "individual" | "shared";
    participantIds: string[];
  },
): Promise<ActionResult> {
  try {
    const parsed = expenseSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };
    const amount = parsePesoInput(parsed.data.amount);

    const { supabase, user, bundle, isCreator, isOpen } = await loadContext(splitId);
    if (!isOpen) return { ok: false, error: "This Split is finalized and locked." };

    const expense = bundle.expenses.find((item) => item.id === expenseId);
    if (!expense) {
      return { ok: false, error: "This expense was removed by someone else." };
    }
    if (!isCreator && expense.created_by !== user.id) {
      return { ok: false, error: "You can only edit expenses you added." };
    }
    if (!isCreator && expense.type === "individual" && expense.created_by !== user.id) {
      return { ok: false, error: "You cannot change someone else's order." };
    }

    let participantIds = parsed.data.participantIds;
    if (parsed.data.type === "individual" && !isCreator) {
      participantIds = [user.id];
    }

    const { error } = await supabase
      .from("expenses")
      .update({
        name: parsed.data.name,
        amount_centavos: amount,
        type: parsed.data.type,
      })
      .eq("id", expenseId);

    if (error) throw error;

    await supabase.from("expense_participants").delete().eq("expense_id", expenseId);
    const { error: insertError } = await supabase.from("expense_participants").insert(
      participantIds.map((userId) => ({
        expense_id: expenseId,
        user_id: userId,
      })),
    );
    if (insertError) throw insertError;

    await supabase.from("activity_logs").insert({
      split_id: splitId,
      user_id: user.id,
      action: "edited_expense",
      entity_type: "expense",
      entity_id: expenseId,
      previous_data: { name: expense.name, amount: expense.amount_centavos },
      new_data: { name: parsed.data.name, amount },
    });

    revalidateSplit(splitId, bundle.group.id);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: friendlyError(error, "Could not save that expense.") };
  }
}

export async function deleteExpenseAction(
  splitId: string,
  expenseId: string,
): Promise<ActionResult> {
  try {
    const { supabase, user, bundle, isCreator, isOpen } = await loadContext(splitId);
    if (!isOpen) return { ok: false, error: "This Split is finalized and locked." };
    const expense = bundle.expenses.find((item) => item.id === expenseId);
    if (!expense) return { ok: true, data: undefined };
    if (!isCreator && expense.created_by !== user.id) {
      return { ok: false, error: "You can only delete expenses you added." };
    }

    const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
    if (error) throw error;

    await supabase.from("activity_logs").insert({
      split_id: splitId,
      user_id: user.id,
      action: "deleted_expense",
      entity_type: "expense",
      entity_id: expenseId,
      previous_data: { name: expense.name, amount: expense.amount_centavos },
    });

    revalidateSplit(splitId, bundle.group.id);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: friendlyError(error, "Could not delete that expense.") };
  }
}

export async function saveFeeAction(
  splitId: string,
  input: { id?: string; name: string; type: "tax" | "service" | "other"; amount: string },
): Promise<ActionResult> {
  try {
    const parsed = feeSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };
    const amount = parsePesoInput(parsed.data.amount);
    const { supabase, user, bundle, isCreator, isOpen } = await loadContext(splitId);
    if (!isCreator) return { ok: false, error: "Only the Split creator can edit fees." };
    if (!isOpen) return { ok: false, error: "This Split is finalized and locked." };

    if (input.id) {
      const { error } = await supabase
        .from("fees")
        .update({
          name: parsed.data.name,
          type: parsed.data.type,
          amount_centavos: amount,
        })
        .eq("id", input.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("fees").insert({
        split_id: splitId,
        name: parsed.data.name,
        type: parsed.data.type,
        amount_centavos: amount,
      });
      if (error) throw error;
    }

    await supabase.from("activity_logs").insert({
      split_id: splitId,
      user_id: user.id,
      action: input.id ? "updated_fee" : "added_fee",
      entity_type: "fee",
      new_data: { name: parsed.data.name, amount },
    });

    revalidateSplit(splitId, bundle.group.id);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: friendlyError(error, "Could not save that fee.") };
  }
}

export async function deleteFeeAction(splitId: string, feeId: string): Promise<ActionResult> {
  try {
    const { supabase, bundle, isCreator, isOpen } = await loadContext(splitId);
    if (!isCreator || !isOpen) {
      return { ok: false, error: "Only the creator can change fees on an open Split." };
    }
    const { error } = await supabase.from("fees").delete().eq("id", feeId);
    if (error) throw error;
    revalidateSplit(splitId, bundle.group.id);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: friendlyError(error, "Could not remove that fee.") };
  }
}

export async function saveReceiptAction(
  splitId: string,
  input: { filePath: string; total: string },
): Promise<ActionResult> {
  try {
    const amount = parsePesoInput(input.total);
    if (amount <= 0) {
      return { ok: false, error: "Enter the receipt total before uploading." };
    }
    const { supabase, user, bundle, isCreator, isOpen } = await loadContext(splitId);
    if (!isCreator) return { ok: false, error: "Only the creator can upload the receipt." };
    if (!isOpen) return { ok: false, error: "This Split is finalized and locked." };

    const payload = {
      split_id: splitId,
      uploaded_by: user.id,
      file_path: input.filePath,
      receipt_total_centavos: amount,
    };

    const { error } = bundle.receipt
      ? await supabase.from("receipts").update(payload).eq("split_id", splitId)
      : await supabase.from("receipts").insert(payload);

    if (error) throw error;

    await supabase.from("activity_logs").insert({
      split_id: splitId,
      user_id: user.id,
      action: "uploaded_receipt",
      entity_type: "receipt",
      new_data: { amount },
    });

    revalidateSplit(splitId, bundle.group.id);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: friendlyError(error, "Could not save the receipt.") };
  }
}

export async function saveContributionsAction(
  splitId: string,
  contributions: Array<{ userId: string; amount: string }>,
): Promise<ActionResult> {
  try {
    const { supabase, bundle, isCreator, isOpen } = await loadContext(splitId);
    if (!isCreator || !isOpen) {
      return { ok: false, error: "Only the creator can record who paid the bill." };
    }

    await supabase.from("bill_contributions").delete().eq("split_id", splitId);

    const rows = contributions
      .map((item) => ({
        userId: item.userId,
        amount: item.amount.trim() ? parsePesoInput(item.amount) : 0,
      }))
      .filter((item) => item.amount > 0);

    if (rows.length) {
      const { error } = await supabase.from("bill_contributions").insert(
        rows.map((item) => ({
          split_id: splitId,
          user_id: item.userId,
          amount_centavos: item.amount,
        })),
      );
      if (error) throw error;
    }

    revalidateSplit(splitId, bundle.group.id);
    return { ok: true, data: undefined };
  } catch (error) {
    return {
      ok: false,
      error: friendlyError(error, "Could not save who paid the bill."),
    };
  }
}

export async function finalizeSplitAction(splitId: string): Promise<ActionResult> {
  try {
    const { supabase, user, bundle, isCreator, isOpen } = await loadContext(splitId);
    if (!isCreator) return { ok: false, error: "Only the creator can finalize this Split." };
    if (!isOpen) return { ok: false, error: "This Split is already finalized." };

    const calc = calculateSplit(bundleToCalcInput(bundle));
    if (calc.unassignedExpenseIds.length > 0) {
      return { ok: false, error: "Every expense needs to be assigned before finalizing." };
    }
    if (calc.grandTotal === 0) {
      return { ok: false, error: "Add expenses or fees before finalizing." };
    }
    if (calc.contributionTotal !== calc.grandTotal) {
      return {
        ok: false,
        error: "Who paid the bill must add up to the Split total before you finalize.",
      };
    }

    if (bundle.receipt) {
      const match = checkReceipt(money(bundle.receipt.receipt_total_centavos), calc.grandTotal);
      if (!match.matches) {
        return {
          ok: false,
          error: "The receipt total does not match the Split total. Fix that before finalizing, or update the receipt amount.",
        };
      }
    }

    const settlement = settleBalances(calc.members);

    const { error: splitError } = await supabase
      .from("split_sessions")
      .update({
        status: "finalized",
        finalized_at: new Date().toISOString(),
        finalized_by: user.id,
        snapshot: {
          grandTotal: calc.grandTotal,
          members: calc.members,
          fees: calc.fees,
        },
      })
      .eq("id", splitId)
      .eq("status", "open");

    if (splitError) throw splitError;

    if (settlement.transfers.length) {
      const { error: transferError } = await supabase.from("settlement_transfers").insert(
        settlement.transfers.map((transfer) => ({
          split_id: splitId,
          from_user_id: transfer.fromUserId,
          to_user_id: transfer.toUserId,
          amount_centavos: transfer.amountCentavos,
          status: "unpaid",
        })),
      );
      if (transferError) throw transferError;
    }

    await supabase.from("activity_logs").insert({
      split_id: splitId,
      user_id: user.id,
      action: "finalized_split",
      entity_type: "split",
      entity_id: splitId,
    });

    revalidateSplit(splitId, bundle.group.id);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: friendlyError(error, "Could not finalize this Split.") };
  }
}

export async function markSettlementPaidAction(
  splitId: string,
  transferId: string,
  method: "manual" | "gcash" = "manual",
): Promise<ActionResult> {
  try {
    const provider = paymentProviders[method];
    if (!provider.enabled) {
      return { ok: false, error: "GCash payments are coming soon." };
    }

    const confirmation = await provider.createIntent({
      id: transferId,
      splitId,
      fromUserId: "",
      toUserId: "",
      amountCentavos: 0,
      method,
    });

    const { supabase, user, bundle } = await loadContext(splitId);
    const transfer = bundle.settlements.find((item) => item.id === transferId);
    if (!transfer) return { ok: false, error: "That payment could not be found." };

    const canMark =
      user.id === transfer.from_user_id ||
      user.id === transfer.to_user_id ||
      user.id === bundle.split.creator_id;
    if (!canMark) {
      return { ok: false, error: "You cannot update that payment." };
    }

    const { error } = await supabase
      .from("settlement_transfers")
      .update({
        status: confirmation.status,
        payment_method: method,
        provider_ref: confirmation.providerRef,
        paid_at: confirmation.paidAt,
        marked_by: user.id,
      })
      .eq("id", transferId);

    if (error) throw error;

    await supabase.from("activity_logs").insert({
      split_id: splitId,
      user_id: user.id,
      action: confirmation.status === "paid" ? "marked_paid" : "updated_payment",
      entity_type: "settlement",
      entity_id: transferId,
    });

    revalidateSplit(splitId, bundle.group.id);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: friendlyError(error, "Could not update payment status.") };
  }
}

export async function fetchSplitBundleAction(splitId: string) {
  const bundle = await getSplitBundle(splitId);
  if (!bundle) return { ok: false as const, error: "Split not found." };
  return { ok: true as const, data: bundle };
}

function isMissingRpc(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST202" ||
    (error?.message ?? "").toLowerCase().includes("could not find the function")
  );
}

async function detachParticipant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  splitId: string,
  userId: string,
  expenseIds: string[],
) {
  if (expenseIds.length) {
    const { error: expenseError } = await supabase
      .from("expense_participants")
      .delete()
      .in("expense_id", expenseIds)
      .eq("user_id", userId);
    if (expenseError) throw expenseError;
  }

  const { error: contributionError } = await supabase
    .from("bill_contributions")
    .delete()
    .eq("split_id", splitId)
    .eq("user_id", userId);
  if (contributionError) throw contributionError;

  const { error: participantError } = await supabase
    .from("split_participants")
    .delete()
    .eq("split_id", splitId)
    .eq("user_id", userId);
  if (participantError) throw participantError;
}

export async function addSplitParticipantsAction(
  splitId: string,
  userIds: string[],
): Promise<ActionResult> {
  try {
    const { supabase, user, bundle, isCreator, isOpen } = await loadContext(splitId);
    if (!isCreator) return { ok: false, error: "Only the Split owner can add people." };
    if (!isOpen) return { ok: false, error: "This Split is finalized and locked." };

    const groupMemberIds = new Set(bundle.groupMembers.map((member) => member.user_id));
    const alreadyIn = new Set(bundle.participants.map((item) => item.user_id));
    const toAdd = Array.from(new Set(userIds)).filter(
      (id) => groupMemberIds.has(id) && !alreadyIn.has(id),
    );

    if (toAdd.length === 0) {
      return { ok: false, error: "Pick someone from this group who is not already in the Split." };
    }

    const { error } = await supabase.from("split_participants").insert(
      toAdd.map((userId) => ({
        split_id: splitId,
        user_id: userId,
      })),
    );
    if (error) throw error;

    const names = toAdd.map(
      (id) =>
        bundle.groupMembers.find((member) => member.user_id === id)?.profile.full_name ??
        "a member",
    );

    await supabase.from("activity_logs").insert({
      split_id: splitId,
      user_id: user.id,
      action: "added_participant",
      entity_type: "participant",
      new_data: { name: names.join(", "), participantCount: toAdd.length },
    });

    revalidateSplit(splitId, bundle.group.id);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: friendlyError(error, "Could not add that person.") };
  }
}

export async function removeSplitParticipantAction(
  splitId: string,
  userId: string,
): Promise<ActionResult> {
  try {
    const { supabase, user, bundle, isCreator, isOpen } = await loadContext(splitId);
    if (!isCreator) return { ok: false, error: "Only the Split owner can remove people." };
    if (!isOpen) return { ok: false, error: "This Split is finalized and locked." };
    if (userId === bundle.split.creator_id) {
      return { ok: false, error: "The Split owner has to stay in this Split." };
    }
    if (!bundle.participants.some((item) => item.user_id === userId)) {
      return { ok: true, data: undefined };
    }

    const name =
      bundle.participants.find((item) => item.user_id === userId)?.profile.full_name ??
      "a member";

    await detachParticipant(
      supabase,
      splitId,
      userId,
      bundle.expenses.map((expense) => expense.id),
    );

    await supabase.from("activity_logs").insert({
      split_id: splitId,
      user_id: user.id,
      action: "removed_participant",
      entity_type: "participant",
      new_data: { name },
    });

    revalidateSplit(splitId, bundle.group.id);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: friendlyError(error, "Could not remove that person.") };
  }
}

export async function deleteSplitAction(
  splitId: string,
): Promise<ActionResult<{ groupId: string }>> {
  try {
    const { supabase, bundle, isCreator } = await loadContext(splitId);
    if (!isCreator) return { ok: false, error: "Only the Split owner can delete this Split." };

    const groupId = bundle.group.id;
    const { error } = await supabase.rpc("delete_split", { _split_id: splitId });
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
    return { ok: true, data: { groupId } };
  } catch (error) {
    return { ok: false, error: friendlyError(error, "Could not delete this Split.") };
  }
}

export async function unfinalizeSplitAction(splitId: string): Promise<ActionResult> {
  try {
    const { supabase, bundle, isCreator, isOpen } = await loadContext(splitId);
    if (!isCreator) return { ok: false, error: "Only the Split owner can reopen this Split." };
    if (isOpen) return { ok: false, error: "This Split is already open." };

    const { error } = await supabase.rpc("unfinalize_split", { _split_id: splitId });
    if (error) {
      if (isMissingRpc(error)) {
        return {
          ok: false,
          error: "This feature needs a database update. Run the latest SQL in Supabase.",
        };
      }
      throw error;
    }

    revalidateSplit(splitId, bundle.group.id);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: friendlyError(error, "Could not reopen this Split.") };
  }
}
