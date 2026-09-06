/**
 * Payment provider abstraction.
 *
 * MVP ships a manual marker. GCash (and other PH wallets) should implement
 * this interface later without changing settlement or UI status logic.
 */

export type PaymentMethod = "manual" | "gcash";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed";

export interface PaymentIntent {
  id: string;
  splitId: string;
  fromUserId: string;
  toUserId: string;
  amountCentavos: number;
  method: PaymentMethod;
}

export interface PaymentConfirmation {
  providerRef: string;
  status: PaymentStatus;
  paidAt?: string;
}

export interface PaymentProvider {
  id: PaymentMethod;
  label: string;
  enabled: boolean;
  createIntent(intent: PaymentIntent): Promise<PaymentConfirmation>;
}

export class ManualPaymentProvider implements PaymentProvider {
  id = "manual" as const;
  label = "Mark as paid";
  enabled = true;

  async createIntent(): Promise<PaymentConfirmation> {
    return {
      providerRef: `manual_${crypto.randomUUID()}`,
      status: "paid",
      paidAt: new Date().toISOString(),
    };
  }
}

export class GCashPaymentProvider implements PaymentProvider {
  id = "gcash" as const;
  label = "Pay with GCash";
  enabled = false;

  async createIntent(): Promise<PaymentConfirmation> {
    throw new Error("GCash checkout is not available yet.");
  }
}

export const paymentProviders: Record<PaymentMethod, PaymentProvider> = {
  manual: new ManualPaymentProvider(),
  gcash: new GCashPaymentProvider(),
};
