import { calculateSplit } from "@/lib/calc/engine";
import type { CalcInput, CalcResult } from "@/lib/calc/types";
import { asCentavos } from "@/lib/money";
import type { SplitBundle } from "@/types/database";

export function money(value: string | number | null | undefined) {
  return asCentavos(value ?? 0);
}

export function bundleToCalcInput(bundle: SplitBundle): CalcInput {
  return {
    participants: bundle.participants.map((participant) => ({
      id: participant.user_id,
      name: participant.profile.full_name,
    })),
    expenses: bundle.expenses.map((expense) => ({
      id: expense.id,
      name: expense.name,
      amountCentavos: money(expense.amount_centavos),
      type: expense.type,
      participantIds: expense.participants.map((item) => item.user_id),
    })),
    fees: bundle.fees.map((fee) => ({
      id: fee.id,
      name: fee.name,
      type: fee.type,
      amountCentavos: money(fee.amount_centavos),
    })),
    contributions: bundle.contributions.map((item) => ({
      userId: item.user_id,
      amountCentavos: money(item.amount_centavos),
    })),
  };
}

export function calculateBundle(bundle: SplitBundle): CalcResult {
  return calculateSplit(bundleToCalcInput(bundle));
}
