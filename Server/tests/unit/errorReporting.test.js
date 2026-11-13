import { jest } from '@jest/globals';

// ES modules cannot be mocked after import: register the mock first, then import the app code
const captureException = jest.fn();
jest.unstable_mockModule('@sentry/node', () => ({ captureException }));

const { default: express } = await import('express');
const { default: request } = await import('supertest');
const { errorHandler } = await import('../../src/middleware/errorHandler.js');
const { AppError } = await import('../../src/utils/AppError.js');

const buildApp = (error) => {
  const app = express();
  app.use((req, res, next) => {
    req.id = 'req-123';
    next();
  });
  app.get('/fail', () => {
    throw error;
  });
  app.use(errorHandler);
  return app;
};

beforeEach(() => captureException.mockClear());

describe('error reporting to Sentry', () => {
  it('reports server errors with the request ID and the path without query string', async () => {
    const bug = new Error('Cannot read properties of undefined');

    await request(buildApp(bug)).get('/fail?email=jane@example.com').expect(500);

    expect(captureException).toHaveBeenCalledWith(bug, {
      tags: { request_id: 'req-123' },
      extra: { method: 'GET', path: '/fail' },
    });
  });

  it('does not report client errors, they are expected answers', async () => {
    await request(buildApp(new AppError('Invalid credentials', 401)))
      .get('/fail')
      .expect(401);
    await request(buildApp(new AppError('Not found', 404)))
      .get('/fail')
      .expect(404);

    expect(captureException).not.toHaveBeenCalled();
  });
});
