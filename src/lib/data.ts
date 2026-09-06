import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/split/map";
import type {
  ActivityLog,
  BillContribution,
  Expense,
  ExpenseParticipant,
  Fee,
  Group,
  GroupMember,
  Profile,
  Receipt,
  SettlementTransferRow,
  SplitBundle,
  SplitParticipant,
  SplitSession,
} from "@/types/database";

function asOne<T>(value: T | T[] | null | undefined): T | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: profile as Profile | null };
}

export async function getMyGroups() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, role, groups(*)")
    .eq("user_id", user.id);

  const groups = (memberships ?? [])
    .map((row) => row.groups as Group | Group[] | null)
    .flatMap((group) => (Array.isArray(group) ? group : group ? [group] : []));

  if (groups.length === 0) return [];

  const groupIds = groups.map((group) => group.id);
  const { data: members } = await supabase
    .from("group_members")
    .select("id, group_id, user_id, role, joined_at, profiles(*)")
    .in("group_id", groupIds);

  const { data: splits } = await supabase
    .from("split_sessions")
    .select("id, group_id, name, emoji, occurred_on, status, snapshot")
    .in("group_id", groupIds)
    .order("occurred_on", { ascending: false });

  return groups.map((group) => {
    const groupMembers = (members ?? []).filter((member) => member.group_id === group.id);
    const groupSplits = (splits ?? []).filter((split) => split.group_id === group.id);
    const totalSpending = groupSplits.reduce((sum, split) => {
      const snapshot = split.snapshot as { grandTotal?: number } | null;
      return sum + (snapshot?.grandTotal ?? 0);
    }, 0);

    return {
      ...group,
      members: groupMembers.map((member) => ({
        id: member.id as string,
        group_id: member.group_id as string,
        user_id: member.user_id as string,
        role: member.role as GroupMember["role"],
        joined_at: member.joined_at as string,
        profile: asOne(member.profiles as Profile | Profile[] | null),
      })),
      splitCount: groupSplits.length,
      totalSpending,
      recentSplits: groupSplits.slice(0, 4),
    };
  });
}

export async function getGroup(groupId: string) {
  const supabase = await createClient();
  const { data: group, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .maybeSingle();

  if (error || !group) return null;

  const { data: members } = await supabase
    .from("group_members")
    .select("*, profiles(*)")
    .eq("group_id", groupId)
    .order("joined_at");

  const { data: splits } = await supabase
    .from("split_sessions")
    .select("*")
    .eq("group_id", groupId)
    .order("occurred_on", { ascending: false });

  return {
    group: group as Group,
    members: (members ?? []).map((member) => ({
      id: member.id as string,
      group_id: member.group_id as string,
      user_id: member.user_id as string,
      role: member.role as GroupMember["role"],
      joined_at: member.joined_at as string,
      profile: asOne(member.profiles as Profile | Profile[] | null) as Profile,
    })),
    splits: (splits ?? []) as SplitSession[],
  };
}

export async function getSplitBundle(splitId: string): Promise<SplitBundle | null> {
  const supabase = await createClient();

  const { data: split, error } = await supabase
    .from("split_sessions")
    .select("*")
    .eq("id", splitId)
    .maybeSingle();

  if (error || !split) return null;

  const [
    groupRes,
    participantsRes,
    expensesRes,
    feesRes,
    receiptRes,
    contributionsRes,
    settlementsRes,
    activityRes,
  ] = await Promise.all([
    supabase.from("groups").select("*").eq("id", split.group_id).single(),
    supabase
      .from("split_participants")
      .select("*, profiles(*)")
      .eq("split_id", splitId),
    supabase
      .from("expenses")
      .select("*, expense_participants(*)")
      .eq("split_id", splitId)
      .order("created_at"),
    supabase.from("fees").select("*").eq("split_id", splitId).order("created_at"),
    supabase.from("receipts").select("*").eq("split_id", splitId).maybeSingle(),
    supabase.from("bill_contributions").select("*").eq("split_id", splitId),
    supabase.from("settlement_transfers").select("*").eq("split_id", splitId),
    supabase
      .from("activity_logs")
      .select("*, profiles(*)")
      .eq("split_id", splitId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const participants = (participantsRes.data ?? []).map((row) => {
    const record = row as SplitParticipant & { profiles?: Profile | Profile[] | null };
    return {
      id: record.id,
      split_id: record.split_id,
      user_id: record.user_id,
      profile: asOne(record.profiles) as Profile,
    };
  });

  const expenses = (expensesRes.data ?? []).map((row) => ({
    ...(row as Expense),
    amount_centavos: money(row.amount_centavos),
    participants: (row.expense_participants ?? []) as ExpenseParticipant[],
  }));

  return {
    split: split as SplitSession,
    group: groupRes.data as Group,
    participants,
    expenses,
    fees: (feesRes.data ?? []).map((fee) => ({
      ...(fee as Fee),
      amount_centavos: money(fee.amount_centavos),
    })),
    receipt: receiptRes.data
      ? {
          ...(receiptRes.data as Receipt),
          receipt_total_centavos: money(receiptRes.data.receipt_total_centavos),
        }
      : null,
    contributions: (contributionsRes.data ?? []).map((item) => ({
      ...(item as BillContribution),
      amount_centavos: money(item.amount_centavos),
    })),
    settlements: (settlementsRes.data ?? []).map((item) => ({
      ...(item as SettlementTransferRow),
      amount_centavos: money(item.amount_centavos),
    })),
    activity: (activityRes.data ?? []).map((item) => {
      const record = item as ActivityLog & { profiles?: Profile | Profile[] | null };
      return {
        id: record.id,
        split_id: record.split_id,
        user_id: record.user_id,
        action: record.action,
        entity_type: record.entity_type,
        entity_id: record.entity_id,
        previous_data: record.previous_data,
        new_data: record.new_data,
        created_at: record.created_at,
        actor: asOne(record.profiles) ?? null,
      };
    }),
  };
}

export async function getOutstandingForUser(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settlement_transfers")
    .select("*, split_sessions(name, emoji, group_id, groups(name))")
    .eq("from_user_id", userId)
    .eq("status", "unpaid");

  return (data ?? []).map((row) => ({
    id: row.id as string,
    amount: money(row.amount_centavos),
    toUserId: row.to_user_id as string,
    splitId: row.split_id as string,
    splitName: (row.split_sessions as { name?: string } | null)?.name ?? "Split",
    emoji: (row.split_sessions as { emoji?: string } | null)?.emoji ?? "🧾",
    groupName:
      ((row.split_sessions as { groups?: { name?: string } | null } | null)?.groups)
        ?.name ?? "Group",
  }));
}
