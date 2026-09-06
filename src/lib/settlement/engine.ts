import { asCentavos, type Centavos } from "@/lib/money";
import type { MemberBreakdown } from "@/lib/calc/types";

export interface SettlementTransfer {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amountCentavos: Centavos;
}

export interface SettlementResult {
  transfers: SettlementTransfer[];
  leftoverCentavos: Centavos;
}

interface Node {
  userId: string;
  name: string;
  remaining: Centavos;
}

/**
 * Greedy debt simplification.
 *
 * This is not always the mathematically minimal number of transfers
 * (that problem is NP-hard), but it produces a practical, easy-to-pay
 * set of transfers and is isolated so it can be replaced later.
 *
 * Settlement always uses exact centavos, never suggested/rounded amounts,
 * so the transfers always sum back to the bill.
 */
export function settleBalances(
  members: Pick<MemberBreakdown, "userId" | "name" | "netCentavos">[],
): SettlementResult {
  const creditors: Node[] = [];
  const debtors: Node[] = [];

  for (const member of members) {
    const net = asCentavos(member.netCentavos);
    if (net > 0) {
      creditors.push({ userId: member.userId, name: member.name, remaining: net });
    } else if (net < 0) {
      debtors.push({
        userId: member.userId,
        name: member.name,
        remaining: -net,
      });
    }
  }

  creditors.sort((a, b) => b.remaining - a.remaining || a.userId.localeCompare(b.userId));
  debtors.sort((a, b) => b.remaining - a.remaining || a.userId.localeCompare(b.userId));

  const transfers: SettlementTransfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.remaining, creditor.remaining);

    if (amount > 0) {
      transfers.push({
        fromUserId: debtor.userId,
        fromName: debtor.name,
        toUserId: creditor.userId,
        toName: creditor.name,
        amountCentavos: amount,
      });
    }

    debtor.remaining -= amount;
    creditor.remaining -= amount;

    if (debtor.remaining === 0) i += 1;
    if (creditor.remaining === 0) j += 1;
  }

  const leftover =
    debtors.slice(i).reduce((sum, node) => sum + node.remaining, 0) +
    creditors.slice(j).reduce((sum, node) => sum + node.remaining, 0);

  return { transfers, leftoverCentavos: leftover };
}
