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

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
  trace: console.trace
};

// Create a wrapper for console methods
const consoleWrapper = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      originalConsole.log(...args);
    } else {
      logger.info({ msg: args.join(' ') });
    }
  },
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      originalConsole.info(...args);
    } else {
      logger.info({ msg: args.join(' ') });
    }
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      originalConsole.warn(...args);
    } else {
      logger.warn({ msg: args.join(' ') });
    }
  },
  error: (...args: unknown[]) => {
    if (isDevelopment) {
      originalConsole.error(...args);
    } else {
      logger.error({ msg: args.join(' ') });
    }
  },
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      originalConsole.debug(...args);
    } else {
      logger.debug({ msg: args.join(' ') });
    }
  },
  trace: (...args: unknown[]) => {
    if (isDevelopment) {
      originalConsole.trace(...args);
    } else {
      logger.trace({ msg: args.join(' ') });
    }
  }
};

// Override global console
global.console = consoleWrapper as any;

export default logger;
