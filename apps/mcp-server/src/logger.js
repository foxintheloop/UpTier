import pino from 'pino';
import { join } from 'path';
import { existsSync, mkdirSync, appendFileSync } from 'fs';
// Get log directory (same as electron app)
function getLogPath() {
    const appData = process.env.APPDATA || process.env.HOME || '';
    const logDir = join(appData, '.uptier', 'logs');
    if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
    }
    return join(logDir, 'mcp-server.log');
}
// Simple file logger since pino transports can be complex in ESM
const logPath = getLogPath();
function writeToFile(level, scope, msg, data) {
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({
        time: timestamp,
        level,
        scope,
        msg,
        ...data,
    });
    try {
        appendFileSync(logPath, logEntry + '\n');
    }
    catch {
        // Ignore file write errors
    }
}
// Create logger that writes to stderr (stdout is for MCP protocol)
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino/file',
        options: { destination: 2 }, // stderr
    },
    formatters: {
        level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
});
export function createScopedLogger(scope) {
    const child = logger.child({ scope });
    return {
        debug: (msg, data) => {
            child.debug(data || {}, msg);
            writeToFile('debug', scope, msg, data);
        },
        info: (msg, data) => {
            child.info(data || {}, msg);
            writeToFile('info', scope, msg, data);
        },
        warn: (msg, data) => {
            child.warn(data || {}, msg);
            writeToFile('warn', scope, msg, data);
        },
        error: (msg, error, data) => {
            const errorInfo = error instanceof Error
                ? { error: error.message, stack: error.stack }
                : error
                    ? { error: String(error) }
                    : {};
            child.error({ ...errorInfo, ...data }, msg);
            writeToFile('error', scope, msg, { ...errorInfo, ...data });
        },
        fatal: (msg, data) => {
            child.fatal(data || {}, msg);
            writeToFile('fatal', scope, msg, data);
        },
    };
}
// Tool invocation timer
export function createToolTimer(toolName, args) {
    const startTime = performance.now();
    const requestId = Math.random().toString(36).substring(2, 9);
    const toolLogger = createScopedLogger('tool');
    return {
        start: () => {
            toolLogger.info('Tool invoked', { requestId, tool: toolName, args });
        },
        success: (result) => {
            const duration = (performance.now() - startTime).toFixed(2);
            toolLogger.info('Tool completed', {
                requestId,
                tool: toolName,
                duration: `${duration}ms`,
                ...result,
            });
        },
        error: (error) => {
            const duration = (performance.now() - startTime).toFixed(2);
            toolLogger.error('Tool failed', error, {
                requestId,
                tool: toolName,
                duration: `${duration}ms`,
            });
        },
    };
}
export function getLogFilePath() {
    return logPath;
}
export default logger;
//# sourceMappingURL=logger.js.map