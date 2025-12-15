import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { DB_FILENAME, DB_DIRECTORY } from '@uptier/shared';

// ESM compatibility: create require function for resolving package paths
const require = createRequire(import.meta.url);

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
 * Try to resolve schema.sql using require.resolve
 * This works for npm-installed packages (both @uptier/shared and aliased versions)
 */
function tryResolveSchema(): string | null {
  try {
    // This will work when installed from npm (resolves the package export)
    return require.resolve('@uptier/shared/schema.sql');
  } catch {
    return null;
  }
}

/**
 * Get the schema SQL from the shared package
 */
function getSchema(): string {
  // Try multiple paths to find schema.sql
  // Order: npm-installed packages, standalone deployment, monorepo packages
  const possiblePaths: (string | null)[] = [
    // npm-installed: try to resolve via package exports
    tryResolveSchema(),
    // Standalone deployment (npm file: dep)
    join(__dirname, 'node_modules/@uptier/shared/src/schema.sql'),
    // Standalone deployment (direct copy)
    join(__dirname, '../shared/src/schema.sql'),
    // Monorepo node_modules
    join(__dirname, '../../node_modules/@uptier/shared/src/schema.sql'),
    // Monorepo packages
    join(__dirname, '../../../packages/shared/src/schema.sql'),
    join(__dirname, '../../../../packages/shared/src/schema.sql'),
  ];

  const validPaths = possiblePaths.filter((p): p is string => p !== null);

  for (const schemaPath of validPaths) {
    if (existsSync(schemaPath)) {
      return readFileSync(schemaPath, 'utf-8');
    }
  }

  throw new Error('Could not find schema.sql. Searched paths:\n' + validPaths.join('\n'));
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
