import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/users/user.routes.js';
import categoryRoutes from '../modules/categories/category.routes.js';
import productRoutes from '../modules/products/product.routes.js';
import cartRoutes from '../modules/cart/cart.routes.js';
import orderRoutes from '../modules/orders/orders.routes.js';
import addressRoutes from '../modules/addresses/address.routes.js';

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../docs/swagger.js';

const router = Router();

// API Documentation (Swagger UI & Raw OpenAPI JSON)
router.use('/docs', (req, res, next) => {
  res.removeHeader('Content-Security-Policy');
  next();
});
// Swagger UI & JSON spec
router.use('/docs', swaggerUi.serve);
router.get(
  '/docs',
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Ecommerce REST API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  })
);
router.get('/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

// Base API health check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Ecommerce REST API is running',
    timestamp: new Date().toISOString(),
  });
});

// Feature modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/addresses', addressRoutes);

export default router;
