/**
 * Fixed-width text helpers for thermal receipts (58mm ≈ 32 cols, 80mm ≈ 48 cols).
 * Used to build lines before feeding ReceiptPrinterEncoder.
 */

export function receiptColumnsFromBillSize(billSize: string | undefined): number {
  return billSize === '58mm' ? 32 : 48;
}

/** Single line of dashes (ASCII) for section breaks. */
export function dividerLine(width: number): string {
  return '-'.repeat(Math.max(3, width));
}

/**
 * Left string + right string padded to `width` columns (single-line).
 * Truncates left side if needed so right side stays visible.
 */
export function padTwoColumns(left: string, right: string, width: number): string {
  const r = String(right);
  const maxLeft = Math.max(1, width - 1 - r.length);
  let l = String(left);
  if (l.length > maxLeft) {
    l = l.slice(0, Math.max(0, maxLeft - 1)) + '…';
  }
  const gap = width - l.length - r.length;
  if (gap >= 1) {
    return l + ' '.repeat(gap) + r;
  }
  return (l + r).slice(0, width);
}

export function truncateToWidth(s: string, width: number): string {
  const str = String(s);
  if (str.length <= width) return str;
  if (width <= 1) return '…';
  return str.slice(0, width - 1) + '…';
}

/** Wrap long text into multiple lines of at most `width` chars (word-aware when possible). */
export function wrapLines(text: string, width: number): string[] {
  const t = text.trim();
  if (t.length === 0) return [];
  if (t.length <= width) return [t];
  const words = t.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (w.length > width) {
      if (cur) {
        lines.push(cur);
        cur = '';
      }
      for (let i = 0; i < w.length; i += width) {
        lines.push(w.slice(i, i + width));
      }
      continue;
    }
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= width) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
