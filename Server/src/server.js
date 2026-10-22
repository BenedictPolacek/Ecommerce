import app from './app.js';
import { config } from './config/env.js';

const server = app.listen(config.port, () => {
  console.log(`🚀 Server listening on port ${config.port} (${config.nodeEnv})`);
  console.log(`👉 API Health Check: http://localhost:${config.port}/api/health`);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forcing shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
