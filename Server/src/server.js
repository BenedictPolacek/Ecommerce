import app from './app.js';
import { config } from './config/env.js';
import { pool } from './config/db.js';
import { logger } from './config/logger.js';

const server = app.listen(config.port, () => {
  logger.info(
    { port: config.port, env: config.nodeEnv },
    `Server listening on http://localhost:${config.port}`
  );
});

let shuttingDown = false;

// Graceful shutdown: finish open requests, then close the DB pool before exiting
const shutdown = (reason, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ reason }, 'Shutting down gracefully');

  setTimeout(() => {
    logger.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000).unref();

  server.close(async () => {
    logger.info('HTTP server closed');
    try {
      await pool.end();
      logger.info('Database pool closed');
    } catch (err) {
      logger.error({ err }, 'Error while closing the database pool');
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
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  shutdown('uncaughtException', 1);
});
