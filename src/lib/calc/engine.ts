import {
  asCentavos,
  splitEqually,
  suggestedPaymentCentavos,
  sumCentavos,
  type Centavos,
} from "@/lib/money";
import type {
  CalcExpense,
  CalcFee,
  CalcInput,
  CalcResult,
  FeeAllocation,
  MemberBreakdown,
  MemberLine,
  ReceiptCheck,
} from "@/lib/calc/types";
import { formatPeso } from "@/lib/money";

function emptyMember(userId: string, name: string): MemberBreakdown {
  return {
    userId,
    name,
    individualSubtotal: 0,
    sharedSubtotal: 0,
    feeShare: 0,
    totalOwed: 0,
    suggestedPayment: 0,
    paidTowardBill: 0,
    netCentavos: 0,
    lines: [],
  };
}

function assertExpense(expense: CalcExpense) {
  asCentavos(expense.amountCentavos);

  if (expense.amountCentavos < 0) {
    throw new Error(`Expense "${expense.name}" cannot be negative.`);
  }

  if (expense.participantIds.length === 0) {
    return;
  }

  if (expense.type === "individual" && expense.participantIds.length !== 1) {
    throw new Error(
      `Individual expense "${expense.name}" must belong to exactly one person.`,
    );
  }

  if (expense.type === "shared" && expense.participantIds.length < 2) {
    throw new Error(
      `Shared expense "${expense.name}" needs at least two people.`,
    );
  }
}

function feeExplanation(fee: CalcFee, count: number, share: Centavos): string {
  return `${fee.name} ${formatPeso(fee.amountCentavos)} ÷ ${count} = ${formatPeso(share, { exact: true })}/person`;
}

export function calculateSplit(input: CalcInput): CalcResult {
  const members = new Map<string, MemberBreakdown>();

  for (const participant of input.participants) {
    members.set(participant.id, emptyMember(participant.id, participant.name));
  }

  const participantIds = input.participants.map((participant) => participant.id);
  const unassignedExpenseIds: string[] = [];
  let expenseSubtotal = 0;

  for (const expense of input.expenses) {
    assertExpense(expense);
    expenseSubtotal += expense.amountCentavos;

    if (expense.participantIds.length === 0) {
      unassignedExpenseIds.push(expense.id);
      continue;
    }

    const shares = splitEqually(expense.amountCentavos, expense.participantIds);

    for (const [userId, share] of Object.entries(shares)) {
      const member = members.get(userId);
      if (!member) {
        throw new Error(
          `Expense "${expense.name}" includes someone who is not in this Split.`,
        );
      }

      const line: MemberLine = {
        kind: expense.type,
        expenseId: expense.id,
        label: expense.name,
        detail:
          expense.type === "shared"
            ? `Shared by ${expense.participantIds.length} · ${formatPeso(share, { exact: true })} each`
            : "Your order",
        amountCentavos: share,
      };

      member.lines.push(line);

      if (expense.type === "individual") {
        member.individualSubtotal += share;
      } else {
        member.sharedSubtotal += share;
      }
    }
  }

  const feeAllocations: FeeAllocation[] = [];
  let feeTotal = 0;
  const count = participantIds.length || 1;

  for (const fee of input.fees) {
    asCentavos(fee.amountCentavos);
    if (fee.amountCentavos < 0) {
      throw new Error(`Fee "${fee.name}" cannot be negative.`);
    }

    feeTotal += fee.amountCentavos;

    if (participantIds.length === 0) {
      continue;
    }

    const shares = splitEqually(fee.amountCentavos, participantIds);
    const sampleShare = shares[participantIds.slice().sort()[0]];

    feeAllocations.push({
      feeId: fee.id,
      name: fee.name,
      type: fee.type,
      totalCentavos: fee.amountCentavos,
      participantCount: participantIds.length,
      perPersonCentavos: sampleShare,
      explanation: feeExplanation(fee, count, sampleShare),
    });

    for (const [userId, share] of Object.entries(shares)) {
      const member = members.get(userId);
      if (!member) continue;
      member.feeShare += share;
      member.lines.push({
        kind: "fee",
        feeId: fee.id,
        label: fee.name,
        detail: `${formatPeso(fee.amountCentavos)} ÷ ${count}`,
        amountCentavos: share,
      });
    }
  }

  const contributions = new Map<string, Centavos>();
  for (const contribution of input.contributions ?? []) {
    contributions.set(
      contribution.userId,
      (contributions.get(contribution.userId) ?? 0) +
        asCentavos(contribution.amountCentavos),
    );
  }

  for (const member of members.values()) {
    member.totalOwed =
      member.individualSubtotal + member.sharedSubtotal + member.feeShare;
    member.suggestedPayment = suggestedPaymentCentavos(member.totalOwed);
    member.paidTowardBill = contributions.get(member.userId) ?? 0;
    member.netCentavos = member.paidTowardBill - member.totalOwed;
  }

  const grandTotal = expenseSubtotal + feeTotal;
  const contributionTotal = sumCentavos([...contributions.values()]);

  return {
    participantCount: input.participants.length,
    expenseCount: input.expenses.length,
    expenseSubtotal,
    feeTotal,
    grandTotal,
    contributionTotal,
    members: [...members.values()],
    fees: feeAllocations,
    unassignedExpenseIds,
  };
}

export function checkReceipt(
  receiptTotal: Centavos,
  splitTotal: Centavos,
): ReceiptCheck {
  const difference = asCentavos(splitTotal) - asCentavos(receiptTotal);
  return {
    receiptTotal,
    splitTotal,
    difference,
    matches: difference === 0,
  };
}

export function memberById(
  result: CalcResult,
  userId: string,
): MemberBreakdown | undefined {
  return result.members.find((member) => member.userId === userId);
}
