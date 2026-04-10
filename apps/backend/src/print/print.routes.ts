import { Router, type Request, type Response } from 'express';
import { authenticateUser, type AuthContext } from '../middleware/auth.js';
import {
  enqueuePrintJob,
  enqueueTestPrintJob,
  issuePrintAgentToken,
  clearPrintAgentToken,
  listPendingJobsForRestaurant,
  markJobFailed,
  markJobPrinted,
  resolveRestaurantFromAgentToken
} from './print.service.js';

const router = Router();

function getJwtContext(req: Request): Promise<AuthContext> {
  return authenticateUser(req);
}

function allowedRestaurantId(ctx: AuthContext): string | null {
  if (ctx.staff?.restaurantId) return ctx.staff.restaurantId;
  if (ctx.restaurant?.id) return ctx.restaurant.id;
  return null;
}

/** POST /api/print { orderId, kind?: 'bill' | 'kot' } */
router.post('/print', async (req: Request, res: Response) => {
  try {
    const ctx = await getJwtContext(req);
    const rid = allowedRestaurantId(ctx);
    if (!rid) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const orderId = req.body?.orderId as string | undefined;
    const kind = (req.body?.kind as 'bill' | 'kot' | undefined) ?? 'bill';
    if (!orderId || (kind !== 'bill' && kind !== 'kot')) {
      return res.status(400).json({ error: 'Invalid body: orderId and optional kind (bill|kot) required' });
    }
    const { jobId } = await enqueuePrintJob({ restaurantId: rid, orderId, kind });
    return res.status(202).json({ jobId, message: 'Printing…' });
  } catch (e: any) {
    const msg = e?.message || 'Failed to queue print';
    const code = msg.includes('not found') ? 404 : msg.includes('Unauthorized') ? 403 : 400;
    return res.status(code).json({ error: msg });
  }
});

/** POST /api/print/test — smoke test slip */
router.post('/print/test', async (req: Request, res: Response) => {
  try {
    const ctx = await getJwtContext(req);
    const rid = allowedRestaurantId(ctx);
    if (!rid) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { jobId } = await enqueueTestPrintJob(rid);
    return res.status(202).json({ jobId, message: 'Test print queued.' });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to queue test print' });
  }
});

/** POST /api/print-agent/token — issue or rotate agent token (plaintext returned once) */
router.post('/print-agent/token', async (req: Request, res: Response) => {
  try {
    const ctx = await getJwtContext(req);
    const rid = allowedRestaurantId(ctx);
    if (!rid) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { token } = await issuePrintAgentToken(rid);
    return res.json({ token, message: 'Store this token in the print agent config; it will not be shown again.' });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to issue token' });
  }
});

/** DELETE /api/print-agent/token — revoke agent token */
router.delete('/print-agent/token', async (req: Request, res: Response) => {
  try {
    const ctx = await getJwtContext(req);
    const rid = allowedRestaurantId(ctx);
    if (!rid) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    await clearPrintAgentToken(rid);
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to revoke token' });
  }
});

function agentTokenFromRequest(req: Request): string | undefined {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  const x = req.headers['x-print-agent-token'];
  if (typeof x === 'string') return x.trim();
  return undefined;
}

/** GET /api/print-jobs */
router.get('/print-jobs', async (req: Request, res: Response) => {
  try {
    const token = agentTokenFromRequest(req);
    const restaurantId = await resolveRestaurantFromAgentToken(token);
    if (!restaurantId) {
      return res.status(401).json({ error: 'Invalid or missing print agent token' });
    }
    const jobs = await listPendingJobsForRestaurant(restaurantId);
    return res.json({ jobs });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to list jobs' });
  }
});

/** POST /api/print-done { jobId } */
router.post('/print-done', async (req: Request, res: Response) => {
  try {
    const token = agentTokenFromRequest(req);
    const restaurantId = await resolveRestaurantFromAgentToken(token);
    if (!restaurantId) {
      return res.status(401).json({ error: 'Invalid or missing print agent token' });
    }
    const jobId = req.body?.jobId as string | undefined;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId required' });
    }
    const ok = await markJobPrinted(jobId, restaurantId);
    if (!ok) {
      return res.status(404).json({ error: 'Job not found or already completed' });
    }
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to update job' });
  }
});

/** POST /api/print-failed { jobId, error? } */
router.post('/print-failed', async (req: Request, res: Response) => {
  try {
    const token = agentTokenFromRequest(req);
    const restaurantId = await resolveRestaurantFromAgentToken(token);
    if (!restaurantId) {
      return res.status(401).json({ error: 'Invalid or missing print agent token' });
    }
    const jobId = req.body?.jobId as string | undefined;
    const errMsg = req.body?.error as string | undefined;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId required' });
    }
    const ok = await markJobFailed(jobId, restaurantId, errMsg);
    if (!ok) {
      return res.status(404).json({ error: 'Job not found or already completed' });
    }
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to update job' });
  }
});

export default router;
