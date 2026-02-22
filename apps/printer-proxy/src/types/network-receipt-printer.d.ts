declare module '@point-of-sale/network-receipt-printer' {
  interface NetworkReceiptPrinterOptions {
    host: string;
    port?: number;
  }

  interface NetworkReceiptPrinter {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    print(data: Uint8Array): Promise<void>;
    addEventListener(event: 'connected', handler: (device: { type: string }) => void): void;
    addEventListener(event: 'disconnected', handler: () => void): void;
  }

  const NetworkReceiptPrinter: new (options?: NetworkReceiptPrinterOptions) => NetworkReceiptPrinter;
  export default NetworkReceiptPrinter;
}
