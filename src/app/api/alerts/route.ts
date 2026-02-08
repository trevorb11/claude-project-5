import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { CompetitiveAlert } from "@/lib/types";

// GET /api/alerts?unread_only=true&competitor_id=xxx&limit=50
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread_only") === "true";
  const competitorId = searchParams.get("competitor_id");
  const limit = parseInt(searchParams.get("limit") || "50");

  const db = getDb();

  let query = "SELECT * FROM alerts";
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (unreadOnly) {
    conditions.push("read = 0");
  }
  if (competitorId) {
    conditions.push("competitor_id = ?");
    params.push(competitorId);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);

  const alerts = db.prepare(query).all(...params) as CompetitiveAlert[];

  return NextResponse.json(alerts);
}

// PUT /api/alerts — mark alerts as read
// Body: { ids: string[] } or { all: true }
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const db = getDb();

  if (body.all) {
    db.prepare("UPDATE alerts SET read = 1 WHERE read = 0").run();
  } else if (body.ids && Array.isArray(body.ids)) {
    const placeholders = body.ids.map(() => "?").join(",");
    db.prepare(
      `UPDATE alerts SET read = 1 WHERE id IN (${placeholders})`
    ).run(...body.ids);
  } else {
    return NextResponse.json(
      { error: "Provide { ids: [...] } or { all: true }" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
