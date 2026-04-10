import mongoose, { Schema } from 'mongoose';

export type PrintJobKind = 'bill' | 'kot' | 'test';
export type PrintJobStatus = 'pending' | 'printed' | 'failed';

export interface IPrintJob {
  restaurantId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  kind: PrintJobKind;
  content: Buffer;
  status: PrintJobStatus;
  createdAt: Date;
  updatedAt: Date;
}

const PrintJobSchema = new Schema<IPrintJob>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: false },
    kind: { type: String, enum: ['bill', 'kot', 'test'], required: true },
    content: { type: Buffer, required: true },
    status: {
      type: String,
      enum: ['pending', 'printed', 'failed'],
      default: 'pending',
      index: true
    }
  },
  { timestamps: true }
);

PrintJobSchema.index({ restaurantId: 1, status: 1, createdAt: 1 });

export default mongoose.model<IPrintJob>('PrintJob', PrintJobSchema);
