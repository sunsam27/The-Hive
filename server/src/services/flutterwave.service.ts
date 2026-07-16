const FLW_API = 'https://api.flutterwave.com/v3';

function getKeys() {
  const publicKey = process.env.FLW_PUBLIC_KEY;
  const secretKey = process.env.FLW_SECRET_KEY;
  if (!publicKey || !secretKey) {
    throw new Error('Flutterwave not configured: FLW_PUBLIC_KEY and FLW_SECRET_KEY must be set');
  }
  return { publicKey, secretKey };
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
  const { secretKey } = getKeys();

  const res = await fetch(`${FLW_API}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: params.txRef,
      amount: params.amount,
      currency: params.currency || 'USD',
      redirect_url: params.redirectUrl,
      customer: {
        email: params.customerEmail,
        name: params.customerName,
      },
    }),
  });

  const json = await res.json();
  if (json.status !== 'success') {
    throw new Error(json.message || 'Payment initialization failed');
  }
  return json;
}

export async function verifyTransaction(transactionId: string) {
  const { secretKey } = getKeys();

  const res = await fetch(`${FLW_API}/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  return res.json();
}

export function getFlwSecretHash(): string {
  return process.env.FLW_SECRET_HASH || '';
}

export function generateTxRef(expenseId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `HIVE-${expenseId.slice(0, 8)}-${timestamp}-${random}`;
}
