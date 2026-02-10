import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { CompetitiveAlert } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread_only") === "true";
  const competitorId = searchParams.get("competitor_id");
  const limit = parseInt(searchParams.get("limit") || "50");

  const db = await getDb();

  let query = "SELECT * FROM alerts";
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (unreadOnly) {
    conditions.push("read = 0");
  }
  if (competitorId) {
    conditions.push(`competitor_id = $${paramIdx++}`);
    params.push(competitorId);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += ` ORDER BY created_at DESC LIMIT $${paramIdx}`;
  params.push(limit);

  const alerts = await db.getAll<CompetitiveAlert>(query, params);

  return NextResponse.json(alerts);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const db = await getDb();

  if (body.all) {
    await db.run("UPDATE alerts SET read = 1 WHERE read = 0");
  } else if (body.ids && Array.isArray(body.ids)) {
    const placeholders = body.ids.map((_: string, i: number) => `$${i + 1}`).join(",");
    await db.run(
      `UPDATE alerts SET read = 1 WHERE id IN (${placeholders})`,
      body.ids
    );
  } else {
    return NextResponse.json(
      { error: "Provide { ids: [...] } or { all: true }" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
