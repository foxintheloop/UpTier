import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { DB_FILENAME, DB_DIRECTORY } from '@uptier/shared';
import { createScopedLogger } from './logger';

const dbLog = createScopedLogger('database');

let db: Database.Database | null = null;

export function getDbPath(): string {
  const appData = process.env.APPDATA || process.env.HOME || '';
  const dbPath = join(appData, DB_DIRECTORY, DB_FILENAME);
  return dbPath;
}

function ensureDbDirectory(): void {
  const dbPath = getDbPath();
  const dbDir = dirname(dbPath);

  if (!existsSync(dbDir)) {
    dbLog.info('Creating database directory', { path: dbDir });
    mkdirSync(dbDir, { recursive: true });
  }
}

function getSchema(): string {
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

export function initializeDatabase(): Database.Database {
  if (db) {
    dbLog.debug('Returning existing database connection');
    return db;
  }

  dbLog.info('Initializing database');
  ensureDbDirectory();

  const dbPath = getDbPath();
  dbLog.info('Opening database', { path: dbPath });

  try {
    db = new Database(dbPath);
    dbLog.info('Database opened successfully');

    // Enable WAL mode for concurrent access
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    db.pragma('foreign_keys = ON');
    dbLog.debug('Database pragmas set', {
      journalMode: 'WAL',
      busyTimeout: 5000,
      foreignKeys: true,
    });

    // Run schema
    const schema = getSchema();
    db.exec(schema);
    dbLog.info('Database schema applied');

    return db;
  } catch (error) {
    dbLog.error('Database initialization failed', error as Error, { path: dbPath });
    throw error;
  }
}

export function getDb(): Database.Database {
  if (!db) {
    dbLog.debug('No existing connection, initializing database');
    db = initializeDatabase();
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    dbLog.info('Closing database connection');
    try {
      db.close();
      db = null;
      dbLog.info('Database connection closed');
    } catch (error) {
      dbLog.error('Error closing database', error as Error);
    }
  }
}

export function generateId(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

export function nowISO(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}
