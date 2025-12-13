import log from 'electron-log/main';
import { app } from 'electron';
import path from 'path';
// Get log directory - works before app is ready
function getLogPath() {
    // app.getPath() only works after app is ready
    // Use APPDATA fallback for early initialization
    try {
        if (app.isReady()) {
            return path.join(app.getPath('userData'), 'logs', 'main.log');
        }
    }
    catch {
        // app.getPath may throw if called too early
    }
    // Fallback: use APPDATA directly (same location electron-log would use)
    const appData = process.env.APPDATA || process.env.HOME || '';
    return path.join(appData, 'UpTier', 'logs', 'main.log');
}
// Initialize electron-log for main process
export function initializeLogger() {
    // Configure file transport with lazy path resolution
    log.transports.file.resolvePathFn = () => getLogPath();
    // File settings
    log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
    log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
    // Console settings (for development)
    log.transports.console.format = '[{h}:{i}:{s}.{ms}] [{level}] {text}';
    log.transports.console.level = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
    // Initialize renderer logging capability
    log.initialize();
    log.info('[logger] Logger initialized', {
        logPath: getLogPath(),
        level: log.transports.console.level,
        nodeEnv: process.env.NODE_ENV,
    });
}
// Export scoped loggers for different modules
export function createScopedLogger(scope) {
    return {
        debug: (message, data) => log.debug(`[${scope}]`, message, data ? JSON.stringify(data) : ''),
        info: (message, data) => log.info(`[${scope}]`, message, data ? JSON.stringify(data) : ''),
        warn: (message, data) => log.warn(`[${scope}]`, message, data ? JSON.stringify(data) : ''),
        error: (message, error, data) => {
            const errorInfo = error instanceof Error
                ? { message: error.message, stack: error.stack }
                : error
                    ? { value: String(error) }
                    : {};
            log.error(`[${scope}]`, message, JSON.stringify({ ...errorInfo, ...data }));
        },
    };
}
// IPC handler timing utility
export function createIpcTimer(channel) {
    const startTime = performance.now();
    const requestId = Math.random().toString(36).substring(2, 9);
    return {
        requestId,
        start: () => {
            log.debug(`[ipc] [${requestId}] Request: ${channel}`);
        },
        end: (result) => {
            const duration = (performance.now() - startTime).toFixed(2);
            if (result?.success === false) {
                log.warn(`[ipc] [${requestId}] Response: ${channel} - FAILED (${duration}ms)`, result.error);
            }
            else {
                log.debug(`[ipc] [${requestId}] Response: ${channel} - OK (${duration}ms)`);
            }
        },
        error: (err) => {
            const duration = (performance.now() - startTime).toFixed(2);
            log.error(`[ipc] [${requestId}] Error: ${channel} (${duration}ms)`, err.message, err.stack);
        },
    };
}
export default log;
//# sourceMappingURL=logger.js.map