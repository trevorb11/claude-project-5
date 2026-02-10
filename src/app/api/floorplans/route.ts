import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { FloorPlan } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");
  const competitorId = searchParams.get("competitor_id");

  const db = await getDb();

  let query = "SELECT * FROM floor_plans WHERE 1=1";
  const params: unknown[] = [];
  let paramIdx = 1;

  if (source) {
    query += ` AND source = $${paramIdx++}`;
    params.push(source);
  }

  if (competitorId) {
    query += ` AND competitor_id = $${paramIdx++}`;
    params.push(competitorId);
  }

  query += " ORDER BY created_at DESC";

  const plans = await db.getAll<FloorPlan>(query, params);
  return NextResponse.json(plans);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = await getDb();

  const id = uuidv4();
  const pricePerSqft =
    body.base_price && body.sq_ft
      ? Math.round(body.base_price / body.sq_ft)
      : null;

  await db.run(
    `INSERT INTO floor_plans (id, source, competitor_id, competitor_name, model_name, bedrooms, bathrooms, sq_ft, stories, garage_spaces, base_price, price_per_sqft, key_features, url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
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
      body.url || null,
    ]
  );

  const plan = await db.getOne("SELECT * FROM floor_plans WHERE id = $1", [id]);
  return NextResponse.json(plan);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const db = await getDb();

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const pricePerSqft =
    body.base_price && body.sq_ft
      ? Math.round(body.base_price / body.sq_ft)
      : null;

  await db.run(
    `UPDATE floor_plans SET
      model_name = $1,
      bedrooms = $2,
      bathrooms = $3,
      sq_ft = $4,
      stories = $5,
      garage_spaces = $6,
      base_price = $7,
      price_per_sqft = $8,
      key_features = $9,
      url = $10,
      updated_at = NOW()
    WHERE id = $11`,
    [
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
      body.id,
    ]
  );

  const plan = await db.getOne("SELECT * FROM floor_plans WHERE id = $1", [body.id]);
  return NextResponse.json(plan);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const db = await getDb();
  await db.run("DELETE FROM floor_plans WHERE id = $1", [id]);
  return NextResponse.json({ success: true });
}
