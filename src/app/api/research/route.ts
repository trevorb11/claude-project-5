import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { CompanyProfile, Competitor, CaseFile, CompanyResearch, CompanyResearchFindings, CaseFileFindings, CompetitiveAlert } from "@/lib/types";
import { runDeepResearch, runResearchUpdate } from "@/lib/research-agent";
import { detectChanges } from "@/lib/change-detection";
import { syncCompetitorToGHL, pushAlertToGHL, isGHLEnabled } from "@/lib/ghl";

const DEFAULT_SCORES = {
  product_strength: 5,
  market_position: 5,
  digital_presence: 5,
  customer_satisfaction: 5,
  pricing_competitiveness: 5,
  innovation_velocity: 5,
  overall_threat_level: 5,
};

function ensureScores(caseFiles: CaseFile[]): CaseFile[] {
  return caseFiles.map((cf) => {
    if (cf.findings && cf.status === "completed") {
      try {
        const findings = JSON.parse(cf.findings) as CaseFileFindings;
        if (!findings.competitive_scores) {
          findings.competitive_scores = { ...DEFAULT_SCORES };
          return { ...cf, findings: JSON.stringify(findings) };
        }
      } catch {}
    }
    return cf;
  });
}

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
    return NextResponse.json(ensureScores(caseFiles));
  }

  const caseFiles = db
    .prepare("SELECT * FROM case_files ORDER BY created_at DESC")
    .all() as CaseFile[];
  return NextResponse.json(ensureScores(caseFiles));
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

    // ─── Floor Plan Extraction: save any floor plans found in research ───
    if (findings.floor_plans && findings.floor_plans.length > 0) {
      // Remove old competitor floor plans from research (keep manually added ones)
      db.prepare(
        "DELETE FROM floor_plans WHERE competitor_id = ? AND source = 'competitor'"
      ).run(competitor.id);

      const insertFloorPlan = db.prepare(
        `INSERT INTO floor_plans (id, source, competitor_id, competitor_name, model_name, bedrooms, bathrooms, sq_ft, stories, garage_spaces, base_price, price_per_sqft, key_features, url)
         VALUES (?, 'competitor', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      for (const fp of findings.floor_plans) {
        const pricePerSqft = fp.base_price && fp.sq_ft ? Math.round(fp.base_price / fp.sq_ft) : null;
        insertFloorPlan.run(
          uuidv4(),
          competitor.id,
          competitor.name,
          fp.model_name,
          fp.bedrooms ?? null,
          fp.bathrooms ?? null,
          fp.sq_ft ?? null,
          fp.stories ?? null,
          fp.garage_spaces ?? null,
          fp.base_price ?? null,
          pricePerSqft,
          fp.key_features ? JSON.stringify(fp.key_features) : null,
          fp.url ?? null
        );
      }
    }

    // ─── Change Detection: generate alerts for detected changes ───
    if (previousCaseFile?.findings) {
      try {
        const prevFindings = JSON.parse(previousCaseFile.findings) as CaseFileFindings;
        const changes = detectChanges(competitor.name, prevFindings, findings);

        const insertAlert = db.prepare(
          `INSERT INTO alerts (id, competitor_id, competitor_name, case_file_id, alert_type, severity, title, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        );

        const ghlEnabled = isGHLEnabled();

        for (const change of changes) {
          const alertId = uuidv4();
          insertAlert.run(
            alertId,
            competitor.id,
            competitor.name,
            caseFileId,
            change.alert_type,
            change.severity,
            change.title,
            change.description
          );

          // Push alert to GHL contact
          if (ghlEnabled) {
            pushAlertToGHL({
              id: alertId,
              competitor_id: competitor.id,
              competitor_name: competitor.name,
              case_file_id: caseFileId,
              alert_type: change.alert_type as CompetitiveAlert["alert_type"],
              severity: change.severity,
              title: change.title,
              description: change.description,
              read: 0,
              created_at: new Date().toISOString(),
            }).catch(() => {}); // Fire and forget
          }
        }
      } catch {
        // Don't fail research if change detection has an issue
      }
    }

    // ─── GHL Sync: push updated competitor data to GoHighLevel ───
    if (isGHLEnabled()) {
      syncCompetitorToGHL(competitor, findings).catch(() => {}); // Fire and forget
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
