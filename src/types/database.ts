export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SplitStatus = "open" | "finalized";
export type ExpenseType = "individual" | "shared";
export type FeeType = "tax" | "service" | "other";
export type GroupRole = "owner" | "member";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed";
export type PaymentMethod = "manual" | "gcash";

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
  creator_id: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: string;
  profile?: Profile;
}

export interface SplitSession {
  id: string;
  group_id: string;
  creator_id: string;
  name: string;
  emoji: string;
  occurred_on: string;
  status: SplitStatus;
  finalized_at: string | null;
  finalized_by: string | null;
  snapshot: Json | null;
  created_at: string;
  updated_at: string;
}

export interface SplitParticipant {
  id: string;
  split_id: string;
  user_id: string;
  profile?: Profile;
}

export interface Expense {
  id: string;
  split_id: string;
  created_by: string;
  name: string;
  amount_centavos: number;
  type: ExpenseType;
  created_at: string;
  updated_at: string;
  participants?: ExpenseParticipant[];
}

export interface ExpenseParticipant {
  id: string;
  expense_id: string;
  user_id: string;
}

export interface Fee {
  id: string;
  split_id: string;
  type: FeeType;
  name: string;
  amount_centavos: number;
  created_at: string;
  updated_at: string;
}

export interface Receipt {
  id: string;
  split_id: string;
  uploaded_by: string;
  file_path: string;
  receipt_total_centavos: number;
  created_at: string;
  updated_at: string;
}

export interface BillContribution {
  id: string;
  split_id: string;
  user_id: string;
  amount_centavos: number;
  created_at: string;
  updated_at: string;
}

export interface SettlementTransferRow {
  id: string;
  split_id: string;
  from_user_id: string;
  to_user_id: string;
  amount_centavos: number;
  status: PaymentStatus;
  payment_method: PaymentMethod | null;
  provider_ref: string | null;
  paid_at: string | null;
  marked_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  split_id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  previous_data: Json | null;
  new_data: Json | null;
  created_at: string;
}

export interface SplitBundle {
  split: SplitSession;
  group: Group;
  participants: Array<SplitParticipant & { profile: Profile }>;
  groupMembers: Array<GroupMember & { profile: Profile }>;
  expenses: Array<Expense & { participants: ExpenseParticipant[] }>;
  fees: Fee[];
  receipt: Receipt | null;
  contributions: BillContribution[];
  settlements: SettlementTransferRow[];
  activity: Array<ActivityLog & { actor: Profile | null }>;
}
