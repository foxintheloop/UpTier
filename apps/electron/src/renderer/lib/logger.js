// Check if we're in development mode
const isDevelopment = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.protocol === 'file:');
class RendererLogger {
    scope;
    isDev;
    constructor(options) {
        this.scope = options.scope;
        this.isDev = isDevelopment;
    }
    formatMessage(message) {
        return `[${this.scope}] ${message}`;
    }
    log(level, message, data) {
        const formattedMessage = this.formatMessage(message);
        // Always send to main process for file logging
        if (window.electronAPI?.log) {
            if (level === 'error') {
                window.electronAPI.log.error(formattedMessage, undefined, data);
            }
            else {
                window.electronAPI.log[level](formattedMessage, data);
            }
        }
        // Also log to console in development
        if (this.isDev) {
            const consoleMethod = level === 'debug' ? 'log' : level;
            if (data) {
                console[consoleMethod](formattedMessage, data);
            }
            else {
                console[consoleMethod](formattedMessage);
            }
        }
    }
    debug(message, data) {
        this.log('debug', message, data);
    }
    info(message, data) {
        this.log('info', message, data);
    }
    warn(message, data) {
        this.log('warn', message, data);
    }
    error(message, error, data) {
        const errorInfo = error instanceof Error
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
export function createLogger(scope) {
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
//# sourceMappingURL=logger.js.map