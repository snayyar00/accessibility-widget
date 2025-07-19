import bunyan from 'bunyan';
import fs from 'fs';

// Environment-based logging control - FIXED
const isDevelopment = process.env.NODE_ENV === 'development';

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
  trace: console.trace,
};

let logger: bunyan | null = null;

// Only create bunyan logger in non-development environments
if (!isDevelopment) {
  // Create logs directory if it doesn't exist
  fs.existsSync('logs') || fs.mkdirSync('logs');

  // Create the main logger
  logger = bunyan.createLogger({
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
}

// Create a wrapper for console methods
const consoleWrapper = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      originalConsole.log(...args);
    } else if (logger) {
      logger.info(args.join(' '));
    }
  },
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      originalConsole.info(...args);
    } else if (logger) {
      logger.info(args.join(' '));
    }
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      originalConsole.warn(...args);
    } else if (logger) {
      logger.warn(args.join(' '));
    }
  },
  error: (...args: unknown[]) => {
    if (isDevelopment) {
      originalConsole.error(...args);
    } else if (logger) {
      logger.error(args.join(' '));
    }
  },
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      originalConsole.debug(...args);
    } else if (logger) {
      logger.debug(args.join(' '));
    }
  },
  trace: (...args: unknown[]) => {
    if (isDevelopment) {
      originalConsole.trace(...args);
    } else if (logger) {
      logger.trace(args.join(' '));
    }
  },
};

// Override global console
global.console = consoleWrapper as any;

// Create a safe logger wrapper that handles null case in development
const safeLogger = {
  info: (msg: any, ...args: any[]) => {
    if (isDevelopment) {
      originalConsole.info(msg, ...args);
    } else if (logger) {
      logger.info(msg, ...args);
    }
  },
  warn: (msg: any, ...args: any[]) => {
    if (isDevelopment) {
      originalConsole.warn(msg, ...args);
    } else if (logger) {
      logger.warn(msg, ...args);
    }
  },
  error: (msg: any, ...args: any[]) => {
    if (isDevelopment) {
      originalConsole.error(msg, ...args);
    } else if (logger) {
      logger.error(msg, ...args);
    }
  },
  debug: (msg: any, ...args: any[]) => {
    if (isDevelopment) {
      originalConsole.debug(msg, ...args);
    } else if (logger) {
      logger.debug(msg, ...args);
    }
  },
  trace: (msg: any, ...args: any[]) => {
    if (isDevelopment) {
      originalConsole.trace(msg, ...args);
    } else if (logger) {
      logger.trace(msg, ...args);
    }
  },
};

// Export safe logger (works in both development and production)
export default safeLogger;
