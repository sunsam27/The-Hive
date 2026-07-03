export async function generateInvoiceNumber(db: any): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const last = await db('invoices')
    .where('invoice_number', 'like', `${prefix}%`)
    .orderBy('invoice_number', 'desc')
    .first();

  let nextNum = 1;
  if (last) {
    const parts = last.invoice_number.split('-');
    nextNum = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}${String(nextNum).padStart(5, '0')}`;
}
