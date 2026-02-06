import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { CompanyProfile, Competitor, CaseFile } from "@/lib/types";
import { runDeepResearch } from "@/lib/research-agent";

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

  // Run the research (async, but we await it)
  try {
    const findings = await runDeepResearch({
      myCompany,
      competitorName: competitor.name,
      competitorWebsite: competitor.website || undefined,
      competitorNotes: competitor.notes || undefined,
    });

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
