import { describe, expect, it } from "vitest";
import { calculateSplit } from "@/lib/calc/engine";
import { settleBalances } from "@/lib/settlement/engine";
import {
  formatPeso,
  parsePesoInput,
  splitEqually,
  suggestedPaymentCentavos,
  sumCentavos,
} from "@/lib/money";

const luis = { id: "luis", name: "Luis" };
const john = { id: "john", name: "John" };
const mike = { id: "mike", name: "Mike" };
const josh = { id: "josh", name: "Josh" };
const carlo = { id: "carlo", name: "Carlo" };
const ethan = { id: "ethan", name: "Ethan" };

function pesos(amount: number) {
  return Math.round(amount * 100);
}

describe("money helpers", () => {
  it("parses peso input and formats without dropping precision", () => {
    expect(parsePesoInput("₱1,280.50")).toBe(128050);
    expect(formatPeso(63333, { exact: true })).toBe("₱633.33");
    expect(suggestedPaymentCentavos(63333)).toBe(63300);
    expect(suggestedPaymentCentavos(63350)).toBe(63400);
  });

  it("distributes leftover centavos so shares always sum to the total", () => {
    const shares = splitEqually(1000, ["c", "a", "b"]);
    expect(sumCentavos(Object.values(shares))).toBe(1000);
    expect(shares).toEqual({ a: 334, b: 333, c: 333 });
  });
});

describe("calculation engine", () => {
  it("Case 1 — individual expenses stay with the assignee", () => {
    const result = calculateSplit({
      participants: [luis, john],
      expenses: [
        {
          id: "e1",
          name: "Carbonara",
          amountCentavos: pesos(300),
          type: "individual",
          participantIds: ["luis"],
        },
        {
          id: "e2",
          name: "Burger",
          amountCentavos: pesos(500),
          type: "individual",
          participantIds: ["john"],
        },
      ],
      fees: [],
    });

    expect(result.members.find((m) => m.userId === "luis")?.totalOwed).toBe(
      pesos(300),
    );
    expect(result.members.find((m) => m.userId === "john")?.totalOwed).toBe(
      pesos(500),
    );
  });

  it("Case 2 — shared expense is divided equally", () => {
    const result = calculateSplit({
      participants: [luis, john, mike],
      expenses: [
        {
          id: "pizza",
          name: "Pizza",
          amountCentavos: pesos(900),
          type: "shared",
          participantIds: ["luis", "john", "mike"],
        },
      ],
      fees: [],
    });

    for (const member of result.members) {
      expect(member.totalOwed).toBe(pesos(300));
    }
  });

  it("Case 3 — individual plus shared", () => {
    const result = calculateSplit({
      participants: [luis, john, mike],
      expenses: [
        {
          id: "e1",
          name: "Carbonara",
          amountCentavos: pesos(300),
          type: "individual",
          participantIds: ["luis"],
        },
        {
          id: "pizza",
          name: "Pizza",
          amountCentavos: pesos(900),
          type: "shared",
          participantIds: ["luis", "john", "mike"],
        },
      ],
      fees: [],
    });

    expect(result.members.find((m) => m.userId === "luis")?.totalOwed).toBe(
      pesos(600),
    );
  });

  it("Case 4 — fees are split equally among participants", () => {
    const result = calculateSplit({
      participants: [luis, john, mike],
      expenses: [
        {
          id: "food",
          name: "Food",
          amountCentavos: pesos(3000),
          type: "shared",
          participantIds: ["luis", "john", "mike"],
        },
      ],
      fees: [
        {
          id: "sc",
          name: "Service Charge",
          type: "service",
          amountCentavos: pesos(300),
        },
      ],
    });

    for (const member of result.members) {
      expect(member.feeShare).toBe(pesos(100));
    }
    expect(result.fees[0].explanation).toContain("÷ 3");
  });

  it("Case 5 — multiple payers produce correct net balances", () => {
    const result = calculateSplit({
      participants: [luis, john, mike],
      expenses: [
        {
          id: "food",
          name: "Food",
          amountCentavos: pesos(3000),
          type: "shared",
          participantIds: ["luis", "john", "mike"],
        },
      ],
      fees: [],
      contributions: [
        { userId: "luis", amountCentavos: pesos(2000) },
        { userId: "john", amountCentavos: pesos(1000) },
      ],
    });

    const byId = Object.fromEntries(
      result.members.map((member) => [member.userId, member.netCentavos]),
    );

    expect(byId.luis).toBe(pesos(1000));
    expect(byId.john).toBe(0);
    expect(byId.mike).toBe(pesos(-1000));
    expect(result.contributionTotal).toBe(pesos(3000));
  });

  it("Case 6 — suggested rounding does not change settlement totals", () => {
    const result = calculateSplit({
      participants: [luis, john, mike],
      expenses: [
        {
          id: "odd",
          name: "Odd bill",
          amountCentavos: 1000,
          type: "shared",
          participantIds: ["luis", "john", "mike"],
        },
      ],
      fees: [],
      contributions: [{ userId: "luis", amountCentavos: 1000 }],
    });

    const owed = sumCentavos(result.members.map((m) => m.totalOwed));
    expect(owed).toBe(1000);

    const suggested = sumCentavos(
      result.members.map((m) => m.suggestedPayment),
    );
    expect(suggested).not.toBe(owed);

    const settlement = settleBalances(result.members);
    const recovered = sumCentavos(
      settlement.transfers.map((transfer) => transfer.amountCentavos),
    );
    expect(recovered).toBe(
      result.members
        .filter((member) => member.netCentavos < 0)
        .reduce((sum, member) => sum + Math.abs(member.netCentavos), 0),
    );
    expect(settlement.leftoverCentavos).toBe(0);
  });
});

describe("Boiz dinner demonstration scenario", () => {
  it("calculates each person's total, fees, and settlement", () => {
    const result = calculateSplit({
      participants: [luis, john, mike, josh, carlo, ethan],
      expenses: [
        {
          id: "carbonara",
          name: "Carbonara",
          amountCentavos: pesos(280),
          type: "individual",
          participantIds: ["luis"],
        },
        {
          id: "coke",
          name: "Coke",
          amountCentavos: pesos(80),
          type: "individual",
          participantIds: ["luis"],
        },
        {
          id: "burger",
          name: "Burger",
          amountCentavos: pesos(350),
          type: "individual",
          participantIds: ["john"],
        },
        {
          id: "steak",
          name: "Steak",
          amountCentavos: pesos(650),
          type: "individual",
          participantIds: ["mike"],
        },
        {
          id: "pasta",
          name: "Pasta",
          amountCentavos: pesos(300),
          type: "individual",
          participantIds: ["josh"],
        },
        {
          id: "pizza",
          name: "Pizza",
          amountCentavos: pesos(900),
          type: "shared",
          participantIds: ["luis", "john", "mike", "josh", "carlo", "ethan"],
        },
      ],
      fees: [
        {
          id: "service",
          name: "Service Charge",
          type: "service",
          amountCentavos: pesos(486),
        },
      ],
      contributions: [{ userId: "luis", amountCentavos: pesos(3046) }],
    });

    expect(result.grandTotal).toBe(pesos(3046));

    const totals = Object.fromEntries(
      result.members.map((member) => [member.userId, member.totalOwed]),
    );

    expect(totals.luis).toBe(pesos(591));
    expect(totals.john).toBe(pesos(581));
    expect(totals.mike).toBe(pesos(881));
    expect(totals.josh).toBe(pesos(531));
    expect(totals.carlo).toBe(pesos(231));
    expect(totals.ethan).toBe(pesos(231));

    const luisMember = result.members.find((m) => m.userId === "luis")!;
    expect(luisMember.lines.map((line) => line.label)).toEqual([
      "Carbonara",
      "Coke",
      "Pizza",
      "Service Charge",
    ]);

    const settlement = settleBalances(result.members);
    expect(settlement.transfers).toHaveLength(5);
    expect(
      settlement.transfers.every((transfer) => transfer.toUserId === "luis"),
    ).toBe(true);
    expect(sumCentavos(settlement.transfers.map((t) => t.amountCentavos))).toBe(
      pesos(3046 - 591),
    );
  });
});
