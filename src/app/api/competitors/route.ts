import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { Competitor } from "@/lib/types";

export async function GET() {
  const db = getDb();
  const competitors = db
    .prepare("SELECT * FROM competitors ORDER BY created_at DESC")
    .all() as Competitor[];
  return NextResponse.json(competitors);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();
  const id = uuidv4();

  db.prepare(
    `INSERT INTO competitors (id, name, website, notes, research_schedule)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, body.name, body.website || null, body.notes || null, body.research_schedule || "manual");

  const competitor = db
    .prepare("SELECT * FROM competitors WHERE id = ?")
    .get(id) as Competitor;
  return NextResponse.json(competitor, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("DELETE FROM competitors WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const db = getDb();

  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  db.prepare(
    `UPDATE competitors SET
      name = COALESCE(?, name),
      website = COALESCE(?, website),
      notes = COALESCE(?, notes),
      research_schedule = COALESCE(?, research_schedule),
      status = COALESCE(?, status),
      last_researched = COALESCE(?, last_researched),
      next_research = COALESCE(?, next_research),
      updated_at = datetime('now')
    WHERE id = ?`
  ).run(
    body.name ?? null,
    body.website ?? null,
    body.notes ?? null,
    body.research_schedule ?? null,
    body.status ?? null,
    body.last_researched ?? null,
    body.next_research ?? null,
    body.id
  );

  const updated = db
    .prepare("SELECT * FROM competitors WHERE id = ?")
    .get(body.id) as Competitor;
  return NextResponse.json(updated);
}
