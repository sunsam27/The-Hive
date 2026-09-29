export type PaymentStatus = 'pending' | 'completed' | 'failed';

export interface CheckoutRequest {
  reference: string;
  grossAmount: number;
  netAmount: number;
  platformFee: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  description?: string;
  redirectUrl: string;
  destinationAccountId: string | null;
}

export interface CheckoutSession {
  reference: string;
  checkoutUrl: string;
}

export interface ProviderTransaction {
  reference: string;
  transactionId: string | null;
  status: PaymentStatus;
  amount: number | null;
  currency: string | null;
  paidAt: Date | null;
}

export type WebhookEventType = 'payment.succeeded' | 'payment.failed' | 'ignored';

export interface WebhookEvent {
  type: WebhookEventType;
  reference: string | null;
  transactionId: string | null;
  paidAt: Date | null;
  raw: unknown;
}

export interface WebhookRequestLike {
  body: unknown;
  rawBody: string | null;
  headers: Record<string, string | string[] | undefined>;
}

export interface PaymentProvider {
  readonly name: string;
  readonly routedCurrencies: readonly string[];
  isConfigured(): boolean;
  supportsCurrency(currency: string): boolean;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  verifyByReference(reference: string): Promise<ProviderTransaction>;
  verifySignature(request: WebhookRequestLike): boolean;
  parseWebhook(request: WebhookRequestLike): WebhookEvent;
}
