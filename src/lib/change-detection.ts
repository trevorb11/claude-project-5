import { CaseFileFindings } from "./types";

export interface DetectedChange {
  alert_type:
    | "score_change"
    | "new_product"
    | "pricing_change"
    | "funding"
    | "leadership"
    | "partnership"
    | "market_move"
    | "news"
    | "hiring"
    | "threat_increase"
    | "opportunity";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
}

const SCORE_LABELS: Record<string, string> = {
  product_strength: "Product Strength",
  market_position: "Market Position",
  digital_presence: "Digital Presence",
  customer_satisfaction: "Customer Satisfaction",
  pricing_competitiveness: "Pricing Competitiveness",
  innovation_velocity: "Innovation Velocity",
  overall_threat_level: "Overall Threat Level",
};

/**
 * Compare old and new findings for a competitor and return detected changes.
 * Uses deterministic diffing for structural changes (scores, products, news)
 * to generate alerts.
 */
export function detectChanges(
  competitorName: string,
  oldFindings: CaseFileFindings,
  newFindings: CaseFileFindings
): DetectedChange[] {
  const changes: DetectedChange[] = [];

  // ─── Score Changes ───
  if (oldFindings.competitive_scores && newFindings.competitive_scores) {
    for (const [key, label] of Object.entries(SCORE_LABELS)) {
      const oldScore =
        oldFindings.competitive_scores[
          key as keyof typeof oldFindings.competitive_scores
        ] ?? 0;
      const newScore =
        newFindings.competitive_scores[
          key as keyof typeof newFindings.competitive_scores
        ] ?? 0;
      const delta = newScore - oldScore;

      if (Math.abs(delta) >= 2) {
        const direction = delta > 0 ? "increased" : "decreased";
        const isThreateningIncrease =
          delta > 0 && key !== "pricing_competitiveness";

        if (key === "overall_threat_level" && delta >= 2) {
          changes.push({
            alert_type: "threat_increase",
            severity: newScore >= 8 ? "high" : "medium",
            title: `Threat level ${direction} for ${competitorName}`,
            description: `Overall threat level moved from ${oldScore}/10 to ${newScore}/10 (+${delta}). This competitor is becoming ${newScore >= 8 ? "a critical threat" : "more dangerous"}.`,
          });
        } else {
          changes.push({
            alert_type: "score_change",
            severity: Math.abs(delta) >= 3 ? "high" : "medium",
            title: `${label} ${direction} for ${competitorName}`,
            description: `${label} score moved from ${oldScore}/10 to ${newScore}/10 (${delta > 0 ? "+" : ""}${delta}). ${isThreateningIncrease ? "They are strengthening in this area." : "They appear to be weakening here."}`,
          });
        }
      }
    }
  }

  // ─── New Products ───
  const oldProductNames = new Set(
    oldFindings.products_and_services.items.map((p) =>
      p.name.toLowerCase().trim()
    )
  );
  const newProducts = newFindings.products_and_services.items.filter(
    (p) => !oldProductNames.has(p.name.toLowerCase().trim())
  );
  for (const product of newProducts) {
    changes.push({
      alert_type: "new_product",
      severity: "high",
      title: `${competitorName} launched new product: ${product.name}`,
      description: `${product.description}${product.pricing ? ` Pricing: ${product.pricing}` : ""}`,
    });
  }

  // ─── Pricing Changes ───
  for (const newProduct of newFindings.products_and_services.items) {
    const oldProduct = oldFindings.products_and_services.items.find(
      (p) => p.name.toLowerCase().trim() === newProduct.name.toLowerCase().trim()
    );
    if (
      oldProduct &&
      newProduct.pricing &&
      oldProduct.pricing &&
      newProduct.pricing !== oldProduct.pricing
    ) {
      changes.push({
        alert_type: "pricing_change",
        severity: "medium",
        title: `${competitorName} changed pricing for ${newProduct.name}`,
        description: `Pricing changed from "${oldProduct.pricing}" to "${newProduct.pricing}".`,
      });
    }
  }

  // ─── Funding Changes ───
  if (
    newFindings.overview.funding !== oldFindings.overview.funding &&
    newFindings.overview.funding &&
    !newFindings.overview.funding.toLowerCase().includes("requires live") &&
    !newFindings.overview.funding.toLowerCase().includes("information not")
  ) {
    changes.push({
      alert_type: "funding",
      severity: "high",
      title: `${competitorName} funding update`,
      description: `Funding information changed: ${newFindings.overview.funding}`,
    });
  }

  // ─── Employee Count Changes ───
  if (
    newFindings.overview.employees !== oldFindings.overview.employees &&
    newFindings.overview.employees &&
    !newFindings.overview.employees.toLowerCase().includes("requires live")
  ) {
    changes.push({
      alert_type: "market_move",
      severity: "low",
      title: `${competitorName} team size changed`,
      description: `Employee count updated from "${oldFindings.overview.employees}" to "${newFindings.overview.employees}".`,
    });
  }

  // ─── New News Items ───
  const oldNewsTitles = new Set(
    oldFindings.recent_activity.news.map((n) => n.title.toLowerCase().trim())
  );
  const newNews = newFindings.recent_activity.news.filter(
    (n) => !oldNewsTitles.has(n.title.toLowerCase().trim())
  );
  for (const news of newNews.slice(0, 3)) {
    // Limit to top 3 to avoid spam
    changes.push({
      alert_type: "news",
      severity: "medium",
      title: `${competitorName}: ${news.title}`,
      description: `${news.summary}${news.date ? ` (${news.date})` : ""}`,
    });
  }

  // ─── Partnership Changes ───
  if (
    newFindings.recent_activity.partnerships !==
      oldFindings.recent_activity.partnerships &&
    newFindings.recent_activity.partnerships &&
    newFindings.recent_activity.partnerships.length >
      oldFindings.recent_activity.partnerships.length + 20
  ) {
    changes.push({
      alert_type: "partnership",
      severity: "medium",
      title: `${competitorName} partnership update`,
      description: newFindings.recent_activity.partnerships,
    });
  }

  // ─── Hiring Signal Changes ───
  if (
    newFindings.recent_activity.hiring_signals !==
      oldFindings.recent_activity.hiring_signals &&
    newFindings.recent_activity.hiring_signals &&
    newFindings.recent_activity.hiring_signals.length >
      oldFindings.recent_activity.hiring_signals.length + 20
  ) {
    changes.push({
      alert_type: "hiring",
      severity: "low",
      title: `${competitorName} hiring signals changed`,
      description: newFindings.recent_activity.hiring_signals,
    });
  }

  // ─── New Threats ───
  const oldThreats = new Set(
    oldFindings.competitive_analysis.direct_threats.map((t) =>
      t.toLowerCase().trim()
    )
  );
  const newThreats = newFindings.competitive_analysis.direct_threats.filter(
    (t) => !oldThreats.has(t.toLowerCase().trim())
  );
  for (const threat of newThreats.slice(0, 2)) {
    changes.push({
      alert_type: "threat_increase",
      severity: "high",
      title: `New threat from ${competitorName}`,
      description: threat,
    });
  }

  // ─── New Opportunities ───
  const oldOpps = new Set(
    oldFindings.competitive_analysis.opportunities_for_you.map((o) =>
      o.toLowerCase().trim()
    )
  );
  const newOpps =
    newFindings.competitive_analysis.opportunities_for_you.filter(
      (o) => !oldOpps.has(o.toLowerCase().trim())
    );
  for (const opp of newOpps.slice(0, 2)) {
    changes.push({
      alert_type: "opportunity",
      severity: "medium",
      title: `New opportunity vs ${competitorName}`,
      description: opp,
    });
  }

  return changes;
}
