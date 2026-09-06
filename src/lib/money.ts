/**
 * Money is stored and calculated as integer centavos (1 peso = 100 centavos).
 * Never use IEEE-754 floats for financial math in this codebase.
 */

export type Centavos = number;

export const CENTAVOS_PER_PESO = 100;
export const MAX_SAFE_CENTAVOS = Number.MAX_SAFE_INTEGER;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

export function asCentavos(value: string | number | bigint): Centavos {
  const n =
    typeof value === "bigint"
      ? Number(value)
      : typeof value === "string"
        ? Number(value)
        : value;

  if (!Number.isFinite(n) || !Number.isInteger(n) || !Number.isSafeInteger(n)) {
    throw new MoneyError("Amount must be a whole number of centavos.");
  }

  return n;
}

export function pesosToCentavos(pesos: number): Centavos {
  if (!Number.isFinite(pesos)) {
    throw new MoneyError("Enter a valid amount.");
  }
  return Math.round(pesos * CENTAVOS_PER_PESO);
}

export function parsePesoInput(raw: string): Centavos {
  const cleaned = raw.trim().replace(/[₱Php\s,]/gi, "");

  if (!cleaned) {
    throw new MoneyError("Enter an amount.");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new MoneyError("Enter a valid peso amount, like 280 or 280.50.");
  }

  const [pesos, fraction = ""] = cleaned.split(".");
  const centavos =
    Number(pesos) * CENTAVOS_PER_PESO + Number(fraction.padEnd(2, "0"));

  if (!Number.isSafeInteger(centavos)) {
    throw new MoneyError("That amount is too large.");
  }

  return centavos;
}

export function centavosToPesos(centavos: Centavos): number {
  return asCentavos(centavos) / CENTAVOS_PER_PESO;
}

export function formatPeso(
  centavos: Centavos,
  options: { exact?: boolean; sign?: "auto" | "never" } = {},
): string {
  const amount = asCentavos(centavos);
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const pesos = Math.floor(abs / CENTAVOS_PER_PESO);
  const fraction = abs % CENTAVOS_PER_PESO;
  const sign = options.sign === "never" ? "" : negative ? "−" : "";
  const pesoPart = pesos.toLocaleString("en-PH");

  if (fraction === 0 && !options.exact) {
    return `${sign}₱${pesoPart}`;
  }

  return `${sign}₱${pesoPart}.${String(fraction).padStart(2, "0")}`;
}

/** Round half up to the nearest peso. Display-only — never used for settlement. */
export function suggestedPaymentCentavos(exact: Centavos): Centavos {
  const amount = asCentavos(exact);
  const remainder = ((amount % CENTAVOS_PER_PESO) + CENTAVOS_PER_PESO) %
    CENTAVOS_PER_PESO;
  const base = amount - (amount % CENTAVOS_PER_PESO);

  if (amount >= 0) {
    return remainder >= 50 ? base + CENTAVOS_PER_PESO : base;
  }

  return remainder > 50 ? base - CENTAVOS_PER_PESO : base;
}

/**
 * Split a total equally. Leftover centavos are given one-by-one in
 * deterministic user-id order so the parts always sum to the original total.
 */
export function splitEqually(
  total: Centavos,
  participantIds: string[],
): Record<string, Centavos> {
  const amount = asCentavos(total);

  if (participantIds.length === 0) {
    throw new MoneyError("Cannot split an amount among zero people.");
  }

  const unique = [...new Set(participantIds)];
  if (unique.length !== participantIds.length) {
    throw new MoneyError("Duplicate participants in a split.");
  }

  const sorted = [...unique].sort();
  const n = sorted.length;
  const base = Math.trunc(amount / n);
  const remainder = Math.abs(amount % n);
  const sign = amount < 0 ? -1 : 1;

  const shares: Record<string, Centavos> = {};
  sorted.forEach((id, index) => {
    shares[id] = base + (index < remainder ? sign : 0);
  });

  return shares;
}

export function sumCentavos(values: Centavos[]): Centavos {
  return values.reduce((total, value) => total + asCentavos(value), 0);
}
