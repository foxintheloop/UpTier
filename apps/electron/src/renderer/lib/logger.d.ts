interface LoggerOptions {
    scope: string;
}
declare class RendererLogger {
    private scope;
    private isDev;
    constructor(options: LoggerOptions);
    private formatMessage;
    private log;
    debug(message: string, data?: Record<string, unknown>): void;
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void;
}
export declare function createLogger(scope: string): RendererLogger;
export declare const appLogger: RendererLogger;
export declare function setupGlobalErrorHandlers(): void;
export {};
//# sourceMappingURL=logger.d.ts.map