import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { DB_FILENAME, DB_DIRECTORY } from '@uptier/shared';
import { createScopedLogger } from './logger';
import { getActiveProfile } from './settings';
const dbLog = createScopedLogger('database');
let db = null;
let currentDbPath = null;
export function getDbPath() {
    // Use active profile path if available
    const activeProfile = getActiveProfile();
    if (activeProfile?.path) {
        return activeProfile.path;
    }
    // Fallback to default path
    const appData = process.env.APPDATA || process.env.HOME || '';
    const dbPath = join(appData, DB_DIRECTORY, DB_FILENAME);
    return dbPath;
}
export function getCurrentDbPath() {
    return currentDbPath;
}
function ensureDbDirectory() {
    const dbPath = getDbPath();
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
        dbLog.info('Creating database directory', { path: dbDir });
        mkdirSync(dbDir, { recursive: true });
    }
}
function getSchema() {
    // Try multiple paths to find schema.sql
    const possiblePaths = [
        join(__dirname, '../../node_modules/@uptier/shared/src/schema.sql'),
        join(__dirname, '../../../node_modules/@uptier/shared/src/schema.sql'),
        join(__dirname, '../../../../packages/shared/src/schema.sql'),
    ];
    dbLog.debug('Searching for schema file', { paths: possiblePaths });
    for (const schemaPath of possiblePaths) {
        if (existsSync(schemaPath)) {
            dbLog.info('Schema file found', { path: schemaPath });
            return readFileSync(schemaPath, 'utf-8');
        }
    }
    const error = new Error('Could not find schema.sql');
    dbLog.error('Schema file not found', error, { searchedPaths: possiblePaths });
    throw error;
}
function openDatabase(dbPath) {
    dbLog.info('Opening database', { path: dbPath });
    const database = new Database(dbPath);
    dbLog.info('Database opened successfully');
    // Enable WAL mode for concurrent access
    database.pragma('journal_mode = WAL');
    database.pragma('busy_timeout = 5000');
    database.pragma('foreign_keys = ON');
    dbLog.debug('Database pragmas set', {
        journalMode: 'WAL',
        busyTimeout: 5000,
        foreignKeys: true,
    });
    // Run schema
    const schema = getSchema();
    database.exec(schema);
    dbLog.info('Database schema applied');
    return database;
}
export function initializeDatabase() {
    if (db && currentDbPath === getDbPath()) {
        dbLog.debug('Returning existing database connection');
        return db;
    }
    dbLog.info('Initializing database');
    ensureDbDirectory();
    const dbPath = getDbPath();
    try {
        db = openDatabase(dbPath);
        currentDbPath = dbPath;
        return db;
    }
    catch (error) {
        dbLog.error('Database initialization failed', error, { path: dbPath });
        throw error;
    }
}
/**
 * Switch to a different database profile
 */
export function switchDatabase(profile) {
    dbLog.info('Switching database', { profileId: profile.id, profileName: profile.name, path: profile.path });
    try {
        // Close current database with WAL checkpoint
        if (db) {
            dbLog.debug('Checkpointing and closing current database');
            try {
                db.pragma('wal_checkpoint(TRUNCATE)');
            }
            catch {
                dbLog.warn('WAL checkpoint failed, proceeding with close');
            }
            db.close();
            db = null;
            currentDbPath = null;
        }
        // Ensure directory exists for new database
        const dbDir = dirname(profile.path);
        if (!existsSync(dbDir)) {
            dbLog.info('Creating database directory', { path: dbDir });
            mkdirSync(dbDir, { recursive: true });
        }
        // Open new database
        db = openDatabase(profile.path);
        currentDbPath = profile.path;
        dbLog.info('Database switched successfully', { profileId: profile.id });
        return { success: true };
    }
    catch (error) {
        dbLog.error('Failed to switch database', error, { profileId: profile.id });
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
export function getDb() {
    if (!db) {
        dbLog.debug('No existing connection, initializing database');
        db = initializeDatabase();
    }
    return db;
}
export function closeDb() {
    if (db) {
        dbLog.info('Closing database connection');
        try {
            db.close();
            db = null;
            dbLog.info('Database connection closed');
        }
        catch (error) {
            dbLog.error('Error closing database', error);
        }
    }
}
export function generateId() {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}
export function nowISO() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}
//# sourceMappingURL=database.js.map