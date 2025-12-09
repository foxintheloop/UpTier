// Logger utility for renderer process
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  scope: string;
}

// Check if we're in development mode
const isDevelopment = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.protocol === 'file:');

class RendererLogger {
  private scope: string;
  private isDev: boolean;

  constructor(options: LoggerOptions) {
    this.scope = options.scope;
    this.isDev = isDevelopment;
  }

  private formatMessage(message: string): string {
    return `[${this.scope}] ${message}`;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    const formattedMessage = this.formatMessage(message);

    // Always send to main process for file logging
    if (window.electronAPI?.log) {
      if (level === 'error') {
        window.electronAPI.log.error(formattedMessage, undefined, data);
      } else {
        window.electronAPI.log[level](formattedMessage, data);
      }
    }

    // Also log to console in development
    if (this.isDev) {
      const consoleMethod = level === 'debug' ? 'log' : level;
      if (data) {
        console[consoleMethod](formattedMessage, data);
      } else {
        console[consoleMethod](formattedMessage);
      }
    }
  }

  debug(message: string, data?: Record<string, unknown>) {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>) {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error | unknown, data?: Record<string, unknown>) {
    const errorInfo =
      error instanceof Error
        ? { errorMessage: error.message, stack: error.stack }
        : error
          ? { errorValue: String(error) }
          : {};

    // For error, we need to pass the error info differently
    const formattedMessage = this.formatMessage(message);
    if (window.electronAPI?.log) {
      const errorString = error instanceof Error ? error.message : error ? String(error) : undefined;
      window.electronAPI.log.error(formattedMessage, errorString, { ...errorInfo, ...data });
    }

    if (this.isDev) {
      console.error(formattedMessage, { ...errorInfo, ...data });
    }
  }
}

// Factory function
export function createLogger(scope: string): RendererLogger {
  return new RendererLogger({ scope });
}

// Default app logger
export const appLogger = createLogger('app');

// Global error handlers
export function setupGlobalErrorHandlers() {
  const errorLogger = createLogger('global');

  window.onerror = (message, source, lineno, colno, error) => {
    errorLogger.error('Uncaught error', error, {
      message: String(message),
      source,
      lineno,
      colno,
    });
    return false; // Let default handling continue
  };

  window.onunhandledrejection = (event) => {
    errorLogger.error('Unhandled promise rejection', event.reason);
  };

  errorLogger.info('Global error handlers installed');
}
