/**
 * Direct printer service for USB/Serial thermal printers via WebUSB (Linux/macOS)
 * or Web Serial (Windows). Browsers block WebUSB on Windows when printer driver
 * claims the device; Web Serial works via virtual COM port.
 */

const STORAGE_KEY = 'receiptPrinterDevice';

export interface PrinterDeviceInfo {
  type: 'usb' | 'serial';
  vendorId: number;
  productId: number;
  serialNumber?: string;
  manufacturerName?: string;
  productName?: string;
  language?: string;
  codepageMapping?: string;
}

export interface DirectPrinterState {
  isConnected: boolean;
  lastDevice: PrinterDeviceInfo | null;
  printerName: string | null;
}

type StateListener = (state: DirectPrinterState) => void;

let state: DirectPrinterState = {
  isConnected: false,
  lastDevice: null,
  printerName: null
};

const listeners = new Set<StateListener>();

function notifyListeners() {
  listeners.forEach((fn) => fn(state));
}

function setState(partial: Partial<DirectPrinterState>) {
  state = { ...state, ...partial };
  notifyListeners();
}

function isWindows(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent?.toLowerCase() ?? '';
  return ua.includes('windows') || ua.includes('win32');
}

export function isDirectPrintSupported(): boolean {
  if (typeof navigator === 'undefined') return false;
  return !!(navigator.usb || navigator.serial);
}

let activePrinter: { print: (data: Uint8Array) => Promise<void>; disconnect: () => Promise<void> } | null = null;

export async function connect(): Promise<boolean> {
  if (!isDirectPrintSupported()) {
    console.warn('Direct print not supported (need Chrome/Edge with WebUSB or Web Serial)');
    return false;
  }

  try {
    if (isWindows() && navigator.serial) {
      const WebSerialReceiptPrinter = (await import('@point-of-sale/webserial-receipt-printer')).default;
      const printer = new WebSerialReceiptPrinter();
      await new Promise<void>((resolve, reject) => {
        printer.addEventListener('connected', (device: PrinterDeviceInfo) => {
          const info: PrinterDeviceInfo = {
            type: 'serial',
            vendorId: device.vendorId ?? 0,
            productId: device.productId ?? 0
          };
          setState({
            isConnected: true,
            lastDevice: info,
            printerName: 'Serial Printer'
          });
          saveDevice(info);
          activePrinter = {
            print: (data) => printer.print(data),
            disconnect: () => printer.disconnect()
          };
          resolve();
        });
        printer.connect().catch(reject);
      });
      return true;
    }

    if (navigator.usb) {
      const WebUSBReceiptPrinter = (await import('@point-of-sale/webusb-receipt-printer')).default;
      const printer = new WebUSBReceiptPrinter();
      await new Promise<void>((resolve, reject) => {
        printer.addEventListener('connected', (device: PrinterDeviceInfo) => {
          const info: PrinterDeviceInfo = {
            type: 'usb',
            vendorId: device.vendorId,
            productId: device.productId,
            serialNumber: device.serialNumber,
            manufacturerName: device.manufacturerName,
            productName: device.productName,
            language: device.language,
            codepageMapping: device.codepageMapping
          };
          const name = [device.manufacturerName, device.productName].filter(Boolean).join(' ') || 'USB Printer';
          setState({
            isConnected: true,
            lastDevice: info,
            printerName: name
          });
          saveDevice(info);
          activePrinter = {
            print: (data) => printer.print(data),
            disconnect: () => printer.disconnect()
          };
          resolve();
        });
        printer.connect().catch(reject);
      });
      return true;
    }
  } catch (err) {
    console.warn('Direct printer connect failed:', err);
    return false;
  }

  return false;
}

export async function reconnect(): Promise<boolean> {
  const saved = loadDevice();
  if (!saved || !isDirectPrintSupported()) return false;

  try {
    if (saved.type === 'serial' && navigator.serial) {
      const WebSerialReceiptPrinter = (await import('@point-of-sale/webserial-receipt-printer')).default;
      const printer = new WebSerialReceiptPrinter();
      await new Promise<void>((resolve, reject) => {
        printer.addEventListener('connected', () => {
          setState({
            isConnected: true,
            lastDevice: saved,
            printerName: 'Serial Printer'
          });
          activePrinter = {
            print: (data) => printer.print(data),
            disconnect: () => printer.disconnect()
          };
          resolve();
        });
        printer.reconnect(saved).catch(reject);
      });
      return true;
    }

    if (saved.type === 'usb' && navigator.usb) {
      const WebUSBReceiptPrinter = (await import('@point-of-sale/webusb-receipt-printer')).default;
      const printer = new WebUSBReceiptPrinter();
      await new Promise<void>((resolve, reject) => {
        printer.addEventListener('connected', (device: PrinterDeviceInfo) => {
          const name = [device.manufacturerName, device.productName].filter(Boolean).join(' ') || 'USB Printer';
          setState({
            isConnected: true,
            lastDevice: saved,
            printerName: name
          });
          activePrinter = {
            print: (data) => printer.print(data),
            disconnect: () => printer.disconnect()
          };
          resolve();
        });
        printer.reconnect(saved).catch(reject);
      });
      return true;
    }
  } catch {
    clearDevice();
    setState({ isConnected: false, lastDevice: null, printerName: null });
    activePrinter = null;
    return false;
  }

  return false;
}

export async function disconnect(): Promise<void> {
  if (activePrinter) {
    await activePrinter.disconnect();
    activePrinter = null;
  }
  clearDevice();
  setState({ isConnected: false, lastDevice: null, printerName: null });
}

export async function printReceipt(encodedBytes: Uint8Array): Promise<boolean> {
  if (!activePrinter) return false;
  try {
    await activePrinter.print(encodedBytes);
    return true;
  } catch (err) {
    console.warn('Direct print failed:', err);
    return false;
  }
}

export function getState(): DirectPrinterState {
  return { ...state };
}

export function subscribe(listener: StateListener): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

function saveDevice(info: PrinterDeviceInfo) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  } catch {}
}

function loadDevice(): PrinterDeviceInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearDevice() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
