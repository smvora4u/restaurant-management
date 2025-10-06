import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  actorRole: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string;
  details?: any;
  restaurantId?: string;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorRole: { type: String, required: true },
    actorId: { type: String },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    reason: { type: String },
    details: { type: Schema.Types.Mixed },
    restaurantId: { type: String },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ restaurantId: 1, createdAt: -1 });

const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLog;


