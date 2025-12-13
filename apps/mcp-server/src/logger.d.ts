import pino from 'pino';
declare const logger: pino.Logger<never, boolean>;
export declare function createScopedLogger(scope: string): {
    debug: (msg: string, data?: Record<string, unknown>) => void;
    info: (msg: string, data?: Record<string, unknown>) => void;
    warn: (msg: string, data?: Record<string, unknown>) => void;
    error: (msg: string, error?: Error | unknown, data?: Record<string, unknown>) => void;
    fatal: (msg: string, data?: Record<string, unknown>) => void;
};
export declare function createToolTimer(toolName: string, args?: Record<string, unknown>): {
    start: () => void;
    success: (result?: {
        count?: number;
    }) => void;
    error: (error: Error) => void;
};
export declare function getLogFilePath(): string;
export default logger;
//# sourceMappingURL=logger.d.ts.map