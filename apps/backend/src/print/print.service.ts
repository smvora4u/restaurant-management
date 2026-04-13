import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Order, MenuItem, Restaurant, PrintJob } from '../models/index.js';
import type { PrintJobKind } from '../models/PrintJob.js';
import {
  encodeReceiptToEscPos,
  encodeKOTToEscPos,
  type ReceiptOrder,
  type ReceiptRestaurant,
  type ReceiptMenuItem
} from '../utils/encodeReceipt.js';

const MAX_PENDING_BATCH = 50;

const TEST_ESC_POS = new Uint8Array([
  0x1b, 0x40, 0x54, 0x65, 0x73, 0x74, 0x20, 0x70, 0x72, 0x69, 0x6e, 0x74, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x01
]);

/**
 * `.lean()` may return `content` as a Node Buffer, BSON Binary, or Uint8Array depending on
 * Mongoose/driver version; `Buffer.from(unknown)` can yield an empty buffer for BSON Binary.
 */
function printJobContentToBuffer(content: unknown): Buffer {
  if (content == null) return Buffer.alloc(0);
  if (Buffer.isBuffer(content)) return content;
  if (content instanceof Uint8Array) {
    return Buffer.from(content.buffer, content.byteOffset, content.byteLength);
  }
  if (typeof content === 'object' && content !== null) {
    const c = content as Record<string, unknown>;
    if (Buffer.isBuffer(c.buffer)) return c.buffer;
    if (c.buffer instanceof Uint8Array) {
      const u = c.buffer;
      return Buffer.from(u.buffer, u.byteOffset, u.byteLength);
    }
    if (typeof c.value === 'function') {
      try {
        const v = (c.value as () => unknown)();
        if (Buffer.isBuffer(v)) return v;
        if (v instanceof Uint8Array) {
          return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
        }
      } catch {
        /* ignore */
      }
    }
    if (c.type === 'Buffer' && Array.isArray(c.data)) {
      return Buffer.from(c.data as number[]);
    }
  }
  return Buffer.alloc(0);
}

function sha256Hex(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

export async function issuePrintAgentToken(restaurantId: string): Promise<{ token: string }> {
  const token = crypto.randomBytes(32).toString('hex');
  const lookup = sha256Hex(token);
  const hash = await bcrypt.hash(token, 10);
  await Restaurant.findByIdAndUpdate(restaurantId, {
    printAgentTokenHash: hash,
    printAgentTokenLookup: lookup,
    printAgentTokenCreatedAt: new Date()
  });
  return { token };
}

export async function clearPrintAgentToken(restaurantId: string): Promise<void> {
  await Restaurant.findByIdAndUpdate(restaurantId, {
    $unset: { printAgentTokenHash: 1, printAgentTokenLookup: 1, printAgentTokenCreatedAt: 1 }
  });
}

async function findRestaurantByAgentToken(token: string): Promise<{ id: string } | null> {
  const lookup = sha256Hex(token);
  const doc = await Restaurant.findOne({ printAgentTokenLookup: lookup }).select('+printAgentTokenHash');
  if (!doc || !doc.printAgentTokenHash) return null;
  const ok = await bcrypt.compare(token, doc.printAgentTokenHash);
  if (!ok) return null;
  return { id: doc._id.toString() };
}

export async function resolveRestaurantFromAgentToken(
  token: string | undefined
): Promise<string | null> {
  if (!token) return null;
  const r = await findRestaurantByAgentToken(token);
  return r?.id ?? null;
}

function orderToReceiptOrder(order: InstanceType<typeof Order>): ReceiptOrder {
  return {
    id: String(order._id),
    ...(order.tableNumber != null && { tableNumber: String(order.tableNumber) }),
    orderType: order.orderType,
    items: order.items.map((i: any) => ({
      menuItemId: String(i.menuItemId),
      quantity: i.quantity,
      price: i.price,
      specialInstructions: i.specialInstructions
    })),
    totalAmount: order.totalAmount,
    ...(order.customerName != null && { customerName: order.customerName }),
    ...(order.customerPhone != null && { customerPhone: order.customerPhone }),
    createdAt: order.createdAt ?? (order as any).created_at
  };
}

function buildEscPosForOrder(
  kind: 'bill' | 'kot',
  order: InstanceType<typeof Order>,
  restaurant: InstanceType<typeof Restaurant>,
  menuItems: InstanceType<typeof MenuItem>[]
): Buffer {
  const receiptOrder = orderToReceiptOrder(order);
  const rs = restaurant.settings;
  const settings: ReceiptRestaurant['settings'] = {};
  if (rs?.billSize != null) settings.billSize = rs.billSize;
  if (rs?.currency != null) settings.currency = rs.currency;
  if (rs?.timezone != null) settings.timezone = rs.timezone;
  const receiptRestaurant: ReceiptRestaurant = {
    name: restaurant.name,
    ...(Object.keys(settings).length > 0 ? { settings } : {})
  };
  const receiptMenuItems: ReceiptMenuItem[] = menuItems.map((m: any) => ({
    id: String(m._id),
    name: m.name
  }));
  const bytes =
    kind === 'bill'
      ? encodeReceiptToEscPos(receiptOrder, receiptRestaurant, receiptMenuItems)
      : encodeKOTToEscPos(receiptOrder, receiptRestaurant, receiptMenuItems);
  return Buffer.from(bytes);
}

export async function enqueuePrintJob(params: {
  restaurantId: string;
  orderId: string;
  kind: 'bill' | 'kot';
}): Promise<{ jobId: string }> {
  const order = await Order.findById(params.orderId);
  if (!order) {
    throw new Error('Order not found');
  }
  if (String(order.restaurantId) !== params.restaurantId) {
    throw new Error('Unauthorized to print for this order');
  }
  const restaurant = await Restaurant.findById(params.restaurantId);
  if (!restaurant) {
    throw new Error('Restaurant not found');
  }
  const menuItems = await MenuItem.find({ restaurantId: restaurant._id });
  const content = buildEscPosForOrder(params.kind, order, restaurant, menuItems);

  const job = await PrintJob.create({
    restaurantId: new mongoose.Types.ObjectId(params.restaurantId),
    orderId: new mongoose.Types.ObjectId(params.orderId),
    kind: params.kind,
    content,
    status: 'pending'
  });
  return { jobId: job._id.toString() };
}

export async function enqueueTestPrintJob(restaurantId: string): Promise<{ jobId: string }> {
  const job = await PrintJob.create({
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
    kind: 'test',
    content: Buffer.from(TEST_ESC_POS),
    status: 'pending'
  });
  return { jobId: job._id.toString() };
}

export async function listPendingJobsForRestaurant(restaurantId: string) {
  const jobs = await PrintJob.find({
    restaurantId,
    status: 'pending'
  })
    .sort({ createdAt: 1 })
    .limit(MAX_PENDING_BATCH)
    .lean();

  return jobs.map((j) => ({
    id: j._id.toString(),
    kind: j.kind as PrintJobKind,
    contentBase64: printJobContentToBuffer(j.content).toString('base64'),
    createdAt: j.createdAt
  }));
}

export async function markJobPrinted(jobId: string, restaurantId: string): Promise<boolean> {
  const res = await PrintJob.findOneAndUpdate(
    { _id: jobId, restaurantId, status: 'pending' },
    { status: 'printed' },
    { new: true }
  );
  return !!res;
}

export async function markJobFailed(jobId: string, restaurantId: string, _error?: string): Promise<boolean> {
  const res = await PrintJob.findOneAndUpdate(
    { _id: jobId, restaurantId, status: 'pending' },
    { status: 'failed' },
    { new: true }
  );
  return !!res;
}
