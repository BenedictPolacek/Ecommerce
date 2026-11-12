import { Router } from 'express';
import { pool } from '../config/db.js';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

const DB_TIMEOUT_MS = 2000;

/** Resolves when the database answers, rejects when it fails or takes longer than the timeout */
export async function pingDatabase({
  timeoutMs = DB_TIMEOUT_MS,
  query = () => pool.query('SELECT 1'),
} = {}) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Database timeout')), timeoutMs);
  });
  try {
    await Promise.race([query(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Two checks, as container platforms expect them:
 * - liveness  GET /health:       the process answers (a failure means "restart me")
 * - readiness GET /health/ready: the database answers too (a failure means "send no traffic yet")
 * A database outage must not fail liveness, or the platform would restart healthy containers.
 */
export function createHealthRouter({ ping = pingDatabase } = {}) {
  const router = Router();

  router.get('/', (req, res) => {
    res.status(200).json({
      status: 'ok',
      message: 'Ecommerce REST API is running',
      // Lets a deployment check that the new release is really the one answering
      version: config.version,
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/ready', async (req, res) => {
    try {
      await ping();
      res.status(200).json({ status: 'ok', checks: { database: 'ok' } });
    } catch (error) {
      // The reason goes to the logs, not to the public response
      logger.error({ err: error }, 'Readiness check failed');
      res.status(503).json({ status: 'unavailable', checks: { database: 'unavailable' } });
    }
  });

  return router;
}

export default createHealthRouter();
