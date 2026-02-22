import { formatCurrencyFromRestaurant } from '../../utils/currency';
import {
  isDirectPrintSupported,
  getState,
  printReceipt
} from '../../services/directPrinter';
import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';

export interface BillPrintOrderItem {
  menuItemId: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
}

export interface BillPrintOrder {
  id: string;
  tableNumber?: number;
  orderType: string;
  items: BillPrintOrderItem[];
  totalAmount: number;
  customerName?: string;
  customerPhone?: string;
  createdAt: string | Date | number;
}

export interface BillPrintMenuItem {
  id: string;
  name: string;
}

export interface BillPrintRestaurant {
  name: string;
  settings?: {
    billSize?: string;
    currency?: string;
    networkPrinter?: { host: string; port: number };
  };
}

/**
 * Encodes receipt content to ESC/POS bytes for thermal printers.
 */
function encodeReceiptToEscPos(
  order: BillPrintOrder,
  restaurant: BillPrintRestaurant,
  menuItems: BillPrintMenuItem[]
): Uint8Array {
  const billSize = restaurant?.settings?.billSize || '80mm';
  const columns = billSize === '58mm' ? 32 : 48;

  const encoder = new ReceiptPrinterEncoder({
    columns,
    language: 'esc-pos',
    codepageMapping: 'epson'
  });

  const itemNameMap = new Map(menuItems.map((m) => [m.id, m.name]));

  const createdAt =
    typeof order.createdAt === 'string' || typeof order.createdAt === 'number'
      ? new Date(order.createdAt)
      : order.createdAt;
  const dateStr = createdAt.toLocaleString();

  const tableInfo =
    order.orderType === 'dine-in' && order.tableNumber
      ? `Table: ${order.tableNumber}`
      : order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1);

  encoder
    .initialize()
    .align('center')
    .bold(true)
    .line(restaurant?.name || 'Restaurant')
    .bold(false)
    .newline()
    .align('left')
    .line(`Order #${order.id.slice(-8)}  ${tableInfo}`)
    .line(dateStr);

  if (order.customerName) encoder.line(order.customerName);
  if (order.customerPhone) encoder.line(order.customerPhone);

  encoder.newline();

  order.items.forEach((item) => {
    const name = itemNameMap.get(item.menuItemId) || `Item ${item.menuItemId.slice(-6)}`;
    const lineTotal = item.quantity * item.price;
    const line = `${item.quantity} x ${name} - ${formatCurrencyFromRestaurant(lineTotal, restaurant)}`;
    encoder.line(line);
    if (item.specialInstructions) {
      encoder.line(`   (${item.specialInstructions})`);
    }
  });

  encoder
    .newline()
    .bold(true)
    .line(`Total: ${formatCurrencyFromRestaurant(order.totalAmount, restaurant)}`)
    .bold(false)
    .newline()
    .align('center')
    .line('Thank you!')
    .newline(2);

  return encoder.encode();
}

/**
 * Fallback: opens a print window with HTML receipt and calls window.print().
 */
function printViaBrowser(
  order: BillPrintOrder,
  restaurant: BillPrintRestaurant,
  menuItems: BillPrintMenuItem[],
  autoPrint: boolean
): void {
  const billSize = restaurant?.settings?.billSize || '80mm';
  const width = billSize === '58mm' ? '58mm' : '80mm';
  const maxWidth = billSize === '58mm' ? '155px' : '230px';

  const itemNameMap = new Map(menuItems.map((m) => [m.id, m.name]));

  const rows = order.items
    .map((item) => {
      const name = itemNameMap.get(item.menuItemId) || `Item ${item.menuItemId.slice(-6)}`;
      const lineTotal = item.quantity * item.price;
      const line = `${item.quantity} x ${name} - ${formatCurrencyFromRestaurant(lineTotal, restaurant)}`;
      return item.specialInstructions
        ? `${line}\n   (${item.specialInstructions})`
        : line;
    })
    .join('\n');

  const createdAt =
    typeof order.createdAt === 'string' || typeof order.createdAt === 'number'
      ? new Date(order.createdAt)
      : order.createdAt;
  const dateStr = createdAt.toLocaleString();

  const tableInfo =
    order.orderType === 'dine-in' && order.tableNumber
      ? `Table: ${order.tableNumber}`
      : order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bill - Order #${order.id.slice(-8)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      width: ${width};
      max-width: ${maxWidth};
      margin: 0 auto;
      padding: 8px;
      line-height: 1.3;
    }
    .receipt { width: 100%; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    .items { white-space: pre-wrap; margin: 8px 0; font-size: 11px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="center bold" style="font-size: 14px; margin-bottom: 4px;">${escapeHtml(restaurant?.name || 'Restaurant')}</div>
    <div class="divider"></div>
    <div class="row"><span>Order #${order.id.slice(-8)}</span><span>${escapeHtml(tableInfo)}</span></div>
    <div class="row"><span>${escapeHtml(dateStr)}</span></div>
    ${order.customerName ? `<div class="row">${escapeHtml(order.customerName)}</div>` : ''}
    ${order.customerPhone ? `<div class="row">${escapeHtml(order.customerPhone)}</div>` : ''}
    <div class="divider"></div>
    <div class="items">${escapeHtml(rows)}</div>
    <div class="divider"></div>
    <div class="row bold"><span>Total</span><span>${formatCurrencyFromRestaurant(order.totalAmount, restaurant)}</span></div>
    <div class="center" style="margin-top: 12px; font-size: 10px;">Thank you!</div>
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.warn('Could not open print window. Pop-up may be blocked.');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();

  if (autoPrint) {
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    }, 250);
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export interface PrintBillOptions {
  /** When provided and restaurant has networkPrinter configured, tries network print first */
  requestNetworkPrint?: (orderId: string) => Promise<boolean>;
}

/**
 * Hybrid print: tries network printer (if configured), then direct USB/Serial, then browser print dialog.
 * @param order - Order data
 * @param restaurant - Restaurant data (name, settings.billSize, settings.currency, settings.networkPrinter)
 * @param menuItems - Menu items for resolving item names
 * @param autoPrint - If true (default), triggers print immediately. For browser fallback, calls window.print().
 * @param options - Optional requestNetworkPrint fn for network printer path
 */
export function printBill(
  order: BillPrintOrder,
  restaurant: BillPrintRestaurant,
  menuItems: BillPrintMenuItem[],
  autoPrint = true,
  options?: PrintBillOptions
): void {
  const encodedBytes = encodeReceiptToEscPos(order, restaurant, menuItems);

  // 1. Try network print when fn provided (backend is source of truth for proxy connectivity)
  if (options?.requestNetworkPrint) {
    options.requestNetworkPrint(order.id).then((ok) => {
      if (ok) return;
      tryLocalOrBrowser();
    }).catch(() => tryLocalOrBrowser());
    return;
  }

  tryLocalOrBrowser();

  function tryLocalOrBrowser() {
    // 2. Try direct USB/Serial if supported and connected
    if (isDirectPrintSupported()) {
      const state = getState();
      if (state.isConnected) {
        printReceipt(encodedBytes).then((ok) => {
          if (!ok) {
            printViaBrowser(order, restaurant, menuItems, autoPrint);
          }
        });
        return;
      }
    }
    // 3. Fallback: browser print dialog
    printViaBrowser(order, restaurant, menuItems, autoPrint);
  }
}

/**
 * Export for use when backend sends network print - caller provides pre-encoded bytes.
 * Used by network printer path (Phase 2).
 */
export { encodeReceiptToEscPos };
