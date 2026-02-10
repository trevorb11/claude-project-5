import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { Competitor } from "@/lib/types";

export async function GET() {
  const db = await getDb();
  const competitors = await db.getAll<Competitor>(
    "SELECT * FROM competitors ORDER BY created_at DESC"
  );
  return NextResponse.json(competitors);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = await getDb();
  const id = uuidv4();

  await db.run(
    `INSERT INTO competitors (id, name, website, notes, research_schedule)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, body.name, body.website || null, body.notes || null, body.research_schedule || "manual"]
  );

  const competitor = await db.getOne<Competitor>(
    "SELECT * FROM competitors WHERE id = $1",
    [id]
  );
  return NextResponse.json(competitor, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const db = await getDb();
  await db.run("DELETE FROM competitors WHERE id = $1", [id]);
  return NextResponse.json({ success: true });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const db = await getDb();

  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await db.run(
    `UPDATE competitors SET
      name = COALESCE($1, name),
      website = COALESCE($2, website),
      notes = COALESCE($3, notes),
      research_schedule = COALESCE($4, research_schedule),
      status = COALESCE($5, status),
      last_researched = COALESCE($6, last_researched),
      next_research = COALESCE($7, next_research),
      updated_at = NOW()
    WHERE id = $8`,
    [
      body.name ?? null,
      body.website ?? null,
      body.notes ?? null,
      body.research_schedule ?? null,
      body.status ?? null,
      body.last_researched ?? null,
      body.next_research ?? null,
      body.id,
    ]
  );

  const updated = await db.getOne<Competitor>(
    "SELECT * FROM competitors WHERE id = $1",
    [body.id]
  );
  return NextResponse.json(updated);
}
