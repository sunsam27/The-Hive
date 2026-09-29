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
  providerSessionId: string | null;
}

export interface ProviderTransaction {
  reference: string;
  transactionId: string | null;
  status: PaymentStatus;
  amount: number | null;
  currency: string | null;
  paidAt: Date | null;
}

export type WebhookEventType =
  | 'payment.succeeded'
  | 'payment.failed'
  | 'account.updated'
  | 'ignored';

export type AccountStatus = 'pending' | 'active' | 'restricted' | 'disabled';

export interface AccountUpdatePayload {
  providerAccountId: string;
  status: AccountStatus;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  businessName: string | null;
}

export interface WebhookEvent {
  type: WebhookEventType;
  reference: string | null;
  transactionId: string | null;
  paidAt: Date | null;
  raw: unknown;
  accountUpdate?: AccountUpdatePayload;
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
  verifyByReference(reference: string, providerSessionId?: string | null): Promise<ProviderTransaction>;
  verifySignature(request: WebhookRequestLike): boolean;
  parseWebhook(request: WebhookRequestLike): WebhookEvent;
}
