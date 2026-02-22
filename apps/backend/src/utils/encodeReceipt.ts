/**
 * Encodes order to ESC/POS bytes for thermal receipt printing.
 * Mirrors the logic in apps/web BillPrint.ts for consistency.
 * Uses minimal ESC/POS (init, text, newline, cut) for maximum printer compatibility.
 */

import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return `${currency} ${amount.toFixed(2)}`;
}

/** ESC/POS commands - minimal set for compatibility */
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

function toAscii(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    bytes.push(c <= 127 ? c : 0x3f); // non-ASCII -> ?
  }
  return bytes;
}

/**
 * Minimal receipt encoding: only ESC @ (init), text, newlines, cut.
 * Avoids character-mode (0x1c 0x2e) and other commands some printers reject.
 */
export function encodeReceiptMinimal(
  order: ReceiptOrder,
  restaurant: ReceiptRestaurant,
  menuItems: ReceiptMenuItem[]
): Uint8Array {
  const currency = restaurant?.settings?.currency || 'USD';
  const itemNameMap = new Map(menuItems.map((m) => [m.id, m.name]));
  const createdAt =
    typeof order.createdAt === 'string' ? new Date(order.createdAt) : order.createdAt;
  const dateStr = createdAt.toLocaleString();
  const orderTypeLabel = order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1);
  const orderIdShort = String(order.id).slice(-8);

  const lines: number[] = [];
  const add = (b: number | number[]) => {
    if (Array.isArray(b)) lines.push(...b);
    else lines.push(b);
  };
  const line = (s: string) => {
    add(toAscii(s));
    add(LF);
  };

  add([ESC, 0x40]); // init
  add([ESC, 0x61, 0x01]); // center
  add([ESC, 0x45, 0x01]); // bold
  line(restaurant?.name || 'Restaurant');
  add([ESC, 0x45, 0x00]); // bold off
  add(LF);
  add([ESC, 0x61, 0x00]); // left
  line(`Order #${orderIdShort}  ${orderTypeLabel}`);
  if (order.orderType === 'dine-in' && order.tableNumber != null) {
    line(`Table: ${order.tableNumber}`);
  }
  line(dateStr);
  if (order.customerName) line(order.customerName);
  if (order.customerPhone) line(order.customerPhone);
  add(LF);

  order.items.forEach((item) => {
    const name = itemNameMap.get(item.menuItemId) || `Item ${String(item.menuItemId).slice(-6)}`;
    const lineTotal = item.quantity * item.price;
    line(`${item.quantity} x ${name} - ${formatCurrency(lineTotal, currency)}`);
    if (item.specialInstructions) line(`   (${item.specialInstructions})`);
  });

  add(LF);
  add([ESC, 0x45, 0x01]);
  line(`Total: ${formatCurrency(order.totalAmount, currency)}`);
  add([ESC, 0x45, 0x00]);
  add(LF);
  add([ESC, 0x61, 0x01]);
  line('Thank you!');
  add([LF, LF, LF, LF, LF, LF]); // extra feed so text prints before cut
  add([GS, 0x56, 0x01]); // partial cut

  return new Uint8Array(lines);
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
  createdAt: Date | string;
}

export interface ReceiptRestaurant {
  name: string;
  settings?: { billSize?: string; currency?: string };
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
  const columns = billSize === '58mm' ? 32 : 48;
  const currency = restaurant?.settings?.currency || 'USD';

  const encoder = new ReceiptPrinterEncoder({
    columns,
    language: 'esc-pos',
    codepageMapping: 'epson'
  });

  const itemNameMap = new Map(menuItems.map((m) => [m.id, m.name]));

  const createdAt =
    typeof order.createdAt === 'string' ? new Date(order.createdAt) : order.createdAt;
  const dateStr = createdAt.toLocaleString();

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
    .line(`Order #${orderIdShort}  ${tableInfo}`)
    .line(dateStr);

  if (order.customerName) encoder.line(order.customerName);
  if (order.customerPhone) encoder.line(order.customerPhone);

  encoder.newline();

  order.items.forEach((item) => {
    const name = itemNameMap.get(item.menuItemId) || `Item ${String(item.menuItemId).slice(-6)}`;
    const lineTotal = item.quantity * item.price;
    const line = `${item.quantity} x ${name} - ${formatCurrency(lineTotal, currency)}`;
    encoder.line(line);
    if (item.specialInstructions) {
      encoder.line(`   (${item.specialInstructions})`);
    }
  });

  encoder
    .newline()
    .bold(true)
    .line(`Total: ${formatCurrency(order.totalAmount, currency)}`)
    .bold(false)
    .newline()
    .align('center')
    .line('Thank you!')
    .newline(2)
    .cut('partial');

  return encoder.encode();
}
