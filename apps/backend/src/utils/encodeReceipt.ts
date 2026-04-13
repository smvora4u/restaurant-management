/**
 * Encodes order to ESC/POS bytes for thermal receipt printing.
 * Uses @point-of-sale/receipt-printer-encoder + fixed-width layout helpers.
 */

import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';
import {
  dividerLine,
  padTwoColumns,
  receiptColumnsFromBillSize,
  wrapLines,
  truncateToWidth
} from '../print/formatter.js';

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return `${currency} ${amount.toFixed(2)}`;
}

const RECEIPT_DATE_OPTS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
};

/** Format order date for receipts - uses order time only, never print time */
function formatOrderDate(order: ReceiptOrder, timeZone?: string): string {
  const val = order?.createdAt ?? (order as any)?.created_at;
  if (val == null || val === '') return 'Order date unavailable';
  const d = typeof val === 'string' ? new Date(val) : val;
  if (!d || Number.isNaN(d.getTime())) return 'Order date unavailable';
  const tz = timeZone?.trim() || 'UTC';
  try {
    return d.toLocaleString('en-US', { ...RECEIPT_DATE_OPTS, timeZone: tz });
  } catch {
    return d.toLocaleString('en-US', { ...RECEIPT_DATE_OPTS, timeZone: 'UTC' });
  }
}

export interface ReceiptOrderItem {
  menuItemId: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
}

export interface ReceiptOrder {
  id: string;
  tableNumber?: string;
  orderType: string;
  items: ReceiptOrderItem[];
  totalAmount: number;
  customerName?: string;
  customerPhone?: string;
  createdAt?: Date | string;
}

export interface ReceiptRestaurant {
  name: string;
  settings?: { billSize?: string; currency?: string; timezone?: string };
}

export interface ReceiptMenuItem {
  id: string;
  name: string;
}

export function encodeReceiptToEscPos(
  order: ReceiptOrder,
  restaurant: ReceiptRestaurant,
  menuItems: ReceiptMenuItem[]
): Uint8Array {
  const billSize = restaurant?.settings?.billSize || '80mm';
  const columns = receiptColumnsFromBillSize(billSize);
  const currency = restaurant?.settings?.currency || 'USD';

  const encoder = new ReceiptPrinterEncoder({
    columns,
    language: 'esc-pos',
    codepageMapping: 'epson'
  });

  const itemNameMap = new Map(menuItems.map((m) => [m.id, m.name]));

  const dateStr = formatOrderDate(order, restaurant?.settings?.timezone);

  const tableInfo =
    order.orderType === 'dine-in' && order.tableNumber
      ? `Table: ${order.tableNumber}`
      : order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1);

  const orderIdShort = String(order.id).slice(-8);

  encoder
    .initialize()
    .align('center')
    .bold(true)
    .line(restaurant?.name || 'Restaurant')
    .bold(false)
    .newline()
    .align('left')
    .line(dividerLine(columns))
    .line(`Order #${orderIdShort}  ${tableInfo}`)
    .line(dateStr);

  if (order.customerName) encoder.line(order.customerName);
  if (order.customerPhone) encoder.line(order.customerPhone);

  encoder.newline().line(dividerLine(columns)).newline();

  order.items.forEach((item) => {
    const name = itemNameMap.get(item.menuItemId) || `Item ${String(item.menuItemId).slice(-6)}`;
    const lineTotal = item.quantity * item.price;
    const qtyPrefix = `${item.quantity} x `;
    const restCols = Math.max(8, columns - qtyPrefix.length);
    const nameLines = wrapLines(name, restCols);
    if (nameLines.length === 0) return;
    const firstLine = padTwoColumns(
      `${qtyPrefix}${nameLines[0]}`,
      formatCurrency(lineTotal, currency),
      columns
    );
    encoder.line(firstLine);
    for (let i = 1; i < nameLines.length; i++) {
      encoder.line(truncateToWidth(`   ${nameLines[i]}`, columns));
    }
    if (item.specialInstructions) {
      wrapLines(`(${item.specialInstructions})`, columns - 3).forEach((ln) => {
        encoder.line(`   ${truncateToWidth(ln, columns - 3)}`);
      });
    }
  });

  encoder
    .newline()
    .line(dividerLine(columns))
    .bold(true)
    .line(padTwoColumns('Total', formatCurrency(order.totalAmount, currency), columns))
    .bold(false)
    .newline()
    .align('center')
    .line('Thank you!')
    .newline(2)
    .cut('partial');

  return encoder.encode();
}

export function encodeKOTToEscPos(
  order: ReceiptOrder,
  restaurant: ReceiptRestaurant,
  menuItems: ReceiptMenuItem[]
): Uint8Array {
  const billSize = restaurant?.settings?.billSize || '80mm';
  const columns = receiptColumnsFromBillSize(billSize);

  const encoder = new ReceiptPrinterEncoder({
    columns,
    language: 'esc-pos',
    codepageMapping: 'epson'
  });

  const itemNameMap = new Map(menuItems.map((m) => [m.id, m.name]));

  const dateStr = formatOrderDate(order, restaurant?.settings?.timezone);

  const tableInfo =
    order.orderType === 'dine-in' && order.tableNumber
      ? `Table: ${order.tableNumber}`
      : order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1);

  const orderIdShort = String(order.id).slice(-8);

  encoder
    .initialize()
    .align('center')
    .bold(true)
    .line(restaurant?.name || 'Restaurant')
    .bold(false)
    .newline()
    .align('left')
    .line(dividerLine(columns))
    .line(`Order #${orderIdShort}  ${tableInfo}`)
    .line(dateStr);

  if (order.customerName) encoder.line(order.customerName);
  if (order.customerPhone) encoder.line(order.customerPhone);

  encoder.newline().line(dividerLine(columns)).newline();

  order.items.forEach((item) => {
    const name = itemNameMap.get(item.menuItemId) || `Item ${String(item.menuItemId).slice(-6)}`;
    const qtyPrefix = `${item.quantity} x `;
    const restCols = Math.max(8, columns - qtyPrefix.length);
    const nameLines = wrapLines(name, restCols);
    if (nameLines.length === 0) return;
    encoder.line(`${qtyPrefix}${nameLines[0]}`);
    for (let i = 1; i < nameLines.length; i++) {
      encoder.line(truncateToWidth(`   ${nameLines[i]}`, columns));
    }
    if (item.specialInstructions) {
      wrapLines(`(${item.specialInstructions})`, columns - 3).forEach((ln) => {
        encoder.line(`   ${truncateToWidth(ln, columns - 3)}`);
      });
    }
  });

  encoder
    .newline()
    .line(dividerLine(columns))
    .align('center')
    .line('KITCHEN')
    .newline(2)
    .cut('partial');

  return encoder.encode();
}
