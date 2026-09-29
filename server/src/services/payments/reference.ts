export function generatePaymentReference(expenseId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `FINSYTE-${expenseId.slice(0, 8)}-${timestamp}-${random}`;
}
