import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { CompanyProfile, Competitor, CaseFile, CompanyResearch, CompanyResearchFindings, CaseFileFindings } from "@/lib/types";
import { runDeepResearch, runResearchUpdate } from "@/lib/research-agent";
import { detectChanges } from "@/lib/change-detection";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const competitorId = searchParams.get("competitor_id");

  const db = getDb();

  if (competitorId) {
    const caseFiles = db
      .prepare(
        "SELECT * FROM case_files WHERE competitor_id = ? ORDER BY created_at DESC"
      )
      .all(competitorId) as CaseFile[];
    return NextResponse.json(caseFiles);
  }

  const caseFiles = db
    .prepare("SELECT * FROM case_files ORDER BY created_at DESC")
    .all() as CaseFile[];
  return NextResponse.json(caseFiles);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();

  const competitor = db
    .prepare("SELECT * FROM competitors WHERE id = ?")
    .get(body.competitor_id) as Competitor | undefined;

  if (!competitor) {
    return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
  }

  const myCompany = db
    .prepare("SELECT * FROM company_profile WHERE id = 'main'")
    .get() as CompanyProfile;

  const caseFileId = uuidv4();

  // Create the case file record as in_progress
  db.prepare(
    `INSERT INTO case_files (id, competitor_id, title, status, research_type)
     VALUES (?, ?, ?, 'in_progress', ?)`
  ).run(
    caseFileId,
    competitor.id,
    `Case File: ${competitor.name}`,
    body.research_type || "full"
  );

  // Mark competitor as researching
  db.prepare("UPDATE competitors SET status = 'researching' WHERE id = ?").run(
    competitor.id
  );

  // Fetch company deep research if available (for enriched competitor analysis)
  const companyResearchRow = db
    .prepare(
      "SELECT * FROM company_research WHERE status = 'completed' AND findings IS NOT NULL ORDER BY completed_at DESC LIMIT 1"
    )
    .get() as CompanyResearch | undefined;

  let companyResearch: CompanyResearchFindings | null = null;
  if (companyResearchRow?.findings) {
    try {
      companyResearch = JSON.parse(companyResearchRow.findings);
    } catch {
      // proceed without company research
    }
  }

  // Check for previous completed case file (for update scans)
  const previousCaseFile = db
    .prepare(
      "SELECT * FROM case_files WHERE competitor_id = ? AND status = 'completed' AND findings IS NOT NULL ORDER BY completed_at DESC LIMIT 1"
    )
    .get(competitor.id) as CaseFile | undefined;

  const isUpdateScan = previousCaseFile && (body.research_type === "update" || competitor.research_schedule !== "manual");

  // Run the research
  try {
    let findings: CaseFileFindings;

    if (isUpdateScan && previousCaseFile?.findings) {
      // Scheduled / update scan: lightweight web search for changes
      const previousFindings = JSON.parse(previousCaseFile.findings) as CaseFileFindings;
      findings = await runResearchUpdate(
        {
          myCompany,
          competitorName: competitor.name,
          competitorWebsite: competitor.website || undefined,
          competitorNotes: competitor.notes || undefined,
          companyResearch,
        },
        previousFindings
      );
    } else {
      // Initial deep research: comprehensive analysis with web search
      findings = await runDeepResearch({
        myCompany,
        competitorName: competitor.name,
        competitorWebsite: competitor.website || undefined,
        competitorNotes: competitor.notes || undefined,
        companyResearch,
      });
    }

    const summary =
      findings.overview.summary.substring(0, 200) + "...";

    db.prepare(
      `UPDATE case_files SET
        status = 'completed',
        summary = ?,
        findings = ?,
        completed_at = datetime('now')
      WHERE id = ?`
    ).run(summary, JSON.stringify(findings), caseFileId);

    // ─── Change Detection: generate alerts for detected changes ───
    if (previousCaseFile?.findings) {
      try {
        const prevFindings = JSON.parse(previousCaseFile.findings) as CaseFileFindings;
        const changes = detectChanges(competitor.name, prevFindings, findings);

        const insertAlert = db.prepare(
          `INSERT INTO alerts (id, competitor_id, competitor_name, case_file_id, alert_type, severity, title, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        );

        for (const change of changes) {
          insertAlert.run(
            uuidv4(),
            competitor.id,
            competitor.name,
            caseFileId,
            change.alert_type,
            change.severity,
            change.title,
            change.description
          );
        }
      } catch {
        // Don't fail research if change detection has an issue
      }
    }

    // Calculate next_research based on schedule
    let nextResearch: string | null = null;
    if (competitor.research_schedule === "daily") {
      nextResearch = new Date(Date.now() + 86400000).toISOString();
    } else if (competitor.research_schedule === "weekly") {
      nextResearch = new Date(Date.now() + 604800000).toISOString();
    } else if (competitor.research_schedule === "monthly") {
      nextResearch = new Date(Date.now() + 2592000000).toISOString();
    }

    db.prepare(
      `UPDATE competitors SET
        status = 'completed',
        last_researched = datetime('now'),
        next_research = ?
      WHERE id = ?`
    ).run(nextResearch, competitor.id);

    const caseFile = db
      .prepare("SELECT * FROM case_files WHERE id = ?")
      .get(caseFileId) as CaseFile;
    return NextResponse.json(caseFile);
  } catch (error) {
    db.prepare(
      "UPDATE case_files SET status = 'error' WHERE id = ?"
    ).run(caseFileId);
    db.prepare(
      "UPDATE competitors SET status = 'error' WHERE id = ?"
    ).run(competitor.id);

    return NextResponse.json(
      { error: "Research failed", details: String(error) },
      { status: 500 }
    );
  }
}
