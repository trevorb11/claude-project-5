"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Swords,
  Shield,
  Target,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  MessageSquare,
  Zap,
  BarChart3,
} from "lucide-react";
import {
  Competitor,
  CaseFile,
  CaseFileFindings,
  CompanyProfile,
} from "@/lib/types";

export default function BattleCardPage() {
  const params = useParams();
  const router = useRouter();
  const competitorId = params.id as string;

  const [competitor, setCompetitor] = useState<Competitor | null>(null);
  const [findings, setFindings] = useState<CaseFileFindings | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/competitors").then((r) => r.json()),
      fetch(`/api/research?competitor_id=${competitorId}`).then((r) =>
        r.json()
      ),
      fetch("/api/company").then((r) => r.json()),
    ]).then(([comps, files, comp]) => {
      const target = comps.find((c: Competitor) => c.id === competitorId);
      if (!target) {
        router.push("/competitor");
        return;
      }
      setCompetitor(target);
      setCompany(comp);

      const latestFile = files.find(
        (f: CaseFile) => f.status === "completed" && f.findings
      );
      if (latestFile) {
        try {
          setFindings(JSON.parse(latestFile.findings!));
        } catch {}
      }

      setLoading(false);
    });
  }, [competitorId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-text-muted">Loading battle card...</span>
      </div>
    );
  }

  if (!competitor || !findings) {
    return (
      <div className="text-center py-16 p-6">
        <Swords className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-2">No Research Data</h2>
        <p className="text-text-secondary text-sm mb-4">
          Run research on this competitor first to generate a battle card.
        </p>
        <Link
          href={`/competitor/${competitorId}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent-amber hover:bg-accent-amber/90 rounded-lg text-white text-sm font-medium transition-colors shadow-sm"
        >
          Go to Case File
        </Link>
      </div>
    );
  }

  const scores = findings.competitive_scores;
  const avgScore = scores
    ? Math.round(
        (scores.product_strength +
          scores.market_position +
          scores.digital_presence +
          scores.customer_satisfaction +
          scores.pricing_competitiveness +
          scores.innovation_velocity) /
          6
      )
    : null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header - hidden in print */}
      <div className="flex items-center justify-between mb-6 animate-fade-in print:hidden">
        <div>
          <Link
            href={`/competitor/${competitorId}`}
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Case File
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Swords className="w-6 h-6 text-accent-red" />
            Battle Card
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Quick-reference competitive cheat sheet for {competitor.name}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue hover:bg-accent-blue/80 rounded-lg text-white text-sm font-medium transition-colors"
        >
          <Printer className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* Battle Card Content */}
      <div className="space-y-4 battle-card-content">
        {/* Top Banner */}
        <div className="bg-accent-blue rounded-xl p-5 text-white animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider opacity-80">
                Battle Card
              </p>
              <h2 className="text-xl font-bold mt-1">
                {company?.name || "Your Company"} vs {competitor.name}
              </h2>
              {competitor.website && (
                <p className="text-xs opacity-70 mt-1">{competitor.website}</p>
              )}
            </div>
            {scores && (
              <div className="text-center">
                <div
                  className={`text-3xl font-bold ${
                    scores.overall_threat_level >= 8
                      ? "text-red-300"
                      : scores.overall_threat_level >= 6
                      ? "text-orange-300"
                      : "text-green-300"
                  }`}
                >
                  {scores.overall_threat_level}/10
                </div>
                <p className="text-[10px] uppercase tracking-wide opacity-70">
                  Threat Level
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-2 gap-4">
          {/* Elevator Pitch */}
          <div className="bg-bg-card border border-border rounded-xl p-4 animate-fade-in" style={{ animationDelay: "0.05s" }}>
            <h3 className="text-xs uppercase tracking-wide text-text-muted flex items-center gap-1.5 mb-2">
              <Target className="w-3.5 h-3.5" />
              Their Elevator Pitch
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {findings.overview.summary}
            </p>
            <div className="flex gap-2 mt-3 flex-wrap">
              <MiniPill label="Founded" value={findings.overview.founded} />
              <MiniPill label="Size" value={findings.overview.employees} />
              <MiniPill
                label="Revenue"
                value={findings.overview.revenue_estimate}
              />
            </div>
          </div>

          {/* Threat Scores */}
          {scores && (
            <div className="bg-bg-card border border-border rounded-xl p-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <h3 className="text-xs uppercase tracking-wide text-text-muted flex items-center gap-1.5 mb-2">
                <BarChart3 className="w-3.5 h-3.5" />
                Competitive Scores
              </h3>
              <div className="space-y-1.5">
                {[
                  { label: "Product", score: scores.product_strength },
                  { label: "Market", score: scores.market_position },
                  { label: "Digital", score: scores.digital_presence },
                  { label: "Customers", score: scores.customer_satisfaction },
                  { label: "Pricing", score: scores.pricing_competitiveness },
                  { label: "Innovation", score: scores.innovation_velocity },
                ].map((dim) => (
                  <div key={dim.label} className="flex items-center gap-2">
                    <span className="text-[11px] text-text-muted w-16 shrink-0">
                      {dim.label}
                    </span>
                    <div className="flex-1 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          dim.score >= 8
                            ? "bg-accent-red"
                            : dim.score >= 6
                            ? "bg-accent-amber"
                            : "bg-accent-emerald"
                        }`}
                        style={{ width: `${dim.score * 10}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-text-secondary w-6 text-right">
                      {dim.score}
                    </span>
                  </div>
                ))}
              </div>
              {avgScore !== null && (
                <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] text-text-muted">
                    Average Score
                  </span>
                  <span className="text-sm font-bold text-accent-blue">
                    {avgScore}/10
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Where We Win / Where They Win */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-accent-emerald/5 border border-accent-emerald/20 rounded-xl p-4 animate-fade-in" style={{ animationDelay: "0.15s" }}>
            <h3 className="text-xs uppercase tracking-wide text-accent-emerald flex items-center gap-1.5 mb-3">
              <TrendingUp className="w-3.5 h-3.5" />
              Where We Win
            </h3>
            <div className="space-y-2">
              {findings.competitive_analysis.opportunities_for_you
                .slice(0, 4)
                .map((o, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-text-secondary"
                  >
                    <span className="text-accent-emerald shrink-0 mt-0.5 font-bold">
                      +
                    </span>
                    {o}
                  </div>
                ))}
              {findings.market_position.weaknesses.slice(0, 2).map((w, i) => (
                <div
                  key={`w-${i}`}
                  className="flex items-start gap-2 text-sm text-text-secondary"
                >
                  <span className="text-accent-emerald shrink-0 mt-0.5 font-bold">
                    +
                  </span>
                  Their weakness: {w}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-accent-red/5 border border-accent-red/20 rounded-xl p-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <h3 className="text-xs uppercase tracking-wide text-accent-red flex items-center gap-1.5 mb-3">
              <AlertTriangle className="w-3.5 h-3.5" />
              Where They Win
            </h3>
            <div className="space-y-2">
              {findings.competitive_analysis.direct_threats
                .slice(0, 4)
                .map((t, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-text-secondary"
                  >
                    <span className="text-accent-red shrink-0 mt-0.5 font-bold">
                      -
                    </span>
                    {t}
                  </div>
                ))}
              {findings.market_position.strengths.slice(0, 2).map((s, i) => (
                <div
                  key={`s-${i}`}
                  className="flex items-start gap-2 text-sm text-text-secondary"
                >
                  <span className="text-accent-red shrink-0 mt-0.5 font-bold">
                    -
                  </span>
                  Their strength: {s}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing & Key Products */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-bg-card border border-border rounded-xl p-4 animate-fade-in" style={{ animationDelay: "0.25s" }}>
            <h3 className="text-xs uppercase tracking-wide text-text-muted flex items-center gap-1.5 mb-3">
              <DollarSign className="w-3.5 h-3.5" />
              Pricing Comparison
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-3">
              {findings.competitive_analysis.pricing_comparison}
            </p>
            {findings.products_and_services.items
              .filter((item) => item.pricing)
              .slice(0, 3)
              .map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1.5 border-t border-border"
                >
                  <span className="text-xs text-text-secondary">
                    {item.name}
                  </span>
                  <span className="text-xs font-medium bg-accent-emerald/15 text-accent-emerald px-2 py-0.5 rounded">
                    {item.pricing}
                  </span>
                </div>
              ))}
          </div>

          <div className="bg-bg-card border border-border rounded-xl p-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <h3 className="text-xs uppercase tracking-wide text-text-muted flex items-center gap-1.5 mb-3">
              <MessageSquare className="w-3.5 h-3.5" />
              Objection Handlers
            </h3>
            <div className="space-y-2.5">
              {findings.competitive_analysis.key_differentiators
                .slice(0, 3)
                .map((diff, i) => (
                  <div key={i}>
                    <p className="text-xs font-medium text-accent-red mb-0.5">
                      "They have {diff.toLowerCase().includes("they") ? diff : diff.toLowerCase()}"
                    </p>
                    <p className="text-xs text-text-secondary">
                      {findings.competitive_analysis.opportunities_for_you[i] ||
                        `Focus on your unique value — ${findings.market_position.weaknesses[0] || "areas where they fall short"}.`}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-bg-card border border-border rounded-xl p-4 animate-fade-in" style={{ animationDelay: "0.35s" }}>
          <h3 className="text-xs uppercase tracking-wide text-text-muted flex items-center gap-1.5 mb-3">
            <Zap className="w-3.5 h-3.5" />
            Key Actions
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {findings.strategic_recommendations.action_items
              .slice(0, 4)
              .map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2.5 bg-bg-secondary rounded-lg"
                >
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 mt-0.5 ${
                      item.priority === "high"
                        ? "bg-accent-red/20 text-accent-red"
                        : item.priority === "medium"
                        ? "bg-accent-amber/20 text-accent-amber"
                        : "bg-accent-emerald/20 text-accent-emerald"
                    }`}
                  >
                    {item.priority}
                  </span>
                  <p className="text-xs text-text-secondary">{item.action}</p>
                </div>
              ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-2">
          <p className="text-[10px] text-text-muted">
            Generated by Builder Studio Competitive Intelligence •{" "}
            {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function MiniPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-[10px] bg-bg-secondary text-text-muted px-2 py-1 rounded">
      <span className="font-medium text-text-secondary">{label}:</span> {value}
    </span>
  );
}
