import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { CompanyProfile, CompanyResearch } from "@/lib/types";
import { runCompanyDeepResearch, convertCompanyToCaseFileFindings } from "@/lib/research-agent";

const COMPANY_COMPETITOR_ID = "__own_company__";

export async function GET() {
  const db = await getDb();
  const research = await db.getOne<CompanyResearch>(
    "SELECT * FROM company_research ORDER BY created_at DESC LIMIT 1"
  );
  return NextResponse.json(research || null);
}

export async function POST() {
  const db = await getDb();

  const myCompany = await db.getOne<CompanyProfile>(
    "SELECT * FROM company_profile WHERE id = 'main'"
  );

  if (!myCompany || !myCompany.name || !myCompany.industry) {
    return NextResponse.json(
      { error: "Please complete your company profile before running deep research." },
      { status: 400 }
    );
  }

  const researchId = uuidv4();

  await db.run(
    `INSERT INTO company_research (id, status)
     VALUES ($1, 'in_progress')`,
    [researchId]
  );

  try {
    const findings = await runCompanyDeepResearch(myCompany);

    await db.run(
      `UPDATE company_research SET
        status = 'completed',
        findings = $1,
        completed_at = NOW()
      WHERE id = $2`,
      [JSON.stringify(findings), researchId]
    );

    const existingCompetitor = await db.getOne(
      "SELECT id FROM competitors WHERE id = $1",
      [COMPANY_COMPETITOR_ID]
    );

    if (existingCompetitor) {
      await db.run(
        `UPDATE competitors SET
          name = $1,
          website = $2,
          status = 'completed',
          last_researched = NOW(),
          is_own_company = 1,
          updated_at = NOW()
        WHERE id = $3`,
        [myCompany.name, null, COMPANY_COMPETITOR_ID]
      );
    } else {
      await db.run(
        `INSERT INTO competitors (id, name, website, notes, research_schedule, status, is_own_company)
         VALUES ($1, $2, NULL, 'Your company self-assessment', 'manual', 'completed', 1)`,
        [COMPANY_COMPETITOR_ID, myCompany.name]
      );
    }

    const caseFileFindings = convertCompanyToCaseFileFindings(findings, myCompany.name);
    const caseFileId = uuidv4();
    const summary = findings.overview.summary.substring(0, 200) + "...";

    await db.run(
      "DELETE FROM case_files WHERE competitor_id = $1",
      [COMPANY_COMPETITOR_ID]
    );

    await db.run(
      `INSERT INTO case_files (id, competitor_id, title, summary, research_type, status, findings, completed_at)
       VALUES ($1, $2, $3, $4, 'full', 'completed', $5, NOW())`,
      [
        caseFileId,
        COMPANY_COMPETITOR_ID,
        `Self-Assessment: ${myCompany.name}`,
        summary,
        JSON.stringify(caseFileFindings),
      ]
    );

    const research = await db.getOne<CompanyResearch>(
      "SELECT * FROM company_research WHERE id = $1",
      [researchId]
    );
    return NextResponse.json(research);
  } catch (error) {
    await db.run(
      "UPDATE company_research SET status = 'error' WHERE id = $1",
      [researchId]
    );

    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Company deep research POST error:", errorMsg);
    return NextResponse.json(
      { error: "Company deep research failed. The AI search completed but had trouble formatting the results. Please try again.", details: errorMsg },
      { status: 500 }
    );
  }
}
