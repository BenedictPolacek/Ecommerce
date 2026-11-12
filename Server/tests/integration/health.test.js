import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import app from '../../src/app.js';
import { logger } from '../../src/config/logger.js';
import { createHealthRouter, pingDatabase } from '../../src/routes/health.js';
import { closeDatabase } from './helpers/db.js';

afterAll(closeDatabase);

describe('Health checks', () => {
  it('liveness answers without the database', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe('dev');
  });

  it('readiness is ok while the database answers', async () => {
    const res = await request(app).get('/api/health/ready').expect(200);
    expect(res.body).toEqual({ status: 'ok', checks: { database: 'ok' } });
  });

  it('readiness answers 503 without details when the database fails', async () => {
    const failing = express().use(
      '/health',
      createHealthRouter({ ping: () => Promise.reject(new Error('connect ECONNREFUSED')) })
    );
    const errorLog = jest.spyOn(logger, 'error');

    const res = await request(failing).get('/health/ready').expect(503);

    expect(res.body).toEqual({ status: 'unavailable', checks: { database: 'unavailable' } });
    expect(JSON.stringify(res.body)).not.toContain('ECONNREFUSED');
    expect(errorLog).toHaveBeenCalled();
    errorLog.mockRestore();
  });

  it('a database that hangs counts as down after the timeout', async () => {
    const hanging = () => new Promise(() => {});
    await expect(pingDatabase({ timeoutMs: 20, query: hanging })).rejects.toThrow(
      'Database timeout'
    );
  });
});
