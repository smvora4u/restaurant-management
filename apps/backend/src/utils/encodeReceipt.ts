/**
 * Encodes order to ESC/POS bytes for thermal receipt printing.
 * Mirrors the logic in apps/web BillPrint.ts for consistency.
 */

import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return `${currency} ${amount.toFixed(2)}`;
}

export interface ReceiptOrderItem {
  menuItemId: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
}

export interface ReceiptOrder {
  id: string;
  tableNumber?: number;
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
    .newline(2);

  return encoder.encode();
}
