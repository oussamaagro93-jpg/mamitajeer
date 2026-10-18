const winston = require('winston');
const path = require('path');

// Vercel's filesystem is read-only (only /tmp is writable), so file transports
// must be disabled there or every invocation fails with EROFS.
const isServerless = Boolean(process.env.VERCEL);
const isProduction = process.env.NODE_ENV === 'production';

const transports = [];

if (!isServerless) {
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  );
}

// Always log to the console (Vercel captures stdout/stderr). Plain JSON in
// production/serverless, colourised output locally.
transports.push(
  new winston.transports.Console({
    format:
      isProduction || isServerless
        ? winston.format.combine(winston.format.timestamp(), winston.format.json())
        : winston.format.combine(winston.format.colorize(), winston.format.simple()),
  }),
);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports,
});

module.exports = logger;
