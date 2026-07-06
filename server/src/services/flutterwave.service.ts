import Flutterwave from 'flutterwave-node-v3';

function getFlw(): Flutterwave {
  const publicKey = process.env.FLW_PUBLIC_KEY;
  const secretKey = process.env.FLW_SECRET_KEY;
  if (!publicKey || !secretKey) {
    throw new Error('Flutterwave not configured: FLW_PUBLIC_KEY and FLW_SECRET_KEY must be set');
  }
  return new Flutterwave(publicKey, secretKey);
}

function getFlwSecretHash(): string {
  return process.env.FLW_SECRET_HASH || '';
}

export interface InitiatePaymentParams {
  txRef: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  redirectUrl: string;
}

export async function initiatePayment(params: InitiatePaymentParams) {
  const flw = getFlw();
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
  const flw = getFlw();
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
  const flw = getFlw();
  const response = await flw.Transaction.verify({ id: transactionId });
  return response;
}

export function verifyWebhookSignature(signature: string | undefined): boolean {
  const hash = getFlwSecretHash();
  if (!signature || !hash) return false;
  return signature === hash;
}

export function generateTxRef(expenseId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `HIVE-${expenseId.slice(0, 8)}-${timestamp}-${random}`;
}
