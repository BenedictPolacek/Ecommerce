import express from 'express';
import request from 'supertest';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { createRateLimiter } from '../../src/middleware/rateLimit.js';

// Small app per test: fresh counters, and enabled although .env.test turns limiting off
const buildApp = ({ trustProxy = 0, ...limiterOptions } = {}) => {
  const app = express();
  app.set('trust proxy', trustProxy);
  app.get(
    '/limited',
    createRateLimiter({
      windowMinutes: 15,
      limit: 2,
      message: 'Too many attempts',
      enabled: true,
      ...limiterOptions,
    }),
    (req, res) => res.json({ success: true })
  );
  app.use(errorHandler);
  return app;
};

describe('createRateLimiter', () => {
  it('answers 429 in the usual error format once the limit is reached', async () => {
    const app = buildApp();
    await request(app).get('/limited').expect(200);
    await request(app).get('/limited').expect(200);

    const res = await request(app).get('/limited');
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ success: false, message: 'Too many attempts' });
  });

  it('sends the standard RateLimit headers', async () => {
    const res = await request(buildApp()).get('/limited');
    // q = limit, w = window in seconds, r = remaining requests
    expect(res.headers['ratelimit-policy']).toMatch(/q=2; w=900/);
    expect(res.headers.ratelimit).toMatch(/r=1/);
    expect(res.headers['x-ratelimit-limit']).toBeUndefined();
  });

  it('does nothing when disabled', async () => {
    const app = buildApp({ enabled: false });
    for (let i = 0; i < 3; i++) {
      await request(app).get('/limited').expect(200);
    }
  });

  it('counts per client IP from X-Forwarded-For behind a trusted proxy', async () => {
    const app = buildApp({ trustProxy: 1 });
    await request(app).get('/limited').set('X-Forwarded-For', '203.0.113.1').expect(200);
    await request(app).get('/limited').set('X-Forwarded-For', '203.0.113.1').expect(200);
    await request(app).get('/limited').set('X-Forwarded-For', '203.0.113.1').expect(429);

    // Another client behind the same proxy has its own counter
    await request(app).get('/limited').set('X-Forwarded-For', '203.0.113.2').expect(200);
  });
});
