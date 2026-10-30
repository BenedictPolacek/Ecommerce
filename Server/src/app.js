import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';

const app = express();

// Behind a reverse proxy: take req.ip from X-Forwarded-For (rate limiting counts per IP)
app.set('trust proxy', config.trustProxy);

// Security middleware

app.use(helmet());

// Only the own frontend may send credentialed requests. Other origins get no CORS headers,
// so the browser blocks their access. Requests without Origin (curl, Postman) are not affected.
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);

// HTTP request logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Body & Cookie parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Convenience redirect to Swagger UI
app.get('/docs', (req, res) => {
  res.redirect('/api/docs');
});

// Root health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Ecommerce REST API',
    status: 'running',
    version: '1.0.0',
    docs: '/api/docs',
  });
});

// Register API routes
app.use('/api', apiLimiter, apiRoutes);

// Catch 404 for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
  });
});

// Central error handler
app.use(errorHandler);

export default app;
