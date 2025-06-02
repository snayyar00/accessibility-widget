import bunyan from 'bunyan';
import fs from 'fs';

// Create logs directory if it doesn't exist
fs.existsSync('logs') || fs.mkdirSync('logs');

// Create the main logger
const logger = bunyan.createLogger({
  name: 'accessibility-widget',
  streams: [
    {
      type: 'rotating-file',
      path: 'logs/info.log',
      period: '1d',
      level: 'info',
      count: 3,
    },
    {
      type: 'rotating-file',
      path: 'logs/error.log',
      period: '1d',
      level: 'error',
      count: 7,
    },
    {
      type: 'rotating-file',
      path: 'logs/trace.log',
      period: '1d',
      level: 'trace',
      count: 3,
    },
  ],
});

// Environment-based logging control
const isDevelopment = process.env.NODE_ENV === 'development';
const isDebugEnabled = process.env.PREPROCESSING_DEBUG_MODE === 'true';

// Create a wrapper for console methods
const consoleWrapper = {
  log: (...args: unknown[]) => {
    if (isDevelopment && isDebugEnabled) {
      logger.info({ msg: args.join(' ') });
    }
  },
  info: (...args: unknown[]) => {
    if (isDevelopment && isDebugEnabled) {
      logger.info({ msg: args.join(' ') });
    }
  },
  warn: (...args: unknown[]) => {
    logger.warn({ msg: args.join(' ') });
  },
  error: (...args: unknown[]) => {
    logger.error({ msg: args.join(' ') });
  },
  debug: (...args: unknown[]) => {
    if (isDevelopment && isDebugEnabled) {
      logger.debug({ msg: args.join(' ') });
    }
  },
  trace: (...args: unknown[]) => {
    if (isDevelopment && isDebugEnabled) {
      logger.trace({ msg: args.join(' ') });
    }
  }
};

// Override global console
if (process.env.NODE_ENV !== 'production') {
  global.console = consoleWrapper as any;
}

export default logger;
