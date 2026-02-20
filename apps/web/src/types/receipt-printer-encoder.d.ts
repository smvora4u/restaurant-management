declare module '@point-of-sale/receipt-printer-encoder' {
  interface EncoderOptions {
    columns?: number;
    language?: string;
  }

  interface ReceiptPrinterEncoder {
    initialize(): this;
    text(text: string): this;
    newline(): this;
    encode(): Uint8Array;
  }

  const ReceiptPrinterEncoder: new (options?: EncoderOptions) => ReceiptPrinterEncoder;
  export default ReceiptPrinterEncoder;
}
