import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { GHLConfig, GHLContactMapping } from "@/lib/types";
import {
  testGHLConnection,
  ensureCustomFields,
  fullSyncToGHL,
} from "@/lib/ghl";

// GET /api/integrations/ghl — get current config + mappings
export async function GET() {
  const db = getDb();

  const config = db
    .prepare("SELECT * FROM ghl_config WHERE id = 'main'")
    .get() as GHLConfig | undefined;

  const mappings = db
    .prepare(
      `SELECT m.*, c.name as competitor_name
       FROM ghl_contact_mappings m
       JOIN competitors c ON c.id = m.competitor_id
       ORDER BY m.created_at DESC`
    )
    .all() as Array<GHLContactMapping & { competitor_name: string }>;

  return NextResponse.json({
    config: config || null,
    mappings,
  });
}

// POST /api/integrations/ghl — save config, test connection, or trigger sync
// Body: { action: "save" | "test" | "sync" | "setup_fields", ...data }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();

  // ─── Save Config ───
  if (body.action === "save") {
    const existing = db
      .prepare("SELECT id FROM ghl_config WHERE id = 'main'")
      .get();

    if (existing) {
      db.prepare(
        `UPDATE ghl_config SET
          api_key = ?,
          location_id = ?,
          enabled = ?,
          sync_on_research = ?,
          sync_on_alert = ?,
          updated_at = datetime('now')
        WHERE id = 'main'`
      ).run(
        body.api_key || "",
        body.location_id || "",
        body.enabled ? 1 : 0,
        body.sync_on_research !== false ? 1 : 0,
        body.sync_on_alert !== false ? 1 : 0
      );
    } else {
      db.prepare(
        `INSERT INTO ghl_config (id, api_key, location_id, enabled, sync_on_research, sync_on_alert)
         VALUES ('main', ?, ?, ?, ?, ?)`
      ).run(
        body.api_key || "",
        body.location_id || "",
        body.enabled ? 1 : 0,
        body.sync_on_research !== false ? 1 : 0,
        body.sync_on_alert !== false ? 1 : 0
      );
    }

    const config = db
      .prepare("SELECT * FROM ghl_config WHERE id = 'main'")
      .get() as GHLConfig;

    return NextResponse.json({ success: true, config });
  }

  // ─── Test Connection ───
  if (body.action === "test") {
    if (!body.api_key || !body.location_id) {
      return NextResponse.json(
        { success: false, error: "API key and Location ID are required" },
        { status: 400 }
      );
    }

    const result = await testGHLConnection(body.api_key, body.location_id);
    return NextResponse.json(result);
  }

  // ─── Setup Custom Fields ───
  if (body.action === "setup_fields") {
    const config = db
      .prepare("SELECT * FROM ghl_config WHERE id = 'main'")
      .get() as GHLConfig | undefined;

    if (!config?.api_key || !config?.location_id) {
      return NextResponse.json(
        { success: false, error: "GHL not configured" },
        { status: 400 }
      );
    }

    try {
      const fieldMap = await ensureCustomFields(
        config.api_key,
        config.location_id
      );
      return NextResponse.json({
        success: true,
        fieldsCreated: Object.keys(fieldMap).length,
        fields: fieldMap,
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: String(error) },
        { status: 500 }
      );
    }
  }

  // ─── Full Sync ───
  if (body.action === "sync") {
    try {
      const result = await fullSyncToGHL();
      return NextResponse.json({ success: true, ...result });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: String(error) },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Unknown action. Use: save, test, setup_fields, or sync" },
    { status: 400 }
  );
}

// DELETE /api/integrations/ghl — disconnect / clear config
export async function DELETE() {
  const db = getDb();
  db.prepare("DELETE FROM ghl_config WHERE id = 'main'").run();
  db.prepare("DELETE FROM ghl_contact_mappings").run();

  return NextResponse.json({ success: true });
}
