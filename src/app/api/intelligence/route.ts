import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { CompanyProfile, CaseFile, IntelligenceReport } from "@/lib/types";
import { generateIntelligenceReport } from "@/lib/research-agent";

export async function GET() {
  const db = getDb();
  const reports = db
    .prepare("SELECT * FROM intelligence_reports ORDER BY created_at DESC")
    .all() as IntelligenceReport[];
  return NextResponse.json(reports);
}

export async function POST() {
  const db = getDb();

  const myCompany = db
    .prepare("SELECT * FROM company_profile WHERE id = 'main'")
    .get() as CompanyProfile;

  // Get all completed case files with their latest findings
  const completedFiles = db
    .prepare(
      `SELECT cf.*, c.name as competitor_name
       FROM case_files cf
       JOIN competitors c ON cf.competitor_id = c.id
       WHERE cf.status = 'completed' AND cf.findings IS NOT NULL
       ORDER BY cf.completed_at DESC`
    )
    .all() as (CaseFile & { competitor_name: string })[];

  if (completedFiles.length === 0) {
    return NextResponse.json(
      { error: "No completed case files to analyze. Run research on competitors first." },
      { status: 400 }
    );
  }

  // Get the latest case file per competitor
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

  try {
    const { content, highlights } = await generateIntelligenceReport(
      myCompany,
      allFindings
    );

    const reportId = uuidv4();
    const competitorIds = Array.from(latestByCompetitor.keys()).join(",");

    db.prepare(
      `INSERT INTO intelligence_reports (id, title, content, highlights, competitor_ids)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      reportId,
      `Intelligence Briefing — ${new Date().toLocaleDateString()}`,
      content,
      highlights,
      competitorIds
    );

    const report = db
      .prepare("SELECT * FROM intelligence_reports WHERE id = ?")
      .get(reportId) as IntelligenceReport;
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate report", details: String(error) },
      { status: 500 }
    );
  }
}
