import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { CompanyProfile, CompanyResearch } from "@/lib/types";
import { runCompanyDeepResearch, convertCompanyToCaseFileFindings } from "@/lib/research-agent";

const COMPANY_COMPETITOR_ID = "__own_company__";

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

    // ─── Also create/update a competitor entry + case file for the company ───
    // This allows the company to appear in Case Files and Compare pages

    const existingCompetitor = db
      .prepare("SELECT id FROM competitors WHERE id = ?")
      .get(COMPANY_COMPETITOR_ID);

    if (existingCompetitor) {
      db.prepare(
        `UPDATE competitors SET
          name = ?,
          website = ?,
          status = 'completed',
          last_researched = datetime('now'),
          is_own_company = 1,
          updated_at = datetime('now')
        WHERE id = ?`
      ).run(myCompany.name, null, COMPANY_COMPETITOR_ID);
    } else {
      db.prepare(
        `INSERT INTO competitors (id, name, website, notes, research_schedule, status, is_own_company)
         VALUES (?, ?, NULL, 'Your company self-assessment', 'manual', 'completed', 1)`
      ).run(COMPANY_COMPETITOR_ID, myCompany.name);
    }

    // Convert company findings to case file format
    const caseFileFindings = convertCompanyToCaseFileFindings(findings, myCompany.name);
    const caseFileId = uuidv4();
    const summary = findings.overview.summary.substring(0, 200) + "...";

    // Remove old company case files (keep only the latest)
    db.prepare(
      "DELETE FROM case_files WHERE competitor_id = ?"
    ).run(COMPANY_COMPETITOR_ID);

    db.prepare(
      `INSERT INTO case_files (id, competitor_id, title, summary, research_type, status, findings, completed_at)
       VALUES (?, ?, ?, ?, 'full', 'completed', ?, datetime('now'))`
    ).run(
      caseFileId,
      COMPANY_COMPETITOR_ID,
      `Self-Assessment: ${myCompany.name}`,
      summary,
      JSON.stringify(caseFileFindings)
    );

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
