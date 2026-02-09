import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { CompanyProfile, Competitor, CaseFile, CompanyResearch, CompanyResearchFindings, CaseFileFindings, CompetitiveAlert } from "@/lib/types";
import { runResearchUpdate, runDeepResearch } from "@/lib/research-agent";
import { detectChanges } from "@/lib/change-detection";
import { syncCompetitorToGHL, pushAlertToGHL, isGHLEnabled } from "@/lib/ghl";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret") || request.headers.get("x-cron-secret");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  if (!secret || secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  const dueCompetitors = db
    .prepare(
      `SELECT * FROM competitors
       WHERE research_schedule != 'manual'
         AND is_own_company = 0
         AND next_research IS NOT NULL
         AND next_research <= datetime('now')
         AND status != 'researching'
       ORDER BY next_research ASC
       LIMIT 3`
    )
    .all() as Competitor[];

  if (dueCompetitors.length === 0) {
    return NextResponse.json({
      message: "No competitors due for scan",
      scanned: 0,
      next_check: new Date(Date.now() + 60000).toISOString(),
    });
  }

  const myCompany = db
    .prepare("SELECT * FROM company_profile WHERE id = 'main'")
    .get() as CompanyProfile;

  const companyResearchRow = db
    .prepare(
      "SELECT * FROM company_research WHERE status = 'completed' AND findings IS NOT NULL ORDER BY completed_at DESC LIMIT 1"
    )
    .get() as CompanyResearch | undefined;

  let companyResearch: CompanyResearchFindings | null = null;
  if (companyResearchRow?.findings) {
    try {
      companyResearch = JSON.parse(companyResearchRow.findings);
    } catch {}
  }

  const results: Array<{ competitor: string; status: string; error?: string }> = [];

  for (const competitor of dueCompetitors) {
    try {
      db.prepare("UPDATE competitors SET status = 'researching' WHERE id = ?").run(competitor.id);

      const previousCaseFile = db
        .prepare(
          "SELECT * FROM case_files WHERE competitor_id = ? AND status = 'completed' AND findings IS NOT NULL ORDER BY completed_at DESC LIMIT 1"
        )
        .get(competitor.id) as CaseFile | undefined;

      const caseFileId = uuidv4();
      db.prepare(
        `INSERT INTO case_files (id, competitor_id, title, status, research_type)
         VALUES (?, ?, ?, 'in_progress', 'update')`
      ).run(caseFileId, competitor.id, `Scheduled Scan: ${competitor.name}`);

      let findings: CaseFileFindings;

      if (previousCaseFile?.findings) {
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
        findings = await runDeepResearch({
          myCompany,
          competitorName: competitor.name,
          competitorWebsite: competitor.website || undefined,
          competitorNotes: competitor.notes || undefined,
          companyResearch,
        });
      }

      const summary = findings.overview.summary.substring(0, 200) + "...";

      db.prepare(
        `UPDATE case_files SET
          status = 'completed',
          summary = ?,
          findings = ?,
          completed_at = datetime('now')
        WHERE id = ?`
      ).run(summary, JSON.stringify(findings), caseFileId);

      if (findings.floor_plans && findings.floor_plans.length > 0) {
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
              }).catch(() => {});
            }
          }
        } catch {}
      }

      if (isGHLEnabled()) {
        syncCompetitorToGHL(competitor, findings).catch(() => {});
      }

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

      results.push({ competitor: competitor.name, status: "completed" });
    } catch (error) {
      db.prepare("UPDATE competitors SET status = 'error' WHERE id = ?").run(competitor.id);

      results.push({
        competitor: competitor.name,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({
    message: `Scanned ${results.length} competitor(s)`,
    scanned: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}
