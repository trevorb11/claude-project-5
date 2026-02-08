"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  Loader2,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Clock,
  Zap,
  Printer,
} from "lucide-react";
import { IntelligenceReport, IntelligenceHighlights } from "@/lib/types";

export default function IntelligencePage() {
  const [reports, setReports] = useState<IntelligenceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<IntelligenceReport | null>(null);
  const [highlights, setHighlights] = useState<IntelligenceHighlights | null>(null);

  const fetchReports = async () => {
    const res = await fetch("/api/intelligence");
    const data = await res.json();
    setReports(data);

    if (data.length > 0 && !selectedReport) {
      selectReport(data[0]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectReport = (report: IntelligenceReport) => {
    setSelectedReport(report);
    if (report.highlights) {
      try {
        setHighlights(JSON.parse(report.highlights));
      } catch {
        setHighlights(null);
      }
    } else {
      setHighlights(null);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/intelligence", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate report");
        return;
      }

      await fetchReports();
      selectReport(data);
    } catch (err) {
      setError("Failed to generate report. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-text-muted">Loading intelligence reports...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-accent-emerald" />
            Intelligence Center
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Centralized competitive intelligence synthesized from all case files
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {selectedReport && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-border text-text-secondary hover:bg-bg-secondary"
            >
              <Printer className="w-4 h-4" />
              Export PDF
            </button>
          )}
          <button
            onClick={generateReport}
            disabled={generating}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              generating
                ? "bg-accent-emerald/20 text-accent-emerald"
                : "bg-accent-emerald hover:bg-accent-emerald/90 text-white"
            }`}
          >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Briefing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Generate New Briefing
            </>
          )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-accent-red/10 border border-accent-red/30 rounded-lg text-sm text-accent-red animate-fade-in">
          {error}
        </div>
      )}

      {/* Report History */}
      {reports.length > 1 && (
        <div className="mb-6 animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <h3 className="text-xs uppercase tracking-wide text-text-muted mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Report History
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {reports.map((r) => (
              <button
                key={r.id}
                onClick={() => selectReport(r)}
                className={`shrink-0 px-3 py-2 rounded-lg text-xs border transition-colors ${
                  selectedReport?.id === r.id
                    ? "bg-accent-emerald/20 border-accent-emerald/40 text-accent-emerald"
                    : "bg-bg-card border-border text-text-secondary hover:bg-bg-card-hover"
                }`}
              >
                {new Date(r.created_at).toLocaleDateString()} —{" "}
                {new Date(r.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Reports */}
      {reports.length === 0 && !generating && (
        <div className="text-center py-16 animate-fade-in">
          <Shield className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">
            No Intelligence Reports Yet
          </h2>
          <p className="text-text-secondary text-sm mb-4 max-w-md mx-auto">
            Generate a briefing to synthesize all your competitive case files into
            actionable intelligence. Make sure you have at least one completed case
            file first.
          </p>
          <button
            onClick={generateReport}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-emerald hover:bg-accent-emerald/90 rounded-lg text-white text-sm font-medium transition-colors"
          >
            <Zap className="w-4 h-4" />
            Generate First Briefing
          </button>
        </div>
      )}

      {/* Generating State */}
      {generating && !selectedReport && (
        <div className="text-center py-16 animate-fade-in scan-effect rounded-xl bg-bg-card border border-border">
          <Loader2 className="w-10 h-10 text-accent-emerald mx-auto mb-4 animate-spin" />
          <h2 className="text-lg font-semibold mb-2">
            Analyzing All Case Files
          </h2>
          <p className="text-text-secondary text-sm">
            The intelligence agent is cross-referencing findings across all your
            competitors to produce a strategic briefing...
          </p>
        </div>
      )}

      {/* Highlights Dashboard */}
      {highlights && selectedReport && (
        <div className="space-y-4">
          {/* Executive Summary */}
          <div
            className="bg-bg-card border border-border rounded-xl p-5 animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-accent-emerald" />
              Executive Summary
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              {highlights.executive_summary}
            </p>
          </div>

          {/* Key Insights */}
          {highlights.key_insights.length > 0 && (
            <div
              className="bg-bg-card border border-border rounded-xl p-5 animate-fade-in"
              style={{ animationDelay: "0.15s" }}
            >
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-accent-amber" />
                Key Insights
              </h2>
              <div className="space-y-2">
                {highlights.key_insights.map((insight, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-bg-secondary rounded-lg"
                  >
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 mt-0.5 ${
                        insight.impact === "high"
                          ? "bg-accent-red/20 text-accent-red"
                          : insight.impact === "medium"
                          ? "bg-accent-amber/20 text-accent-amber"
                          : "bg-accent-emerald/20 text-accent-emerald"
                      }`}
                    >
                      {insight.impact}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-text-muted">
                          {insight.category}
                        </span>
                        {insight.competitor && (
                          <span className="text-xs bg-accent-blue/15 text-accent-blue px-1.5 py-0.5 rounded">
                            {insight.competitor}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary">
                        {insight.insight}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Threats & Opportunities */}
          <div className="grid grid-cols-2 gap-4">
            <div
              className="bg-bg-card border border-border rounded-xl p-5 animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-accent-red" />
                Threats
              </h2>
              <div className="space-y-2">
                {highlights.threats.map((threat, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-text-secondary"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-red shrink-0 mt-2" />
                    {threat}
                  </div>
                ))}
              </div>
            </div>

            <div
              className="bg-bg-card border border-border rounded-xl p-5 animate-fade-in"
              style={{ animationDelay: "0.25s" }}
            >
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-accent-emerald" />
                Opportunities
              </h2>
              <div className="space-y-2">
                {highlights.opportunities.map((opp, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-text-secondary"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald shrink-0 mt-2" />
                    {opp}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommended Actions */}
          {highlights.recommended_actions.length > 0 && (
            <div
              className="bg-bg-card border border-border rounded-xl p-5 animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-accent-blue" />
                Recommended Actions
              </h2>
              <div className="space-y-2">
                {highlights.recommended_actions.map((action, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg"
                  >
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${
                        action.priority === "high"
                          ? "bg-accent-red/20 text-accent-red"
                          : action.priority === "medium"
                          ? "bg-accent-amber/20 text-accent-amber"
                          : "bg-accent-emerald/20 text-accent-emerald"
                      }`}
                    >
                      {action.priority}
                    </span>
                    <span className="text-sm flex-1">{action.action}</span>
                    <span className="text-xs text-text-muted shrink-0">
                      {action.timeline}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Market Trends */}
          {highlights.market_trends.length > 0 && (
            <div
              className="bg-bg-card border border-border rounded-xl p-5 animate-fade-in"
              style={{ animationDelay: "0.35s" }}
            >
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-accent-cyan" />
                Market Trends
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {highlights.market_trends.map((trend, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-2.5 bg-bg-secondary rounded-lg"
                  >
                    <TrendingUp className="w-3 h-3 text-accent-cyan shrink-0 mt-1" />
                    <span className="text-sm text-text-secondary">{trend}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Report */}
          <CollapsibleReport content={selectedReport.content} />
        </div>
      )}
    </div>
  );
}

function CollapsibleReport({ content }: { content: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="bg-bg-card border border-border rounded-xl overflow-hidden animate-fade-in"
      style={{ animationDelay: "0.4s" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-bg-card-hover transition-colors"
      >
        <span className="font-semibold text-sm">Full Report</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-muted" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 prose prose-sm max-w-none">
          <div
            className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap"
          >
            {content}
          </div>
        </div>
      )}
    </div>
  );
}
