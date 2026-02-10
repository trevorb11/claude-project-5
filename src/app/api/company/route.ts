import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { CompanyProfile } from "@/lib/types";

export async function GET() {
  const db = await getDb();
  const profile = await db.getOne<CompanyProfile>(
    "SELECT * FROM company_profile WHERE id = 'main'"
  );
  return NextResponse.json(profile);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const db = await getDb();

  await db.run(
    `UPDATE company_profile SET
      name = $1, industry = $2, description = $3, products = $4,
      target_market = $5, key_differentiators = $6, updated_at = NOW()
    WHERE id = 'main'`,
    [
      body.name || "",
      body.industry || "",
      body.description || "",
      body.products || "",
      body.target_market || "",
      body.key_differentiators || "",
    ]
  );

  const updated = await db.getOne<CompanyProfile>(
    "SELECT * FROM company_profile WHERE id = 'main'"
  );
  return NextResponse.json(updated);
}
