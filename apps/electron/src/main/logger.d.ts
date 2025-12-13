import log from 'electron-log/main';
export declare function initializeLogger(): void;
export declare function createScopedLogger(scope: string): {
    debug: (message: string, data?: Record<string, unknown>) => void;
    info: (message: string, data?: Record<string, unknown>) => void;
    warn: (message: string, data?: Record<string, unknown>) => void;
    error: (message: string, error?: Error | unknown, data?: Record<string, unknown>) => void;
};
export declare function createIpcTimer(channel: string): {
    requestId: string;
    start: () => void;
    end: (result?: {
        success: boolean;
        error?: string;
    }) => void;
    error: (err: Error) => void;
};
export default log;
//# sourceMappingURL=logger.d.ts.map