import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { CompanyProfile, CaseFile, IntelligenceReport, CompanyResearch, CompanyResearchFindings } from "@/lib/types";
import { generateIntelligenceReport } from "@/lib/research-agent";

export async function GET() {
  const db = await getDb();
  const reports = await db.getAll<IntelligenceReport>(
    "SELECT * FROM intelligence_reports ORDER BY created_at DESC"
  );
  return NextResponse.json(reports);
}

export async function POST() {
  const db = await getDb();

  const myCompany = await db.getOne<CompanyProfile>(
    "SELECT * FROM company_profile WHERE id = 'main'"
  );

  const completedFiles = await db.getAll<CaseFile & { competitor_name: string }>(
    `SELECT cf.*, c.name as competitor_name
     FROM case_files cf
     JOIN competitors c ON cf.competitor_id = c.id
     WHERE cf.status = 'completed' AND cf.findings IS NOT NULL
     ORDER BY cf.completed_at DESC`
  );

  if (completedFiles.length === 0) {
    return NextResponse.json(
      { error: "No completed case files to analyze. Run research on competitors first." },
      { status: 400 }
    );
  }

  const latestByCompetitor = new Map<string, CaseFile & { competitor_name: string }>();
  for (const cf of completedFiles) {
    if (!latestByCompetitor.has(cf.competitor_id)) {
      latestByCompetitor.set(cf.competitor_id, cf);
    }
  }

  const allFindings = Array.from(latestByCompetitor.values()).map((cf) => ({
    competitorName: cf.competitor_name,
    findings: JSON.parse(cf.findings!),
  }));

  const companyResearchRow = await db.getOne<CompanyResearch>(
    "SELECT * FROM company_research WHERE status = 'completed' AND findings IS NOT NULL ORDER BY completed_at DESC LIMIT 1"
  );

  let companyResearch: CompanyResearchFindings | null = null;
  if (companyResearchRow?.findings) {
    try {
      companyResearch = JSON.parse(companyResearchRow.findings);
    } catch {
    }
  }

  try {
    const { content, highlights } = await generateIntelligenceReport(
      myCompany!,
      allFindings,
      companyResearch
    );

    const reportId = uuidv4();
    const competitorIds = Array.from(latestByCompetitor.keys()).join(",");

    await db.run(
      `INSERT INTO intelligence_reports (id, title, content, highlights, competitor_ids)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        reportId,
        `Intelligence Briefing — ${new Date().toLocaleDateString()}`,
        content,
        highlights,
        competitorIds,
      ]
    );

    const report = await db.getOne<IntelligenceReport>(
      "SELECT * FROM intelligence_reports WHERE id = $1",
      [reportId]
    );
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate report", details: String(error) },
      { status: 500 }
    );
  }
}
