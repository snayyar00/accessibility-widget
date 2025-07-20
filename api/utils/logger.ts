import bunyan from 'bunyan'
import chalk from 'chalk'

import { IS_LOCAL_DEV } from '../config/server.config'

const logger = bunyan.createLogger({
  name: 'accessibility-widget',
  streams: [
    {
      stream: process.stdout,
      level: 'trace',
    },
  ],
})

// Create colored logger wrapper functions for local development
const createColoredLogger = () => {
  return {
    info: (...args: any[]) => {
      const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')

      if (IS_LOCAL_DEV) {
        originalConsole.log(chalk.cyan('[INFO]'), chalk.white(message))
      } else {
        logger.info(message)
      }
    },
    error: (...args: any[]) => {
      const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')

      if (IS_LOCAL_DEV) {
        originalConsole.error(chalk.red('[ERROR]'), chalk.white(message))
      } else {
        logger.error(message)
      }
    },
    warn: (...args: any[]) => {
      const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')

      if (IS_LOCAL_DEV) {
        originalConsole.log(chalk.yellow('[WARN]'), chalk.white(message))
      } else {
        logger.warn(message)
      }
    },
    debug: (...args: any[]) => {
      const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')

      if (IS_LOCAL_DEV) {
        originalConsole.log(chalk.gray('[DEBUG]'), chalk.white(message))
      } else {
        logger.debug(message)
      }
    },
    trace: (...args: any[]) => {
      const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')

      if (IS_LOCAL_DEV) {
        originalConsole.log(chalk.gray('[TRACE]'), chalk.white(message))
      } else {
        logger.trace(message)
      }
    },
    fatal: (...args: any[]) => {
      const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')

      if (IS_LOCAL_DEV) {
        originalConsole.error(chalk.bgRed.white('[FATAL]'), chalk.white(message))
      } else {
        logger.fatal(message)
      }
    },
  }
}

const coloredLogger = createColoredLogger()

// Save original console methods in case they are needed
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
}

// Override console methods to use bunyan
console.log = (...args) => {
  const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')

  if (IS_LOCAL_DEV) {
    originalConsole.log(chalk.blue('[INFO]'), chalk.white(message))
  } else {
    logger.info(message)
  }
}

console.error = (...args) => {
  const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')

  if (IS_LOCAL_DEV) {
    originalConsole.error(chalk.red('[ERROR]'), chalk.white(message))
  } else {
    logger.error(message)
  }
}

console.warn = (...args) => {
  const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')

  if (IS_LOCAL_DEV) {
    originalConsole.log(chalk.yellow('[WARN]'), chalk.white(message))
  } else {
    logger.warn(message)
  }
}

console.info = (...args) => {
  const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')

  if (IS_LOCAL_DEV) {
    originalConsole.log(chalk.cyan('[INFO]'), chalk.white(message))
  } else {
    logger.info(message)
  }
}

console.debug = (...args) => {
  const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')

  if (IS_LOCAL_DEV) {
    originalConsole.log(chalk.gray('[DEBUG]'), chalk.white(message))
  } else {
    logger.debug(message)
  }
}

export default coloredLogger
export { logger as bunyanLogger, coloredLogger as logger, originalConsole }
