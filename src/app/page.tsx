"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Crosshair,
  Shield,
  Building2,
  Clock,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Activity,
  Search,
  Bell,
} from "lucide-react";
import { Competitor, CaseFile, CompanyProfile, IntelligenceReport, IntelligenceHighlights, CompetitiveAlert } from "@/lib/types";

export default function Dashboard() {
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [caseFiles, setCaseFiles] = useState<CaseFile[]>([]);
  const [reports, setReports] = useState<IntelligenceReport[]>([]);
  const [alerts, setAlerts] = useState<CompetitiveAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/company").then((r) => r.json()),
      fetch("/api/competitors").then((r) => r.json()),
      fetch("/api/research").then((r) => r.json()),
      fetch("/api/intelligence").then((r) => r.json()),
      fetch("/api/alerts?limit=5").then((r) => r.json()),
    ]).then(([comp, comps, files, reps, alts]) => {
      setCompany(comp);
      setCompetitors(comps);
      setCaseFiles(files);
      setReports(reps);
      setAlerts(Array.isArray(alts) ? alts : []);
      setLoading(false);
    });
  }, []);

  const needsSetup = !company?.name;
  const activeResearch = competitors.filter((c) => c.status === "researching");
  const completedFiles = caseFiles.filter((f) => f.status === "completed");
  const scheduledCompetitors = competitors.filter(
    (c) => c.research_schedule !== "manual"
  );

  const latestReport = reports[0];
  let highlights: IntelligenceHighlights | null = null;
  if (latestReport?.highlights) {
    try {
      highlights = JSON.parse(latestReport.highlights);
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-text-muted">
          <Activity className="w-5 h-5 animate-pulse" />
          <span>Loading intelligence dashboard...</span>
        </div>
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="max-w-md text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-accent-blue/20 flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-8 h-8 text-accent-blue" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Welcome to Homebuilder Studio</h1>
          <p className="text-text-secondary mb-6">
            Before we can build competitive intelligence, we need to understand
            your company. This helps our research agents know what to look for
            and tailor insights to your business.
          </p>
          <Link
            href="/setup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent-amber hover:bg-accent-amber/90 rounded-lg text-white font-medium transition-colors shadow-sm"
          >
            <Building2 className="w-4 h-4" />
            Set Up Your Company Profile
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold">Intelligence Dashboard</h1>
        <p className="text-text-secondary mt-1">
          Competitive intelligence overview for {company?.name}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <StatCard
          icon={<Crosshair className="w-5 h-5 text-accent-blue" />}
          label="Competitors Tracked"
          value={competitors.length}
        />
        <StatCard
          icon={<Search className="w-5 h-5 text-accent-cyan" />}
          label="Case Files"
          value={completedFiles.length}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-accent-amber" />}
          label="Scheduled Agents"
          value={scheduledCompetitors.length}
        />
        <StatCard
          icon={<Shield className="w-5 h-5 text-accent-emerald" />}
          label="Intel Reports"
          value={reports.length}
        />
      </div>

      {/* Active Research */}
      {activeResearch.length > 0 && (
        <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-xl p-4 animate-fade-in scan-effect">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-accent-blue" />
            <span className="text-sm font-medium text-accent-blue">
              Research In Progress
            </span>
          </div>
          <div className="space-y-2">
            {activeResearch.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm text-text-secondary">
                <div className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
                Researching {c.name}...
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Latest Intelligence */}
        <div className="col-span-2 space-y-4">
          {highlights ? (
            <div className="bg-bg-card border border-border rounded-xl p-5 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-accent-emerald" />
                  Latest Intelligence
                </h2>
                <Link
                  href="/intelligence"
                  className="text-xs text-accent-blue hover:underline flex items-center gap-1"
                >
                  Full Report <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <p className="text-sm text-text-secondary mb-4">
                {highlights.executive_summary}
              </p>

              {highlights.key_insights.length > 0 && (
                <div className="space-y-2 mb-4">
                  <h3 className="text-xs uppercase tracking-wide text-text-muted">Key Insights</h3>
                  {highlights.key_insights.slice(0, 3).map((insight, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-2.5 bg-bg-secondary rounded-lg"
                    >
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 mt-0.5 ${
                          insight.impact === "high"
                            ? "bg-accent-red/20 text-accent-red"
                            : insight.impact === "medium"
                            ? "bg-accent-amber/20 text-accent-amber"
                            : "bg-accent-emerald/20 text-accent-emerald"
                        }`}
                      >
                        {insight.impact}
                      </span>
                      <div>
                        <span className="text-sm">{insight.insight.substring(0, 120)}...</span>
                        {insight.competitor && (
                          <span className="text-xs text-text-muted ml-2">
                            — {insight.competitor}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {highlights.threats.length > 0 && (
                <div className="mb-3">
                  <h3 className="text-xs uppercase tracking-wide text-text-muted mb-2">Threats</h3>
                  {highlights.threats.slice(0, 2).map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-text-secondary mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-accent-red shrink-0 mt-0.5" />
                      {t}
                    </div>
                  ))}
                </div>
              )}

              {highlights.opportunities.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wide text-text-muted mb-2">Opportunities</h3>
                  {highlights.opportunities.slice(0, 2).map((o, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-text-secondary mb-1">
                      <TrendingUp className="w-3.5 h-3.5 text-accent-emerald shrink-0 mt-0.5" />
                      {o}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-bg-card border border-border rounded-xl p-5 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <h2 className="font-semibold flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-accent-emerald" />
                Intelligence Center
              </h2>
              <p className="text-sm text-text-secondary">
                {competitors.length === 0
                  ? "Add competitors and run research to generate intelligence reports."
                  : completedFiles.length === 0
                  ? "Run research on your tracked competitors to build case files, then generate an intelligence report."
                  : "Case files are ready. Go to the Intelligence page to generate your first briefing."}
              </p>
              {completedFiles.length > 0 && (
                <Link
                  href="/intelligence"
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-accent-emerald/20 text-accent-emerald rounded-lg text-sm font-medium hover:bg-accent-emerald/30 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  Generate Intelligence Report
                </Link>
              )}
            </div>
          )}

          {/* Recent Case Files */}
          <div className="bg-bg-card border border-border rounded-xl p-5 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-accent-blue" />
                Recent Case Files
              </h2>
              <Link
                href="/competitor"
                className="text-xs text-accent-blue hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {completedFiles.length === 0 ? (
              <p className="text-sm text-text-muted">
                No case files yet. Add a competitor and launch research.
              </p>
            ) : (
              <div className="space-y-2">
                {completedFiles.slice(0, 4).map((cf) => {
                  const comp = competitors.find((c) => c.id === cf.competitor_id);
                  return (
                    <Link
                      key={cf.id}
                      href={`/competitor/${cf.competitor_id}?file=${cf.id}`}
                      className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg card-hover border border-transparent"
                    >
                      <div>
                        <span className="text-sm font-medium">{comp?.name || "Unknown"}</span>
                        <p className="text-xs text-text-muted mt-0.5">
                          {cf.summary?.substring(0, 80)}...
                        </p>
                      </div>
                      <span className="text-xs text-text-muted">
                        {cf.completed_at
                          ? new Date(cf.completed_at).toLocaleDateString()
                          : ""}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Competitors */}
          <div className="bg-bg-card border border-border rounded-xl p-5 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">Tracked Competitors</h2>
              <Link
                href="/competitor"
                className="text-xs text-accent-blue hover:underline"
              >
                Manage
              </Link>
            </div>
            {competitors.length === 0 ? (
              <div className="text-center py-6">
                <Crosshair className="w-8 h-8 text-text-muted mx-auto mb-2" />
                <p className="text-sm text-text-muted mb-3">No competitors yet</p>
                <Link
                  href="/competitor"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue/20 text-accent-blue rounded-lg text-xs font-medium hover:bg-accent-blue/30 transition-colors"
                >
                  Add Competitor
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {competitors.slice(0, 6).map((c) => (
                  <Link
                    key={c.id}
                    href={`/competitor/${c.id}`}
                    className="flex items-center justify-between p-2.5 bg-bg-secondary rounded-lg card-hover border border-transparent"
                  >
                    <span className="text-sm">{c.name}</span>
                    <StatusBadge status={c.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Alerts */}
          <div className="bg-bg-card border border-border rounded-xl p-5 animate-fade-in" style={{ animationDelay: "0.25s" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-accent-amber" />
                Recent Alerts
                {alerts.filter((a) => !a.read).length > 0 && (
                  <span className="text-[10px] font-bold bg-accent-red text-white px-1.5 py-0.5 rounded-full">
                    {alerts.filter((a) => !a.read).length}
                  </span>
                )}
              </h2>
              <Link
                href="/alerts"
                className="text-xs text-accent-blue hover:underline"
              >
                View All
              </Link>
            </div>
            {alerts.length === 0 ? (
              <p className="text-sm text-text-muted">
                No alerts yet. Research a competitor more than once to detect changes.
              </p>
            ) : (
              <div className="space-y-2">
                {alerts.slice(0, 4).map((alert) => (
                  <Link
                    key={alert.id}
                    href="/alerts"
                    className={`block p-2.5 rounded-lg border transition-all ${
                      alert.read
                        ? "bg-bg-secondary border-border"
                        : "bg-bg-card border-border-highlight shadow-card"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          alert.severity === "high"
                            ? "bg-accent-red/10 text-accent-red"
                            : alert.severity === "medium"
                            ? "bg-accent-amber/10 text-accent-amber"
                            : "bg-bg-secondary text-text-muted"
                        }`}
                      >
                        {alert.severity}
                      </span>
                      {!alert.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
                      )}
                      <span className="text-[10px] text-text-muted ml-auto">
                        {new Date(alert.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-text-primary truncate">
                      {alert.title}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Scheduled Research */}
          <div className="bg-bg-card border border-border rounded-xl p-5 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent-amber" />
              Research Schedule
            </h2>
            {scheduledCompetitors.length === 0 ? (
              <p className="text-sm text-text-muted">
                No scheduled research. Set a competitor to daily, weekly, or monthly
                research from their case file page.
              </p>
            ) : (
              <div className="space-y-2">
                {scheduledCompetitors.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2.5 bg-bg-secondary rounded-lg"
                  >
                    <span className="text-sm">{c.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-accent-amber/20 text-accent-amber capitalize">
                      {c.research_schedule}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center">
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-text-muted">{label}</div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    idle: { color: "text-text-muted bg-text-muted/20", label: "Idle" },
    researching: { color: "text-accent-blue bg-accent-blue/20", label: "Active" },
    completed: { color: "text-accent-emerald bg-accent-emerald/20", label: "Done" },
    error: { color: "text-accent-red bg-accent-red/20", label: "Error" },
  }[status] || { color: "text-text-muted bg-text-muted/20", label: status };

  return (
    <span className={`text-xs px-2 py-0.5 rounded ${config.color}`}>
      {config.label}
    </span>
  );
}
