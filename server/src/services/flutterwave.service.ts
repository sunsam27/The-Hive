import Flutterwave from 'flutterwave-node-v3';

const flw = new Flutterwave(
  process.env.FLW_PUBLIC_KEY || '',
  process.env.FLW_SECRET_KEY || '',
);

const FLW_SECRET_HASH = process.env.FLW_SECRET_HASH || '';

export interface InitiatePaymentParams {
  txRef: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  redirectUrl: string;
}

export async function initiatePayment(params: InitiatePaymentParams) {
  const payload = {
    tx_ref: params.txRef,
    amount: params.amount,
    currency: params.currency || 'USD',
    redirect_url: params.redirectUrl,
    customer: {
      email: params.customerEmail,
      name: params.customerName,
    },
    meta: {
      txRef: params.txRef,
    },
    configurations: {
      session_duration: 30,
    },
  };

  const response = await flw.MobileMoney.mpesa(payload);
  return response;
}

export async function initiateCardPayment(params: InitiatePaymentParams) {
  const payload = {
    tx_ref: params.txRef,
    amount: params.amount,
    currency: params.currency || 'USD',
    redirect_url: params.redirectUrl,
    customer: {
      email: params.customerEmail,
      name: params.customerName,
    },
    meta: {
      txRef: params.txRef,
    },
  };

  const response = await flw.Charge.card(payload);
  return response;
}

export async function verifyTransaction(transactionId: string) {
  const response = await flw.Transaction.verify({ id: transactionId });
  return response;
}

export function verifyWebhookSignature(signature: string | undefined, body: string): boolean {
  if (!signature || !FLW_SECRET_HASH) return false;
  const expectedHash = FLW_SECRET_HASH;
  return signature === expectedHash;
}

export function generateTxRef(expenseId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `HIVE-${expenseId.slice(0, 8)}-${timestamp}-${random}`;
}
