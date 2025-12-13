import Database from 'better-sqlite3';
import type { DatabaseProfile } from './settings';
export declare function getDbPath(): string;
export declare function getCurrentDbPath(): string | null;
export declare function initializeDatabase(): Database.Database;
/**
 * Switch to a different database profile
 */
export declare function switchDatabase(profile: DatabaseProfile): {
    success: boolean;
    error?: string;
};
export declare function getDb(): Database.Database;
export declare function closeDb(): void;
export declare function generateId(): string;
export declare function nowISO(): string;
//# sourceMappingURL=database.d.ts.map