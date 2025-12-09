import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DB_FILENAME, DB_DIRECTORY } from '@uptier/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db: Database.Database | null = null;

/**
 * Get the path to the database file
 * Uses %APPDATA%/.uptier/tasks.db on Windows
 */
export function getDbPath(): string {
  const appData = process.env.APPDATA || process.env.HOME || '';
  return join(appData, DB_DIRECTORY, DB_FILENAME);
}

/**
 * Ensure the database directory exists
 */
export function ensureDbDirectory(): void {
  const dbPath = getDbPath();
  const dbDir = dirname(dbPath);

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
}

/**
 * Get the schema SQL from the shared package
 */
function getSchema(): string {
  // Try multiple paths to find schema.sql
  const possiblePaths = [
    join(__dirname, '../../node_modules/@uptier/shared/src/schema.sql'),
    join(__dirname, '../../../packages/shared/src/schema.sql'),
    join(__dirname, '../../../../packages/shared/src/schema.sql'),
  ];

  for (const schemaPath of possiblePaths) {
    if (existsSync(schemaPath)) {
      return readFileSync(schemaPath, 'utf-8');
    }
  }

  throw new Error('Could not find schema.sql');
}

/**
 * Initialize the database with schema and pragmas
 */
export function initializeDatabase(): Database.Database {
  ensureDbDirectory();

  const dbPath = getDbPath();
  const database = new Database(dbPath);

  // Enable WAL mode for concurrent access
  database.pragma('journal_mode = WAL');
  database.pragma('busy_timeout = 5000');
  database.pragma('foreign_keys = ON');

  // Run schema
  const schema = getSchema();
  database.exec(schema);

  return database;
}

/**
 * Get the database instance (singleton)
 */
export function getDb(): Database.Database {
  if (!db) {
    db = initializeDatabase();
  }
  return db;
}

/**
 * Close the database connection
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Generate a unique ID (UUID-like)
 */
export function generateId(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Get current ISO datetime string
 */
export function nowISO(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}
