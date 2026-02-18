import * as SQLite from "expo-sqlite";

const BASE_DB_NAME = "force-collector";
let activeUserId = "guest";
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function resolveDbName() {
  return `${BASE_DB_NAME}-${activeUserId}.db`;
}

export function setActiveUserId(userId: string | null) {
  activeUserId = userId ?? "guest";
  dbPromise = null;
}

export async function clearUserDatabase(userId?: string | null) {
  const resolvedUserId = userId ?? activeUserId;
  const dbName = `${BASE_DB_NAME}-${resolvedUserId}.db`;
  dbPromise = null;
  try {
    await SQLite.deleteDatabaseAsync(dbName);
  } catch {
    // It's fine if the database doesn't exist yet.
  }
}

export async function getDatabase() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(resolveDbName());
    const db = await dbPromise;
    await migrate(db);
    await seedIfEmpty(db);
  }

  return dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS figures (
      id TEXT PRIMARY KEY NOT NULL,
      figure_id TEXT,
      name TEXT NOT NULL,
      series TEXT,
      status TEXT NOT NULL,
      last_price REAL,
      in_stock INTEGER,
      condition TEXT,
      purchase_price REAL,
      purchase_currency TEXT,
      purchase_date TEXT,
      notes TEXT,
      photo_refs TEXT,
      updated_at TEXT NOT NULL,
      sync_pending INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS pending_mutations (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  try {
    await db.execAsync("ALTER TABLE figures ADD COLUMN figure_id TEXT;");
  } catch {
    // Column already exists.
  }
  try {
    await db.execAsync("ALTER TABLE figures ADD COLUMN condition TEXT;");
  } catch {
    // Column already exists.
  }
  try {
    await db.execAsync("ALTER TABLE figures ADD COLUMN purchase_price REAL;");
  } catch {
    // Column already exists.
  }
  try {
    await db.execAsync("ALTER TABLE figures ADD COLUMN purchase_currency TEXT;");
  } catch {
    // Column already exists.
  }
  try {
    await db.execAsync("ALTER TABLE figures ADD COLUMN purchase_date TEXT;");
  } catch {
    // Column already exists.
  }
  try {
    await db.execAsync("ALTER TABLE figures ADD COLUMN notes TEXT;");
  } catch {
    // Column already exists.
  }
  try {
    await db.execAsync("ALTER TABLE figures ADD COLUMN photo_refs TEXT;");
  } catch {
    // Column already exists.
  }
}

async function seedIfEmpty(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM figures"
  );
  if (row && row.count > 0) {
    return;
  }

  const now = new Date().toISOString();
  await db.execAsync("BEGIN TRANSACTION;");
  try {
    await db.runAsync(
      "INSERT INTO figures (id, name, series, status, last_price, in_stock, updated_at, sync_pending) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        "fc-seed-1",
        "Ahsoka Tano",
        "The Clone Wars",
        "OWNED",
        34.99,
        1,
        now,
        0,
      ]
    );
    await db.runAsync(
      "INSERT INTO figures (id, name, series, status, last_price, in_stock, updated_at, sync_pending) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        "fc-seed-2",
        "Darth Vader",
        "Original Trilogy",
        "OWNED",
        29.99,
        1,
        now,
        0,
      ]
    );
    await db.runAsync(
      "INSERT INTO figures (id, name, series, status, last_price, in_stock, updated_at, sync_pending) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        "fc-seed-3",
        "The Mandalorian",
        "The Mandalorian",
        "OWNED",
        32.5,
        0,
        now,
        0,
      ]
    );
    await db.runAsync(
      "INSERT INTO figures (id, name, series, status, last_price, in_stock, updated_at, sync_pending) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        "fc-seed-4",
        "Bo-Katan Kryze",
        "The Mandalorian",
        "WISHLIST",
        27.0,
        1,
        now,
        0,
      ]
    );
    await db.runAsync(
      "INSERT INTO figures (id, name, series, status, last_price, in_stock, updated_at, sync_pending) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        "fc-seed-5",
        "Captain Rex",
        "The Clone Wars",
        "WISHLIST",
        36.0,
        0,
        now,
        0,
      ]
    );
    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}
