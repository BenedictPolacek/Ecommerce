import app from './app.js';
import { config } from './config/env.js';
import { pool } from './config/db.js';

const server = app.listen(config.port, () => {
  console.log(`🚀 Server listening on port ${config.port} (${config.nodeEnv})`);
  console.log(`👉 API Health Check: http://localhost:${config.port}/api/health`);
});

let shuttingDown = false;

// Graceful shutdown: finish open requests, then close the DB pool before exiting
const shutdown = (reason, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\nReceived ${reason}. Shutting down gracefully...`);

  setTimeout(() => {
    console.error('Forcing shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();

  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await pool.end();
      console.log('Database pool closed.');
    } catch (err) {
      console.error('Error while closing the database pool', err);
      exitCode = 1;
    }
    process.exit(exitCode);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// The app state is unknown after an unhandled error: exit and let the process manager
// (Docker, hosting platform) start a fresh instance
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  shutdown('uncaughtException', 1);
});
