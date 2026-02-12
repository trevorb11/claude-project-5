"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Check,
  Printer,
  TrendingUp,
  AlertTriangle,
  Package,
  Users,
  Swords,
  Building2,
} from "lucide-react";
import { Competitor, CaseFile, CaseFileFindings } from "@/lib/types";

interface CompetitorData {
  competitor: Competitor;
  findings: CaseFileFindings;
  caseFile: CaseFile;
}

const SCORE_DIMENSIONS = [
  { key: "product_strength", label: "Product Strength" },
  { key: "market_position", label: "Market Position" },
  { key: "digital_presence", label: "Digital Presence" },
  { key: "customer_satisfaction", label: "Customer Satisfaction" },
  { key: "pricing_competitiveness", label: "Pricing" },
  { key: "innovation_velocity", label: "Innovation" },
  { key: "overall_threat_level", label: "Threat Level" },
] as const;

export default function ComparePage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [caseFiles, setCaseFiles] = useState<CaseFile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/competitors").then((r) => r.json()),
      fetch("/api/research").then((r) => r.json()),
    ]).then(([comps, files]) => {
      setCompetitors(comps);
      setCaseFiles(files);
      setLoading(false);

      // Auto-select: prefer own company first, then competitors
      const completedIds = new Set(
        files
          .filter((f: CaseFile) => f.status === "completed" && f.findings)
          .map((f: CaseFile) => f.competitor_id)
      );
      const ownComp = comps.find((c: Competitor) => c.is_own_company === 1 && completedIds.has(c.id));
      const others = comps.filter((c: Competitor) => !c.is_own_company && completedIds.has(c.id));
      const autoSelect = [
        ...(ownComp ? [ownComp.id] : []),
        ...others.slice(0, ownComp ? 1 : 2).map((c: Competitor) => c.id),
      ];
      setSelected(autoSelect);
    });
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const getCompetitorData = (): CompetitorData[] => {
    return selected
      .map((id) => {
        const competitor = competitors.find((c) => c.id === id);
        const latestFile = caseFiles.find(
          (f) => f.competitor_id === id && f.status === "completed" && f.findings
        );
        if (!competitor || !latestFile) return null;
        try {
          const findings = JSON.parse(latestFile.findings!) as CaseFileFindings;
          return { competitor, findings, caseFile: latestFile };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as CompetitorData[];
  };

  const competitorData = getCompetitorData();
  const hasCompletedFiles = (id: string) =>
    caseFiles.some(
      (f) => f.competitor_id === id && f.status === "completed" && f.findings
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-text-muted">Loading comparison data...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in print:hidden">
        <div>
          <Link
            href="/competitor"
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Case Files
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-accent-blue" />
            Side-by-Side Comparison
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Compare up to 4 competitors across all dimensions
          </p>
        </div>
        {competitorData.length >= 2 && (
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue hover:bg-accent-blue/80 rounded-lg text-white text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            Export PDF
          </button>
        )}
      </div>

      {/* Selector */}
      <div className="bg-bg-card border border-border rounded-xl p-4 mb-6 animate-fade-in print:hidden">
        <p className="text-xs uppercase tracking-wide text-text-muted mb-3">
          Select companies to compare ({selected.length}/4)
        </p>
        <div className="flex flex-wrap gap-2">
          {competitors.map((comp) => {
            const isSelected = selected.includes(comp.id);
            const hasData = hasCompletedFiles(comp.id);
            const isOwn = comp.is_own_company === 1;
            return (
              <button
                key={comp.id}
                onClick={() => hasData && toggleSelect(comp.id)}
                disabled={!hasData}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all ${
                  isSelected
                    ? isOwn
                      ? "bg-accent-blue/15 border-accent-blue/50 text-accent-blue font-medium"
                      : "bg-accent-blue/10 border-accent-blue/40 text-accent-blue font-medium"
                    : hasData
                    ? "bg-bg-secondary border-border text-text-secondary hover:border-border-highlight"
                    : "bg-bg-secondary border-border text-text-muted opacity-50 cursor-not-allowed"
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5" />}
                {isOwn && <Building2 className="w-3.5 h-3.5" />}
                {comp.name}
                {isOwn && (
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-accent-blue/20 text-accent-blue tracking-wider">
                    You
                  </span>
                )}
                {!hasData && (
                  <span className="text-[10px] text-text-muted">(no data)</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Comparison Content */}
      {competitorData.length < 2 ? (
        <div className="text-center py-16 animate-fade-in">
          <BarChart3 className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">
            Select at Least 2 Competitors
          </h2>
          <p className="text-text-secondary text-sm">
            Choose competitors with completed research to see a side-by-side comparison.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Print Header */}
          <div className="hidden print:block mb-4">
            <h1 className="text-xl font-bold">Competitor Comparison</h1>
            <p className="text-sm text-text-secondary">
              {competitorData.map((d) => d.competitor.name).join(" vs ")}
            </p>
          </div>

          {/* Scorecard Comparison */}
          <div className="bg-bg-card border border-border rounded-xl p-5 animate-fade-in">
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-accent-blue" />
              Competitive Scorecard
            </h2>

            {/* Column headers */}
            <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `180px repeat(${competitorData.length}, 1fr)` }}>
              <div />
              {competitorData.map((d) => {
                const isOwn = d.competitor.is_own_company === 1;
                return (
                  <div key={d.competitor.id} className="text-center">
                    <Link
                      href={`/competitor/${d.competitor.id}`}
                      className="text-sm font-semibold hover:text-accent-blue transition-colors"
                    >
                      {d.competitor.name}
                    </Link>
                    {isOwn && (
                      <span className="ml-1.5 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-accent-blue/20 text-accent-blue tracking-wider">
                        You
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Score rows */}
            {SCORE_DIMENSIONS.map((dim) => (
              <div
                key={dim.key}
                className="grid gap-4 py-2.5 border-t border-border"
                style={{ gridTemplateColumns: `180px repeat(${competitorData.length}, 1fr)` }}
              >
                <span className="text-xs text-text-secondary self-center">
                  {dim.label}
                </span>
                {competitorData.map((d) => {
                  const score = d.findings.competitive_scores?.[dim.key] ?? 0;
                  const maxScore = Math.max(
                    ...competitorData.map(
                      (cd) => cd.findings.competitive_scores?.[dim.key] ?? 0
                    )
                  );
                  const isMax = score === maxScore && competitorData.length > 1;
                  return (
                    <div key={d.competitor.id} className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            score >= 8
                              ? "bg-accent-red"
                              : score >= 6
                              ? "bg-accent-amber"
                              : "bg-accent-emerald"
                          }`}
                          style={{ width: `${score * 10}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-bold w-8 text-right ${
                          isMax ? "text-accent-red" : "text-text-secondary"
                        }`}
                      >
                        {score}/10
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Strengths & Weaknesses */}
          <div className="bg-bg-card border border-border rounded-xl p-5 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
              <Swords className="w-4 h-4 text-accent-red" />
              Strengths & Weaknesses
            </h2>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${competitorData.length}, 1fr)` }}>
              {competitorData.map((d) => {
                const isOwn = d.competitor.is_own_company === 1;
                return (
                <div key={d.competitor.id} className="space-y-3">
                  <h3 className="text-sm font-semibold text-center border-b border-border pb-2">
                    {d.competitor.name}
                    {isOwn && <span className="ml-1.5 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-accent-blue/20 text-accent-blue tracking-wider">You</span>}
                  </h3>
                  <div>
                    <p className="text-xs font-medium text-accent-emerald mb-1.5">Strengths</p>
                    {(d.findings.market_position?.strengths || []).slice(0, 3).map((s, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-text-secondary mb-1">
                        <TrendingUp className="w-3 h-3 text-accent-emerald shrink-0 mt-0.5" />
                        {s}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-accent-red mb-1.5">Weaknesses</p>
                    {(d.findings.market_position?.weaknesses || []).slice(0, 3).map((w, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-text-secondary mb-1">
                        <AlertTriangle className="w-3 h-3 text-accent-red shrink-0 mt-0.5" />
                        {w}
                      </div>
                    ))}
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          {/* Products & Pricing */}
          <div className="bg-bg-card border border-border rounded-xl p-5 animate-fade-in" style={{ animationDelay: "0.15s" }}>
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
              <Package className="w-4 h-4 text-accent-cyan" />
              Products & Pricing
            </h2>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${competitorData.length}, 1fr)` }}>
              {competitorData.map((d) => (
                <div key={d.competitor.id} className="space-y-2">
                  <h3 className="text-sm font-semibold text-center border-b border-border pb-2">
                    {d.competitor.name}
                  </h3>
                  {(d.findings.products_and_services?.items || []).slice(0, 4).map((item, i) => (
                    <div key={i} className="p-2 bg-bg-secondary rounded-lg">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-medium text-text-primary">{item.name}</p>
                        {item.pricing && (
                          <span className="text-[10px] bg-accent-emerald/20 text-accent-emerald px-1.5 py-0.5 rounded shrink-0">
                            {item.pricing}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Customer & Market */}
          <div className="bg-bg-card border border-border rounded-xl p-5 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-accent-amber" />
              Customer Intelligence
            </h2>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${competitorData.length}, 1fr)` }}>
              {competitorData.map((d) => (
                <div key={d.competitor.id} className="space-y-2">
                  <h3 className="text-sm font-semibold text-center border-b border-border pb-2">
                    {d.competitor.name}
                  </h3>
                  <div>
                    <p className="text-xs font-medium text-text-muted mb-1">Target Segments</p>
                    <div className="flex flex-wrap gap-1">
                      {(d.findings.customer_intelligence?.target_segments || []).slice(0, 4).map((seg, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-accent-amber/15 text-accent-amber px-1.5 py-0.5 rounded"
                        >
                          {seg}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-muted mb-1">Sentiment</p>
                    <p className="text-xs text-text-secondary line-clamp-3">
                      {d.findings.customer_intelligence?.sentiment || "No data available"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Competitive Threats & Opportunities */}
          <div className="bg-bg-card border border-border rounded-xl p-5 animate-fade-in" style={{ animationDelay: "0.25s" }}>
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
              <Swords className="w-4 h-4 text-accent-purple" />
              Threats & Opportunities
            </h2>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${competitorData.length}, 1fr)` }}>
              {competitorData.map((d) => (
                <div key={d.competitor.id} className="space-y-3">
                  <h3 className="text-sm font-semibold text-center border-b border-border pb-2">
                    {d.competitor.name}
                  </h3>
                  <div>
                    <p className="text-xs font-medium text-accent-red mb-1.5">Threats</p>
                    {(d.findings.competitive_analysis?.direct_threats || []).slice(0, 3).map((t, i) => (
                      <p key={i} className="text-xs text-text-secondary mb-1">• {t}</p>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-accent-emerald mb-1.5">Opportunities</p>
                    {(d.findings.competitive_analysis?.opportunities_for_you || []).slice(0, 3).map((o, i) => (
                      <p key={i} className="text-xs text-text-secondary mb-1">• {o}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
