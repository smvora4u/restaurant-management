/**
 * Bill / KOT printing is handled by the backend print queue + local print agent.
 * @deprecated Use queueOrderPrint from services/printQueue directly.
 */
import { queueOrderPrint } from '../../services/printQueue';

export async function queueBillPrint(orderId: string) {
  return queueOrderPrint(orderId, 'bill');
}

export async function queueKotPrint(orderId: string) {
  return queueOrderPrint(orderId, 'kot');
}
