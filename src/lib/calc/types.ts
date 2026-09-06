import type { Centavos } from "@/lib/money";

export type ExpenseType = "individual" | "shared";
export type FeeType = "tax" | "service" | "other";

export interface CalcParticipant {
  id: string;
  name: string;
}

export interface CalcExpense {
  id: string;
  name: string;
  amountCentavos: Centavos;
  type: ExpenseType;
  participantIds: string[];
}

export interface CalcFee {
  id: string;
  name: string;
  type: FeeType;
  amountCentavos: Centavos;
}

export interface CalcContribution {
  userId: string;
  amountCentavos: Centavos;
}

export interface CalcInput {
  participants: CalcParticipant[];
  expenses: CalcExpense[];
  fees: CalcFee[];
  contributions?: CalcContribution[];
}

export type LineKind = "individual" | "shared" | "fee";

export interface MemberLine {
  kind: LineKind;
  expenseId?: string;
  feeId?: string;
  label: string;
  detail: string;
  amountCentavos: Centavos;
}

export interface MemberBreakdown {
  userId: string;
  name: string;
  individualSubtotal: Centavos;
  sharedSubtotal: Centavos;
  feeShare: Centavos;
  totalOwed: Centavos;
  suggestedPayment: Centavos;
  paidTowardBill: Centavos;
  netCentavos: Centavos;
  lines: MemberLine[];
}

export interface FeeAllocation {
  feeId: string;
  name: string;
  type: FeeType;
  totalCentavos: Centavos;
  participantCount: number;
  perPersonCentavos: Centavos;
  explanation: string;
}

export interface ReceiptCheck {
  receiptTotal: Centavos;
  splitTotal: Centavos;
  difference: Centavos;
  matches: boolean;
}

export interface CalcResult {
  participantCount: number;
  expenseCount: number;
  expenseSubtotal: Centavos;
  feeTotal: Centavos;
  grandTotal: Centavos;
  contributionTotal: Centavos;
  members: MemberBreakdown[];
  fees: FeeAllocation[];
  unassignedExpenseIds: string[];
}
