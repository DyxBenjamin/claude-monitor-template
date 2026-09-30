/**
 * @file Exports `openDb`: SQLite in WAL mode with a busy timeout, creating the items, events, cursors and heartbeats tables.
 * @tags sqlite, database
 * @related src/shared/config.ts, src/shared/schemas.ts
 */
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config.ts";

// mcp, web and monitor run as separate processes on the same file:
// WAL lets readers proceed during a write, busy_timeout waits out write locks.
export function openDb(path = config.dbPath): Database {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { create: true, strict: true });
  db.run("PRAGMA busy_timeout = 5000");
  db.run("PRAGMA journal_mode = WAL");
  db.run(SCHEMA);
  return db;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  done       INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT    NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  source     TEXT    NOT NULL CHECK (source IN ('user', 'claude')),
  action     TEXT    NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  item_id    INTEGER NOT NULL,
  item       TEXT    NOT NULL,
  created_at TEXT    NOT NULL
);
CREATE TABLE IF NOT EXISTS cursors (
  name     TEXT    PRIMARY KEY,
  event_id INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS heartbeats (
  service TEXT    PRIMARY KEY,
  pid     INTEGER NOT NULL,
  beat_at INTEGER NOT NULL
);
`;
