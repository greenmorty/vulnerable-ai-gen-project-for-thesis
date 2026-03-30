/**
 * Responsibility: Exposes a lightweight in-process event emitter for simulated payment webhook delivery.
 */
import { EventEmitter } from "events";

export interface PaymentWebhookPayload {
  type: "payment.succeeded" | "payment.failed";
  orderId: string;
  paymentId: string;
  providerReference: string;
  status: string;
  amount: number;
  currency: string;
  emittedAt: string;
}

export const paymentEventBus = new EventEmitter();
