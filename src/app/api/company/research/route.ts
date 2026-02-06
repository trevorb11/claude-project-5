import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { CompanyProfile, CompanyResearch } from "@/lib/types";
import { runCompanyDeepResearch } from "@/lib/research-agent";

export async function GET() {
  const db = getDb();
  const research = db
    .prepare(
      "SELECT * FROM company_research ORDER BY created_at DESC LIMIT 1"
    )
    .get() as CompanyResearch | undefined;
  return NextResponse.json(research || null);
}

export async function POST() {
  const db = getDb();

  const myCompany = db
    .prepare("SELECT * FROM company_profile WHERE id = 'main'")
    .get() as CompanyProfile;

  if (!myCompany.name || !myCompany.industry) {
    return NextResponse.json(
      { error: "Please complete your company profile before running deep research." },
      { status: 400 }
    );
  }

  const researchId = uuidv4();

  db.prepare(
    `INSERT INTO company_research (id, status)
     VALUES (?, 'in_progress')`
  ).run(researchId);

  try {
    const findings = await runCompanyDeepResearch(myCompany);

    db.prepare(
      `UPDATE company_research SET
        status = 'completed',
        findings = ?,
        completed_at = datetime('now')
      WHERE id = ?`
    ).run(JSON.stringify(findings), researchId);

    const research = db
      .prepare("SELECT * FROM company_research WHERE id = ?")
      .get(researchId) as CompanyResearch;
    return NextResponse.json(research);
  } catch (error) {
    db.prepare(
      "UPDATE company_research SET status = 'error' WHERE id = ?"
    ).run(researchId);

    return NextResponse.json(
      { error: "Company deep research failed", details: String(error) },
      { status: 500 }
    );
  }
}
