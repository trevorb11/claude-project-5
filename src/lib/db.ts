import { Pool, QueryResult } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let initialized = false;

async function initializeDb(): Promise<void> {
  if (initialized) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS company_profile (
      id TEXT PRIMARY KEY DEFAULT 'main',
      name TEXT NOT NULL DEFAULT '',
      industry TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      products TEXT NOT NULL DEFAULT '',
      target_market TEXT NOT NULL DEFAULT '',
      key_differentiators TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
      is_own_company INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS company_research (
      id TEXT PRIMARY KEY,
      findings TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS intelligence_reports (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      highlights TEXT,
      competitor_ids TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ghl_config (
      id TEXT PRIMARY KEY DEFAULT 'main',
      api_key TEXT NOT NULL DEFAULT '',
      location_id TEXT NOT NULL DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 0,
      sync_on_research INTEGER NOT NULL DEFAULT 1,
      sync_on_alert INTEGER NOT NULL DEFAULT 1,
      last_synced TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ghl_contact_mappings (
      id TEXT PRIMARY KEY,
      competitor_id TEXT NOT NULL UNIQUE,
      ghl_contact_id TEXT NOT NULL,
      last_synced TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS floor_plans (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL DEFAULT 'competitor',
      competitor_id TEXT,
      competitor_name TEXT,
      model_name TEXT NOT NULL,
      bedrooms INTEGER,
      bathrooms DOUBLE PRECISION,
      sq_ft INTEGER,
      stories INTEGER,
      garage_spaces INTEGER,
      base_price DOUBLE PRECISION,
      price_per_sqft DOUBLE PRECISION,
      key_features TEXT,
      value_score DOUBLE PRECISION,
      url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const existing = await pool.query("SELECT id FROM company_profile WHERE id = 'main'");
  if (existing.rows.length === 0) {
    await pool.query("INSERT INTO company_profile (id) VALUES ('main')");
  }

  initialized = true;
}

export interface DbClient {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<QueryResult<T>>;
  getOne: <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T | undefined>;
  getAll: <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;
  run: (text: string, params?: unknown[]) => Promise<void>;
}

export async function getDb(): Promise<DbClient> {
  await initializeDb();

  return {
    query: <T extends Record<string, unknown> = Record<string, unknown>>(text: string, params?: unknown[]) =>
      pool.query<T>(text, params),

    getOne: async <T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T | undefined> => {
      const result = await pool.query(text, params);
      return result.rows[0] as T | undefined;
    },

    getAll: async <T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]> => {
      const result = await pool.query(text, params);
      return result.rows as T[];
    },

    run: async (text: string, params?: unknown[]): Promise<void> => {
      await pool.query(text, params);
    },
  };
}
