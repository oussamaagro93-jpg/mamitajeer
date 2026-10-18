if (!Object.hasOwn) {
  Object.hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
}

const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { sequelize } = require('./models');

let server;

async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    if (config.env === 'development') {
      await sequelize.sync({ alter: false });
      logger.info('Database models synchronized');
    }

    server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode`);
      console.log(`Server running on http://localhost:${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

const shutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      sequelize.close().then(() => {
        logger.info('Database connection closed');
        process.exit(0);
      });
    });
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();
