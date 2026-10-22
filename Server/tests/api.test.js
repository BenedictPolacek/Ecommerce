import request from 'supertest';
import app from '../src/app.js';

describe('Base API & Error Handling', () => {
  it('GET / should return 200 with service info', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Ecommerce REST API');
    expect(res.body.status).toBe('running');
  });

  it('GET /api/health should return 200 with ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.message).toBe('Ecommerce REST API is running');
  });

  it('GET /undefined-route should return 404 with structured message', async () => {
    const res = await request(app).get('/undefined-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Cannot GET /undefined-route');
  });

  it('GET /docs should redirect to /api/docs', async () => {
    const res = await request(app).get('/docs');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/api/docs');
  });

  it('GET /api/docs/ should return Swagger UI HTML', async () => {
    const res = await request(app).get('/api/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('GET /api/docs.json should return OpenAPI 3.0 specification', async () => {
    const res = await request(app).get('/api/docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('Ecommerce REST API');
    expect(res.body.paths).toHaveProperty('/products');
    expect(res.body.paths).toHaveProperty('/cart');
    expect(res.body.paths).toHaveProperty('/orders');
  });
});

describe('Authentication & Protected Routes Middleware', () => {
  it('POST /api/auth/register should fail validation with empty body', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('POST /api/auth/login should fail validation with invalid email format', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'invalid-email',
      password: 'password123',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.some((e) => e.field === 'email')).toBe(true);
  });

  it('GET /api/users/me should reject unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Authentication token missing');
  });

  it('GET /api/cart should reject unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/orders should reject unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/addresses should reject unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/addresses');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('Validation Middleware', () => {
  it('GET /api/products/:id should reject invalid UUID parameter with 400', async () => {
    const res = await request(app).get('/api/products/not-a-valid-uuid');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
  });

  it('POST /api/products should reject unauthenticated requests with 401', async () => {
    const res = await request(app).post('/api/products').send({
      name: 'Test Product',
      price: 19.99,
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
