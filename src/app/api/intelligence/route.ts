import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { CompanyProfile, CaseFile, IntelligenceReport, CompanyResearch, CompanyResearchFindings } from "@/lib/types";
import { generateIntelligenceReport } from "@/lib/research-agent";

export async function GET() {
  try {
    const db = await getDb();
    const reports = await db.getAll<IntelligenceReport>(
      "SELECT * FROM intelligence_reports ORDER BY created_at DESC"
    );
    return NextResponse.json(reports);
  } catch (error) {
    console.error("Failed to fetch intelligence reports:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST() {
  try {
    const db = await getDb();

    const myCompany = await db.getOne<CompanyProfile>(
      "SELECT * FROM company_profile WHERE id = 'main'"
    );

    if (!myCompany) {
      return NextResponse.json(
        { error: "Company profile not set up. Go to Setup to configure your company first." },
        { status: 400 }
      );
    }

    const completedFiles = await db.getAll<CaseFile & { competitor_name: string }>(
      `SELECT cf.*, c.name as competitor_name
       FROM case_files cf
       JOIN competitors c ON cf.competitor_id = c.id
       WHERE cf.status = 'completed' AND cf.findings IS NOT NULL
         AND (cf.research_type IS NULL OR cf.research_type = 'full')
         AND cf.competitor_id != '__own_company__'
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

    const allFindings = Array.from(latestByCompetitor.values()).map((cf) => {
      try {
        return {
          competitorName: cf.competitor_name,
          findings: JSON.parse(cf.findings!),
        };
      } catch {
        return null;
      }
    }).filter(Boolean) as Array<{ competitorName: string; findings: CaseFileFindings }>;

    if (allFindings.length === 0) {
      return NextResponse.json(
        { error: "No valid case file findings to analyze." },
        { status: 400 }
      );
    }

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

    const { content, highlights } = await generateIntelligenceReport(
      myCompany,
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
    console.error("Intelligence report generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate report", details: String(error) },
      { status: 500 }
    );
  }
}
