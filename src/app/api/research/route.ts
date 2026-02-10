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

  const db = await getDb();

  if (competitorId) {
    const caseFiles = await db.getAll<CaseFile>(
      "SELECT * FROM case_files WHERE competitor_id = $1 ORDER BY created_at DESC",
      [competitorId]
    );
    return NextResponse.json(ensureScores(caseFiles));
  }

  const caseFiles = await db.getAll<CaseFile>(
    "SELECT * FROM case_files ORDER BY created_at DESC"
  );
  return NextResponse.json(ensureScores(caseFiles));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = await getDb();

  const competitor = await db.getOne<Competitor>(
    "SELECT * FROM competitors WHERE id = $1",
    [body.competitor_id]
  );

  if (!competitor) {
    return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
  }

  const myCompany = await db.getOne<CompanyProfile>(
    "SELECT * FROM company_profile WHERE id = 'main'"
  );

  const caseFileId = uuidv4();

  await db.run(
    `INSERT INTO case_files (id, competitor_id, title, status, research_type)
     VALUES ($1, $2, $3, 'in_progress', $4)`,
    [
      caseFileId,
      competitor.id,
      `Case File: ${competitor.name}`,
      body.research_type || "full",
    ]
  );

  await db.run(
    "UPDATE competitors SET status = 'researching' WHERE id = $1",
    [competitor.id]
  );

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

  const previousCaseFile = await db.getOne<CaseFile>(
    "SELECT * FROM case_files WHERE competitor_id = $1 AND status = 'completed' AND findings IS NOT NULL ORDER BY completed_at DESC LIMIT 1",
    [competitor.id]
  );

  const isUpdateScan = previousCaseFile && (body.research_type === "update" || competitor.research_schedule !== "manual");

  try {
    let findings: CaseFileFindings;

    if (isUpdateScan && previousCaseFile?.findings) {
      const previousFindings = JSON.parse(previousCaseFile.findings) as CaseFileFindings;
      findings = await runResearchUpdate(
        {
          myCompany: myCompany!,
          competitorName: competitor.name,
          competitorWebsite: competitor.website || undefined,
          competitorNotes: competitor.notes || undefined,
          companyResearch,
        },
        previousFindings
      );
    } else {
      findings = await runDeepResearch({
        myCompany: myCompany!,
        competitorName: competitor.name,
        competitorWebsite: competitor.website || undefined,
        competitorNotes: competitor.notes || undefined,
        companyResearch,
      });
    }

    const summary =
      findings.overview.summary.substring(0, 200) + "...";

    await db.run(
      `UPDATE case_files SET
        status = 'completed',
        summary = $1,
        findings = $2,
        completed_at = NOW()
      WHERE id = $3`,
      [summary, JSON.stringify(findings), caseFileId]
    );

    if (findings.floor_plans && findings.floor_plans.length > 0) {
      await db.run(
        "DELETE FROM floor_plans WHERE competitor_id = $1 AND source = 'competitor'",
        [competitor.id]
      );

      for (const fp of findings.floor_plans) {
        const pricePerSqft = fp.base_price && fp.sq_ft ? Math.round(fp.base_price / fp.sq_ft) : null;
        await db.run(
          `INSERT INTO floor_plans (id, source, competitor_id, competitor_name, model_name, bedrooms, bathrooms, sq_ft, stories, garage_spaces, base_price, price_per_sqft, key_features, url)
           VALUES ($1, 'competitor', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
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
            fp.url ?? null,
          ]
        );
      }
    }

    if (previousCaseFile?.findings) {
      try {
        const prevFindings = JSON.parse(previousCaseFile.findings) as CaseFileFindings;
        const changes = detectChanges(competitor.name, prevFindings, findings);

        const ghlEnabled = await isGHLEnabled();

        for (const change of changes) {
          const alertId = uuidv4();
          await db.run(
            `INSERT INTO alerts (id, competitor_id, competitor_name, case_file_id, alert_type, severity, title, description)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              alertId,
              competitor.id,
              competitor.name,
              caseFileId,
              change.alert_type,
              change.severity,
              change.title,
              change.description,
            ]
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
      } catch {
      }
    }

    if (await isGHLEnabled()) {
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

    await db.run(
      `UPDATE competitors SET
        status = 'completed',
        last_researched = NOW(),
        next_research = $1
      WHERE id = $2`,
      [nextResearch, competitor.id]
    );

    const caseFile = await db.getOne<CaseFile>(
      "SELECT * FROM case_files WHERE id = $1",
      [caseFileId]
    );
    return NextResponse.json(caseFile);
  } catch (error) {
    await db.run(
      "UPDATE case_files SET status = 'error' WHERE id = $1",
      [caseFileId]
    );
    await db.run(
      "UPDATE competitors SET status = 'error' WHERE id = $1",
      [competitor.id]
    );

    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Competitor research POST error:", errorMsg);
    return NextResponse.json(
      { error: "Research failed. The AI search completed but had trouble formatting the results. Please try again.", details: errorMsg },
      { status: 500 }
    );
  }
}
