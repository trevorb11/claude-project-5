import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "casefiles.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_profile (
      id TEXT PRIMARY KEY DEFAULT 'main',
      name TEXT NOT NULL DEFAULT '',
      industry TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      products TEXT NOT NULL DEFAULT '',
      target_market TEXT NOT NULL DEFAULT '',
      key_differentiators TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS competitors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      website TEXT,
      notes TEXT,
      research_schedule TEXT DEFAULT 'manual',
      last_researched TEXT,
      next_research TEXT,
      status TEXT DEFAULT 'idle',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS case_files (
      id TEXT PRIMARY KEY,
      competitor_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      research_type TEXT DEFAULT 'full',
      status TEXT DEFAULT 'pending',
      findings TEXT,
      raw_data TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS company_research (
      id TEXT PRIMARY KEY,
      findings TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS intelligence_reports (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      highlights TEXT,
      competitor_ids TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ghl_config (
      id TEXT PRIMARY KEY DEFAULT 'main',
      api_key TEXT NOT NULL DEFAULT '',
      location_id TEXT NOT NULL DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 0,
      sync_on_research INTEGER NOT NULL DEFAULT 1,
      sync_on_alert INTEGER NOT NULL DEFAULT 1,
      last_synced TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ghl_contact_mappings (
      id TEXT PRIMARY KEY,
      competitor_id TEXT NOT NULL UNIQUE,
      ghl_contact_id TEXT NOT NULL,
      last_synced TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      competitor_id TEXT NOT NULL,
      competitor_name TEXT NOT NULL,
      case_file_id TEXT,
      alert_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE
    );
  `);

  // Ensure a default profile row exists
  const existing = db.prepare("SELECT id FROM company_profile WHERE id = 'main'").get();
  if (!existing) {
    db.prepare("INSERT INTO company_profile (id) VALUES ('main')").run();
  }
}
