import express from 'express';
import pino from 'pino';
import request from 'supertest';
import { createRequestLogger } from '../../src/middleware/requestLogger.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { AppError } from '../../src/utils/AppError.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Small app with a logger that writes into an array instead of stdout
const buildApp = () => {
  const lines = [];
  const logger = pino(
    { level: 'info', formatters: { level: (label) => ({ level: label }) } },
    { write: (line) => lines.push(JSON.parse(line)) }
  );
  const app = express();
  app.use(createRequestLogger(logger));
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/api/products', (req, res) => res.json({ success: true }));
  app.get('/api/conflict', () => {
    throw new AppError('Email already registered', 409);
  });
  app.use(errorHandler);
  return { app, lines };
};

describe('requestLogger', () => {
  it('gives every request an ID and sends it back as X-Request-Id', async () => {
    const { app, lines } = buildApp();

    const res = await request(app).get('/api/products').expect(200);

    expect(res.headers['x-request-id']).toMatch(UUID);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: 'info',
      msg: 'GET /api/products 200',
      req: { id: res.headers['x-request-id'], method: 'GET', path: '/api/products' },
      res: { statusCode: 200 },
    });
    expect(lines[0].responseTime).toEqual(expect.any(Number));
  });

  it('keeps a request ID from a proxy, but only a harmless one', async () => {
    const { app } = buildApp();

    const kept = await request(app).get('/api/products').set('X-Request-Id', 'abc-123');
    expect(kept.headers['x-request-id']).toBe('abc-123');

    const replaced = await request(app)
      .get('/api/products')
      .set('X-Request-Id', '<script> or a very long text');
    expect(replaced.headers['x-request-id']).toMatch(UUID);
  });

  it('never logs cookies, the Authorization header or the query string', async () => {
    const { app, lines } = buildApp();

    await request(app)
      .get('/api/products?search=jane@example.com')
      .set('Cookie', 'token=secret-jwt')
      .set('Authorization', 'Bearer secret-jwt');

    const logged = JSON.stringify(lines);
    expect(lines[0].req.path).toBe('/api/products');
    expect(logged).not.toContain('secret-jwt');
    expect(logged).not.toContain('jane@example.com');
  });

  it('logs client errors as warnings with the reason on the same line', async () => {
    const { app, lines } = buildApp();

    await request(app).get('/api/conflict').expect(409);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: 'warn',
      msg: 'GET /api/conflict 409 - Email already registered',
    });
  });

  it('leaves out health checks (polled every few seconds)', async () => {
    const { app, lines } = buildApp();

    const res = await request(app).get('/api/health').expect(200);

    expect(res.headers['x-request-id']).toMatch(UUID);
    expect(lines).toHaveLength(0);
  });
});
