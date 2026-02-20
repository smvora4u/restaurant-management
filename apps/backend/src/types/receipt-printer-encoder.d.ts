declare module '@point-of-sale/receipt-printer-encoder' {
  interface EncoderOptions {
    columns?: number;
    language?: string;
    codepageMapping?: string;
  }

  interface ReceiptPrinterEncoder {
    initialize(): this;
    text(text: string): this;
    line(text: string): this;
    newline(count?: number): this;
    align(align: 'left' | 'center' | 'right'): this;
    bold(enabled: boolean): this;
    encode(): Uint8Array;
  }

  const ReceiptPrinterEncoder: new (options?: EncoderOptions) => ReceiptPrinterEncoder;
  export default ReceiptPrinterEncoder;
}
