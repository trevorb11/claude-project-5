import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { FloorPlan } from "@/lib/types";

// GET /api/floorplans — list all floor plans, optionally filtered
// Query params: source=company|competitor, competitor_id=..., sort=price|sqft|bedrooms|value|price_per_sqft
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");
  const competitorId = searchParams.get("competitor_id");

  const db = getDb();

  let query = "SELECT * FROM floor_plans WHERE 1=1";
  const params: unknown[] = [];

  if (source) {
    query += " AND source = ?";
    params.push(source);
  }

  if (competitorId) {
    query += " AND competitor_id = ?";
    params.push(competitorId);
  }

  query += " ORDER BY created_at DESC";

  const plans = db.prepare(query).all(...params) as FloorPlan[];
  return NextResponse.json(plans);
}

// POST /api/floorplans — create a new floor plan (user's own company plans)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();

  const id = uuidv4();
  const pricePerSqft =
    body.base_price && body.sq_ft
      ? Math.round(body.base_price / body.sq_ft)
      : null;

  db.prepare(
    `INSERT INTO floor_plans (id, source, competitor_id, competitor_name, model_name, bedrooms, bathrooms, sq_ft, stories, garage_spaces, base_price, price_per_sqft, key_features, url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    body.source || "company",
    body.competitor_id || null,
    body.competitor_name || null,
    body.model_name,
    body.bedrooms ?? null,
    body.bathrooms ?? null,
    body.sq_ft ?? null,
    body.stories ?? null,
    body.garage_spaces ?? null,
    body.base_price ?? null,
    pricePerSqft,
    body.key_features ? JSON.stringify(body.key_features) : null,
    body.url || null
  );

  const plan = db.prepare("SELECT * FROM floor_plans WHERE id = ?").get(id);
  return NextResponse.json(plan);
}

// PUT /api/floorplans — update a floor plan
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const db = getDb();

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const pricePerSqft =
    body.base_price && body.sq_ft
      ? Math.round(body.base_price / body.sq_ft)
      : null;

  db.prepare(
    `UPDATE floor_plans SET
      model_name = ?,
      bedrooms = ?,
      bathrooms = ?,
      sq_ft = ?,
      stories = ?,
      garage_spaces = ?,
      base_price = ?,
      price_per_sqft = ?,
      key_features = ?,
      url = ?,
      updated_at = datetime('now')
    WHERE id = ?`
  ).run(
    body.model_name,
    body.bedrooms ?? null,
    body.bathrooms ?? null,
    body.sq_ft ?? null,
    body.stories ?? null,
    body.garage_spaces ?? null,
    body.base_price ?? null,
    pricePerSqft,
    body.key_features ? JSON.stringify(body.key_features) : null,
    body.url || null,
    body.id
  );

  const plan = db.prepare("SELECT * FROM floor_plans WHERE id = ?").get(body.id);
  return NextResponse.json(plan);
}

// DELETE /api/floorplans — delete a floor plan
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("DELETE FROM floor_plans WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
