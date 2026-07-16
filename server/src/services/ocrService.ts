interface OcrSpaceResponse {
  IsErroredOnProcessing: boolean;
  ErrorMessage?: string[];
  ParsedResults?: Array<{ ParsedText: string }>;
}

interface ReceiptData {
  text: string;
  amount: string;
  currency: string | null;
  merchant: string;
  date: string;
}

const OCR_SPACE_API = 'https://api.ocr.space/parse/image';

export async function extractReceiptData(imageBuffer: ArrayBuffer): Promise<ReceiptData> {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) throw new Error('OCR service is not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const body = new FormData();
    body.append('file', new Blob([imageBuffer]), 'receipt.png');
    body.append('apikey', apiKey);
    body.append('language', 'eng');
    body.append('OCREngine', '2');
    body.append('isOverlayRequired', 'false');

    const res = await fetch(OCR_SPACE_API, { method: 'POST', body, signal: controller.signal });
    const json: OcrSpaceResponse = await res.json();

    if (json.IsErroredOnProcessing) {
      throw new Error(json.ErrorMessage?.[0] || 'OCR processing failed');
    }

    const text = json.ParsedResults?.[0]?.ParsedText || '';
    const amount = extractAmount(text);
    const currency = extractCurrency(text);
    const merchant = extractMerchant(text);
    const date = extractDate(text);

    return { text, amount, currency, merchant, date };
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('Receipt processing timed out — try a smaller image');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function parseAmount(str: string): string | null {
  const cleaned = str.replace(/,/g, '');
  const val = parseFloat(cleaned);
  if (isNaN(val) || val <= 0 || val >= 100000) return null;
  return val.toFixed(2);
}

function extractAmount(text: string): string {
  const lines = text.split('\n');

  const keywords = [
    /(?:grand\s+)?total/i, /amount\s+due/i, /please\s+pay/i,
    /total\s+due/i, /balance\s+due/i, /amount/i, /due/i,
    /subtotal/i, /sum/i, /balance/i, /price/i, /pay/i,
    /charge/i, /cost/i, /net/i, /final/i, /you\s+pay/i,
    /sale/i, /payment/i, /amount\s+charged/i,
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    const keywordMatch = keywords.some((k) => k.test(trimmed));
    if (!keywordMatch) continue;
    const m = trimmed.match(/[\$€£¥]?\s*([\d,]+\.\d{2})\s*$/);
    if (m) {
      const result = parseAmount(m[1]);
      if (result) return result;
    }
  }

  const currencyMatch = text.match(/[\$€£¥]\s*([\d,]+\.\d{2})/);
  if (currencyMatch) {
    const result = parseAmount(currencyMatch[1]);
    if (result) return result;
  }

  const allAmounts = [...text.matchAll(/([\d,]+\.\d{2})/g)];
  if (allAmounts.length > 0) {
    const last = allAmounts[allAmounts.length - 1][1];
    const result = parseAmount(last);
    if (result) return result;
  }

  return '';
}

function extractCurrency(text: string): string | null {
  const match = text.match(/[\$€£¥]/);
  if (!match) return null;
  const map: Record<string, string> = { '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY' };
  return map[match[0]];
}

function extractMerchant(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    const first = lines[0].replace(/[^\w\s'&-]/g, '').trim();
    if (first.length > 2 && first.length < 80) return first;
  }
  return '';
}

function extractDate(text: string): string {
  const patterns = [
    /(\d{2})[\/-](\d{2})[\/-](\d{4})/,
    /(\d{4})[\/-](\d{2})[\/-](\d{2})/,
    /(\d{1,2})\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern.source.startsWith('(\\d{1,2})')) {
        const months: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
        const mon = Object.entries(months).find(([k]) => match[0].toLowerCase().includes(k));
        if (mon) return `${match[2]}-${mon[1]}-${match[1].padStart(2, '0')}`;
        return '';
      }
      const [, a, b, c] = match;
      if (c.length === 4) return `${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
      if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
    }
  }
  return '';
}
