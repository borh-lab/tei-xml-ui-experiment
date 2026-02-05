// @ts-nocheck
// lib/utils/logger.ts

/**
 * Log levels in order of verbosity
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

/**
 * Log level hierarchy for filtering
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

/**
 * Global log level setting
 */
let currentLogLevel: LogLevel = 'info';

/**
 * Set the global log level
 * @param level - The minimum log level to display
 */
function setLogLevel(level: LogLevel): void {
  if (LOG_LEVELS[level] !== undefined) {
    currentLogLevel = level;
  }
}

/**
 * Get the current log level
 * @returns Current log level
 */
function getLogLevel(): LogLevel {
  return currentLogLevel;
}

/**
 * Format timestamp for log entries
 * @returns Formatted timestamp string
 */
function formatTimestamp(): string {
  const now = new Date();
  return now.toISOString();
}

/**
 * Format log entry with timestamp, level, and context
 * @param level - Log level
 * @param message - Log message
 * @param context - Optional context object
 * @returns Formatted log string
 */
function formatLogEntry(level: string, message: string, context?: Record<string, unknown>): string {
  const timestamp = formatTimestamp();
  const levelStr = level.toUpperCase().padEnd(5);
  return `[${timestamp}] [${levelStr}] ${message}`;
}

/**
 * Safe stringification that handles circular references
 * @param data - Data to stringify
 * @returns Stringified data or placeholder
 */
function safeStringify(data: unknown): string {
  if (data === undefined) {
    return '';
  }

  try {
    return JSON.stringify(data, null, 2);
  } catch {
    // Handle circular references or other stringify errors
    return '[Circular or unstringifiable data]';
  }
}

/**
 * Logger class with contextual logging support
 */
export class Logger {
  private context: Record<string, unknown>;

  constructor(context: Record<string, unknown> = {}) {
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   * @param additionalContext - Context to add to this logger
   * @returns New logger with merged context
   */
  withContext(additionalContext: Record<string, unknown>): Logger {
    return new Logger({
      ...this.context,
      ...additionalContext,
    });
  }

  /**
   * Log a debug message
   * @param message - Log message
   * @param data - Optional data to log
   */
  debug(message: string, data?: unknown): void {
    if (LOG_LEVELS[currentLogLevel] <= LOG_LEVELS.debug) {
      const formatted = formatLogEntry('DEBUG', message, this.context);
      const mergedData = data ? { ...this.context, ...data } : this.context;

      if (Object.keys(mergedData).length > 0) {
        console.debug(formatted, mergedData);
      } else {
        console.debug(formatted);
      }
    }
  }

  /**
   * Log an info message
   * @param message - Log message
   * @param data - Optional data to log
   */
  info(message: string, data?: unknown): void {
    if (LOG_LEVELS[currentLogLevel] <= LOG_LEVELS.info) {
      const formatted = formatLogEntry('INFO', message, this.context);
      const mergedData = data ? { ...this.context, ...data } : this.context;

      if (Object.keys(mergedData).length > 0) {
        console.log(formatted, mergedData);
      } else {
        console.log(formatted);
      }
    }
  }

  /**
   * Log a warning message
   * @param message - Log message
   * @param data - Optional data to log
   */
  warn(message: string, data?: unknown): void {
    if (LOG_LEVELS[currentLogLevel] <= LOG_LEVELS.warn) {
      const formatted = formatLogEntry('WARN', message, this.context);
      const mergedData = data ? { ...this.context, ...data } : this.context;

      if (Object.keys(mergedData).length > 0) {
        console.warn(formatted, mergedData);
      } else {
        console.warn(formatted);
      }
    }
  }

  /**
   * Log an error message
   * @param message - Log message
   * @param error - Optional error object or data
   */
  error(message: string, error?: Error | unknown): void {
    if (LOG_LEVELS[currentLogLevel] <= LOG_LEVELS.error) {
      const formatted = formatLogEntry('ERROR', message, this.context);

      if (error instanceof Error) {
        console.error(formatted, error.message, error.stack);
      } else if (error) {
        const mergedData = { ...this.context, ...error };
        console.error(formatted, mergedData);
      } else {
        console.error(formatted);
      }
    }
  }

  /**
   * Get the current log level
   * @returns Current log level
   */
  getLevel(): LogLevel {
    return currentLogLevel;
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Export setLogLevel and getLogLevel for convenience
 */
export { setLogLevel, getLogLevel };
