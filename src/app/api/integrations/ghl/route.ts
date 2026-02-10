import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { GHLConfig, GHLContactMapping } from "@/lib/types";
import {
  testGHLConnection,
  ensureCustomFields,
  fullSyncToGHL,
} from "@/lib/ghl";

export async function GET() {
  const db = await getDb();

  const config = await db.getOne<GHLConfig>(
    "SELECT * FROM ghl_config WHERE id = 'main'"
  );

  const mappings = await db.getAll<GHLContactMapping & { competitor_name: string }>(
    `SELECT m.*, c.name as competitor_name
     FROM ghl_contact_mappings m
     JOIN competitors c ON c.id = m.competitor_id
     ORDER BY m.created_at DESC`
  );

  return NextResponse.json({
    config: config || null,
    mappings,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = await getDb();

  if (body.action === "save") {
    const existing = await db.getOne(
      "SELECT id FROM ghl_config WHERE id = 'main'"
    );

    if (existing) {
      await db.run(
        `UPDATE ghl_config SET
          api_key = $1,
          location_id = $2,
          enabled = $3,
          sync_on_research = $4,
          sync_on_alert = $5,
          updated_at = NOW()
        WHERE id = 'main'`,
        [
          body.api_key || "",
          body.location_id || "",
          body.enabled ? 1 : 0,
          body.sync_on_research !== false ? 1 : 0,
          body.sync_on_alert !== false ? 1 : 0,
        ]
      );
    } else {
      await db.run(
        `INSERT INTO ghl_config (id, api_key, location_id, enabled, sync_on_research, sync_on_alert)
         VALUES ('main', $1, $2, $3, $4, $5)`,
        [
          body.api_key || "",
          body.location_id || "",
          body.enabled ? 1 : 0,
          body.sync_on_research !== false ? 1 : 0,
          body.sync_on_alert !== false ? 1 : 0,
        ]
      );
    }

    const config = await db.getOne<GHLConfig>(
      "SELECT * FROM ghl_config WHERE id = 'main'"
    );

    return NextResponse.json({ success: true, config });
  }

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

  if (body.action === "setup_fields") {
    const config = await db.getOne<GHLConfig>(
      "SELECT * FROM ghl_config WHERE id = 'main'"
    );

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

export async function DELETE() {
  const db = await getDb();
  await db.run("DELETE FROM ghl_config WHERE id = 'main'");
  await db.run("DELETE FROM ghl_contact_mappings");

  return NextResponse.json({ success: true });
}
