import Database from 'better-sqlite3';
/**
 * Get the path to the database file
 * Uses %APPDATA%/.uptier/tasks.db on Windows
 */
export declare function getDbPath(): string;
/**
 * Ensure the database directory exists
 */
export declare function ensureDbDirectory(): void;
/**
 * Initialize the database with schema and pragmas
 */
export declare function initializeDatabase(): Database.Database;
/**
 * Get the database instance (singleton)
 */
export declare function getDb(): Database.Database;
/**
 * Close the database connection
 */
export declare function closeDb(): void;
/**
 * Generate a unique ID (UUID-like)
 */
export declare function generateId(): string;
/**
 * Get current ISO datetime string
 */
export declare function nowISO(): string;
//# sourceMappingURL=database.d.ts.map