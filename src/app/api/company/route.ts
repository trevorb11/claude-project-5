import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { CompanyProfile } from "@/lib/types";

export async function GET() {
  const db = getDb();
  const profile = db
    .prepare("SELECT * FROM company_profile WHERE id = 'main'")
    .get() as CompanyProfile;
  return NextResponse.json(profile);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const db = getDb();

  db.prepare(
    `UPDATE company_profile SET
      name = ?, industry = ?, description = ?, products = ?,
      target_market = ?, key_differentiators = ?, updated_at = datetime('now')
    WHERE id = 'main'`
  ).run(
    body.name || "",
    body.industry || "",
    body.description || "",
    body.products || "",
    body.target_market || "",
    body.key_differentiators || ""
  );

  const updated = db
    .prepare("SELECT * FROM company_profile WHERE id = 'main'")
    .get() as CompanyProfile;
  return NextResponse.json(updated);
}
