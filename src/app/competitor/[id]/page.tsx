"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Loader2,
  Clock,
  Globe,
  Building2,
  Package,
  Target,
  Monitor,
  Users,
  Swords,
  Newspaper,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Star,
  Calendar,
  BarChart3,
  ExternalLink,
  Printer,
  Home,
} from "lucide-react";
import { Competitor, CaseFile, CaseFileFindings } from "@/lib/types";

export default function CompetitorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const competitorId = params.id as string;

  const [competitor, setCompetitor] = useState<Competitor | null>(null);
  const [caseFiles, setCaseFiles] = useState<CaseFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<CaseFile | null>(null);
  const [findings, setFindings] = useState<CaseFileFindings | null>(null);
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [schedule, setSchedule] = useState("manual");

  const fetchData = async () => {
    const [compsRes, filesRes] = await Promise.all([
      fetch("/api/competitors"),
      fetch(`/api/research?competitor_id=${competitorId}`),
    ]);
    const comps = await compsRes.json();
    const files = await filesRes.json();

    const comp = comps.find((c: Competitor) => c.id === competitorId);
    if (!comp) {
      router.push("/competitor");
      return;
    }

    setCompetitor(comp);
    setSchedule(comp.research_schedule);
    setCaseFiles(files);

    // Auto-select most recent completed file
    const completed = files.filter((f: CaseFile) => f.status === "completed");
    if (completed.length > 0 && !selectedFile) {
      const file = completed[0];
      setSelectedFile(file);
      if (file.findings) {
        try {
          setFindings(JSON.parse(file.findings));
        } catch {}
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitorId]);

  const launchResearch = async () => {
    setResearching(true);
    try {
      await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitor_id: competitorId }),
      });
      await fetchData();
    } finally {
      setResearching(false);
    }
  };

  const updateSchedule = async (newSchedule: string) => {
    setSchedule(newSchedule);
    await fetch("/api/competitors", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: competitorId,
        research_schedule: newSchedule,
      }),
    });
  };

  const selectCaseFile = (cf: CaseFile) => {
    setSelectedFile(cf);
    if (cf.findings) {
      try {
        setFindings(JSON.parse(cf.findings));
      } catch {
        setFindings(null);
      }
    } else {
      setFindings(null);
    }
  };

  if (loading || !competitor) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-text-muted">Loading case file...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="animate-fade-in mb-6">
        <Link
          href="/competitor"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Case Files
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{competitor.name}</h1>
            {competitor.website && (
              <div className="flex items-center gap-1 mt-1 text-sm text-text-muted">
                <Globe className="w-3.5 h-3.5" />
                {competitor.website}
              </div>
            )}
            {competitor.notes && (
              <p className="text-sm text-text-secondary mt-2">
                {competitor.notes}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Battle Card Link */}
            {findings && (
              <Link
                href={`/battlecard/${competitorId}`}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border border-border text-text-secondary hover:bg-bg-secondary"
              >
                <Swords className="w-4 h-4" />
                Battle Card
              </Link>
            )}

            {/* Export PDF */}
            {findings && (
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border border-border text-text-secondary hover:bg-bg-secondary print:hidden"
              >
                <Printer className="w-4 h-4" />
              </button>
            )}

            {/* Schedule Selector */}
            <div className="flex items-center gap-2 bg-bg-card border border-border rounded-lg px-3 py-2">
              <Clock className="w-4 h-4 text-accent-amber" />
              <select
                value={schedule}
                onChange={(e) => updateSchedule(e.target.value)}
                className="bg-transparent text-sm text-text-secondary focus:outline-none"
              >
                <option value="manual">Manual</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {/* Research Button */}
            <button
              onClick={launchResearch}
              disabled={researching}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm ${
                researching
                  ? "bg-accent-amber/20 text-accent-amber"
                  : "bg-accent-amber hover:bg-accent-amber/90 text-white"
              }`}
            >
              {researching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Researching...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Launch Research
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Case File Timeline */}
      {caseFiles.length > 1 && (
        <div className="mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h3 className="text-xs uppercase tracking-wide text-text-muted mb-2 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Case File History
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {caseFiles.map((cf) => (
              <button
                key={cf.id}
                onClick={() => selectCaseFile(cf)}
                className={`shrink-0 px-3 py-2 rounded-lg text-xs border transition-colors ${
                  selectedFile?.id === cf.id
                    ? "bg-accent-blue/20 border-accent-blue/40 text-accent-blue"
                    : "bg-bg-card border-border text-text-secondary hover:bg-bg-card-hover"
                }`}
              >
                {cf.research_type === "floor_plans" ? "Floor Plans — " : ""}
                {new Date(cf.created_at).toLocaleDateString()}{" "}
                {cf.status === "completed" && "- Complete"}
                {cf.status === "in_progress" && "- In Progress"}
                {cf.status === "error" && "- Error"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No findings state */}
      {!findings && !researching && (
        <div className="text-center py-16 animate-fade-in">
          <Target className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No Research Yet</h2>
          <p className="text-text-secondary text-sm mb-4">
            Launch a deep research agent to build a case file on {competitor.name}.
          </p>
          <button
            onClick={launchResearch}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-amber hover:bg-accent-amber/90 rounded-lg text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Play className="w-4 h-4" />
            Launch Research Agent
          </button>
        </div>
      )}

      {/* Researching State */}
      {researching && !findings && (
        <div className="text-center py-16 animate-fade-in scan-effect rounded-xl bg-bg-card border border-border">
          <Loader2 className="w-10 h-10 text-accent-blue mx-auto mb-4 animate-spin" />
          <h2 className="text-lg font-semibold mb-2">
            Research Agent Active
          </h2>
          <p className="text-text-secondary text-sm">
            Deep-diving into {competitor.name}&apos;s digital footprint. Building your
            case file...
          </p>
        </div>
      )}

      {/* Floor Plan Report Display */}
      {findings && selectedFile?.research_type === "floor_plans" && (
        <div className="space-y-4">
          <Section
            icon={<Home className="w-4 h-4 text-accent-emerald" />}
            title="Floor Plan Research Report"
            delay="0.1s"
            defaultOpen
          >
            {(findings as Record<string, unknown>).floor_plan_report && (
              <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {String((findings as Record<string, unknown>).floor_plan_report)}
              </div>
            )}
            {(findings as Record<string, unknown>).plans_extracted && (
              <div className="mt-4 p-3 bg-bg-secondary rounded-lg border border-border">
                <p className="text-xs font-medium text-text-muted mb-1">Plans Extracted</p>
                <p className="text-lg font-bold text-accent-emerald">{String((findings as Record<string, unknown>).plans_extracted)} floor plans added to comparison table</p>
              </div>
            )}
          </Section>

          {Array.isArray((findings as Record<string, unknown>).sources) && ((findings as Record<string, unknown>).sources as Array<{title: string; url: string}>).length > 0 && (
            <Section
              icon={<ExternalLink className="w-4 h-4 text-accent-blue" />}
              title="Sources"
              delay="0.15s"
            >
              <div className="flex flex-wrap gap-2">
                {((findings as Record<string, unknown>).sources as Array<{title: string; url: string}>).map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 bg-bg-secondary rounded-lg text-accent-blue hover:bg-accent-blue/10 transition-colors flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    {s.title}
                  </a>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* Findings Display */}
      {findings && selectedFile?.research_type !== "floor_plans" && (
        <div className="space-y-4">
          <Section
            icon={<Building2 className="w-4 h-4 text-accent-blue" />}
            title="Company Overview"
            delay="0.1s"
            defaultOpen
          >
            <p className="text-sm text-text-secondary leading-relaxed mb-4">
              {findings.overview.summary}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <InfoPill label="Founded" value={findings.overview.founded} />
              <InfoPill label="HQ" value={findings.overview.headquarters} />
              <InfoPill label="Employees" value={findings.overview.employees} />
              <InfoPill label="Funding" value={findings.overview.funding} />
              <InfoPill
                label="Revenue Est."
                value={findings.overview.revenue_estimate}
                span2
              />
            </div>
          </Section>

          <Section
            icon={<Package className="w-4 h-4 text-accent-cyan" />}
            title="Products & Services"
            delay="0.15s"
          >
            <p className="text-sm text-text-secondary mb-4">
              {findings.products_and_services.summary}
            </p>
            <div className="space-y-3">
              {findings.products_and_services.items.map((item, i) => (
                <div
                  key={i}
                  className="p-3 bg-bg-secondary rounded-lg border border-border"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="text-sm font-medium">{item.name}</h4>
                    {item.pricing && (
                      <span className="text-xs bg-accent-emerald/20 text-accent-emerald px-2 py-0.5 rounded">
                        {item.pricing}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          <Section
            icon={<Target className="w-4 h-4 text-accent-emerald" />}
            title="Market Position"
            delay="0.2s"
          >
            <p className="text-sm text-text-secondary mb-4">
              {findings.market_position.summary}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs uppercase tracking-wide text-accent-emerald mb-2">
                  Strengths
                </h4>
                <ul className="space-y-1.5">
                  {findings.market_position.strengths.map((s, i) => (
                    <li
                      key={i}
                      className="text-sm text-text-secondary flex items-start gap-2"
                    >
                      <TrendingUp className="w-3 h-3 text-accent-emerald shrink-0 mt-1" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-wide text-accent-red mb-2">
                  Weaknesses
                </h4>
                <ul className="space-y-1.5">
                  {findings.market_position.weaknesses.map((w, i) => (
                    <li
                      key={i}
                      className="text-sm text-text-secondary flex items-start gap-2"
                    >
                      <AlertTriangle className="w-3 h-3 text-accent-red shrink-0 mt-1" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          <Section
            icon={<Monitor className="w-4 h-4 text-accent-purple" />}
            title="Digital Presence"
            delay="0.25s"
          >
            <div className="space-y-4">
              <div>
                <h4 className="text-xs uppercase tracking-wide text-text-muted mb-1.5">
                  Website Analysis
                </h4>
                <p className="text-sm text-text-secondary">
                  {findings.digital_presence.website_analysis}
                </p>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-wide text-text-muted mb-1.5">
                  SEO Observations
                </h4>
                <p className="text-sm text-text-secondary">
                  {findings.digital_presence.seo_observations}
                </p>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-wide text-text-muted mb-2">
                  Social Media
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {findings.digital_presence.social_media.map((sm, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-bg-secondary rounded-lg border border-border"
                    >
                      <span className="text-xs font-medium text-accent-purple">
                        {sm.platform}
                      </span>
                      <p className="text-xs text-text-muted mt-0.5">
                        {sm.observations}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-wide text-text-muted mb-1.5">
                  Content Strategy
                </h4>
                <p className="text-sm text-text-secondary">
                  {findings.digital_presence.content_strategy}
                </p>
              </div>
            </div>
          </Section>

          <Section
            icon={<Users className="w-4 h-4 text-accent-amber" />}
            title="Customer Intelligence"
            delay="0.3s"
          >
            <p className="text-sm text-text-secondary mb-3">
              {findings.customer_intelligence.summary}
            </p>
            <div className="mb-3">
              <h4 className="text-xs uppercase tracking-wide text-text-muted mb-2">
                Target Segments
              </h4>
              <div className="flex flex-wrap gap-2">
                {findings.customer_intelligence.target_segments.map((seg, i) => (
                  <span
                    key={i}
                    className="text-xs bg-accent-amber/15 text-accent-amber px-2.5 py-1 rounded-lg"
                  >
                    {seg}
                  </span>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <h4 className="text-xs uppercase tracking-wide text-text-muted mb-1.5">
                Customer Sentiment
              </h4>
              <p className="text-sm text-text-secondary">
                {findings.customer_intelligence.sentiment}
              </p>
            </div>
            {findings.customer_intelligence.key_reviews.length > 0 && (
              <div>
                <h4 className="text-xs uppercase tracking-wide text-text-muted mb-2">
                  Key Review Insights
                </h4>
                <div className="space-y-1.5">
                  {findings.customer_intelligence.key_reviews.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-sm text-text-secondary"
                    >
                      <Star className="w-3 h-3 text-accent-amber shrink-0 mt-1" />
                      {r}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          <Section
            icon={<Swords className="w-4 h-4 text-accent-red" />}
            title="Competitive Analysis"
            delay="0.35s"
            defaultOpen
          >
            <div className="space-y-4">
              <div>
                <h4 className="text-xs uppercase tracking-wide text-accent-red mb-2">
                  Direct Threats
                </h4>
                <div className="space-y-1.5">
                  {findings.competitive_analysis.direct_threats.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-sm text-text-secondary"
                    >
                      <AlertTriangle className="w-3 h-3 text-accent-red shrink-0 mt-1" />
                      {t}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-wide text-accent-emerald mb-2">
                  Opportunities For You
                </h4>
                <div className="space-y-1.5">
                  {findings.competitive_analysis.opportunities_for_you.map(
                    (o, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-sm text-text-secondary"
                      >
                        <TrendingUp className="w-3 h-3 text-accent-emerald shrink-0 mt-1" />
                        {o}
                      </div>
                    )
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-wide text-text-muted mb-1.5">
                  Pricing Comparison
                </h4>
                <p className="text-sm text-text-secondary">
                  {findings.competitive_analysis.pricing_comparison}
                </p>
              </div>
            </div>
          </Section>

          <Section
            icon={<Newspaper className="w-4 h-4 text-accent-cyan" />}
            title="Recent Activity & Signals"
            delay="0.4s"
          >
            <div className="space-y-4">
              {findings.recent_activity.news.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-text-muted mb-2">
                    News & Updates
                  </h4>
                  <div className="space-y-2">
                    {findings.recent_activity.news.map((n, i) => (
                      <div
                        key={i}
                        className="p-3 bg-bg-secondary rounded-lg border border-border"
                      >
                        <div className="flex items-start justify-between">
                          <h5 className="text-sm font-medium">{n.title}</h5>
                          {n.date && (
                            <span className="text-xs text-text-muted shrink-0 ml-2">
                              {n.date}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted mt-1">
                          {n.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h4 className="text-xs uppercase tracking-wide text-text-muted mb-1.5">
                  Hiring Signals
                </h4>
                <p className="text-sm text-text-secondary">
                  {findings.recent_activity.hiring_signals}
                </p>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-wide text-text-muted mb-1.5">
                  Partnerships & Integrations
                </h4>
                <p className="text-sm text-text-secondary">
                  {findings.recent_activity.partnerships}
                </p>
              </div>
            </div>
          </Section>

          <Section
            icon={<Lightbulb className="w-4 h-4 text-accent-amber" />}
            title="Strategic Recommendations"
            delay="0.45s"
            defaultOpen
          >
            <p className="text-sm text-text-secondary mb-4">
              {findings.strategic_recommendations.summary}
            </p>
            <div className="space-y-2">
              {findings.strategic_recommendations.action_items.map((item, i) => (
                <div
                  key={i}
                  className="p-3 bg-bg-secondary rounded-lg border border-border"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 mt-0.5 ${
                        item.priority === "high"
                          ? "bg-accent-red/20 text-accent-red"
                          : item.priority === "medium"
                          ? "bg-accent-amber/20 text-accent-amber"
                          : "bg-accent-emerald/20 text-accent-emerald"
                      }`}
                    >
                      {item.priority}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{item.action}</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {item.rationale}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Trend Timeline */}
          <TrendTimeline caseFiles={caseFiles} />

          {/* Competitive Scores */}
          {findings.competitive_scores && (
            <Section
              icon={<BarChart3 className="w-4 h-4 text-accent-purple" />}
              title="Competitive Scorecard"
              delay="0.5s"
              defaultOpen
            >
              <div className="space-y-3">
                {[
                  { key: "product_strength", label: "Product Strength", color: "bg-accent-blue" },
                  { key: "market_position", label: "Market Position", color: "bg-accent-emerald" },
                  { key: "digital_presence", label: "Digital Presence", color: "bg-accent-purple" },
                  { key: "customer_satisfaction", label: "Customer Satisfaction", color: "bg-accent-amber" },
                  { key: "pricing_competitiveness", label: "Pricing Competitiveness", color: "bg-accent-cyan" },
                  { key: "innovation_velocity", label: "Innovation Velocity", color: "bg-accent-blue" },
                  { key: "overall_threat_level", label: "Overall Threat Level", color: "bg-accent-red" },
                ].map((dim) => {
                  const score = findings.competitive_scores[dim.key as keyof typeof findings.competitive_scores];
                  return (
                    <div key={dim.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-text-secondary">{dim.label}</span>
                        <span className={`text-xs font-bold ${
                          score >= 8 ? "text-accent-red" : score >= 6 ? "text-accent-amber" : "text-accent-emerald"
                        }`}>
                          {score}/10
                        </span>
                      </div>
                      <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${dim.color}`}
                          style={{ width: `${score * 10}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Sources */}
          {findings.sources && findings.sources.length > 0 && (
            <Section
              icon={<ExternalLink className="w-4 h-4 text-text-muted" />}
              title={`Sources (${findings.sources.length})`}
              delay="0.55s"
            >
              <div className="space-y-1.5">
                {findings.sources.map((source, i) => (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-bg-secondary rounded-lg hover:bg-bg-card-hover transition-colors group"
                  >
                    <ExternalLink className="w-3 h-3 text-text-muted group-hover:text-accent-blue shrink-0" />
                    <span className="text-xs text-text-secondary group-hover:text-accent-blue truncate">
                      {source.title}
                    </span>
                  </a>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
  delay = "0s",
  defaultOpen = false,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  delay?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="bg-bg-card border border-border rounded-xl overflow-hidden animate-fade-in"
      style={{ animationDelay: delay }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-bg-card-hover transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-sm">{title}</span>
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-muted" />
        )}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function InfoPill({
  label,
  value,
  span2,
}: {
  label: string;
  value: string;
  span2?: boolean;
}) {
  return (
    <div
      className={`p-2.5 bg-bg-secondary rounded-lg ${span2 ? "col-span-2" : ""}`}
    >
      <span className="text-xs text-text-muted">{label}</span>
      <p className="text-sm mt-0.5">{value}</p>
    </div>
  );
}

const TREND_DIMENSIONS = [
  { key: "product_strength", label: "Product", color: "#1e3a8a" },
  { key: "market_position", label: "Market", color: "#059669" },
  { key: "digital_presence", label: "Digital", color: "#1e3a8a" },
  { key: "customer_satisfaction", label: "Customers", color: "#ea580c" },
  { key: "pricing_competitiveness", label: "Pricing", color: "#0d9488" },
  { key: "innovation_velocity", label: "Innovation", color: "#1e40af" },
  { key: "overall_threat_level", label: "Threat", color: "#dc2626" },
] as const;

interface TrendDataPoint {
  date: string;
  label: string;
  scores: Record<string, number>;
}

function TrendTimeline({ caseFiles }: { caseFiles: CaseFile[] }) {
  const [selectedDimensions, setSelectedDimensions] = useState<Set<string>>(
    new Set(["overall_threat_level", "product_strength", "market_position"])
  );

  // Extract score data from all completed case files (oldest first)
  const trendData: TrendDataPoint[] = caseFiles
    .filter((f) => f.status === "completed" && f.findings)
    .reverse()
    .map((f) => {
      try {
        const findings = JSON.parse(f.findings!) as CaseFileFindings;
        if (!findings.competitive_scores) return null;
        return {
          date: f.completed_at || f.created_at,
          label: new Date(f.completed_at || f.created_at).toLocaleDateString(
            undefined,
            { month: "short", day: "numeric" }
          ),
          scores: findings.competitive_scores as unknown as Record<string, number>,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as TrendDataPoint[];

  // Need at least 2 data points for a trend
  if (trendData.length < 2) return null;

  const toggleDimension = (key: string) => {
    setSelectedDimensions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const chartHeight = 160;
  const chartPadding = { top: 10, right: 10, bottom: 25, left: 30 };
  const innerWidth =
    trendData.length * 80 - chartPadding.left - chartPadding.right;
  const chartWidth = Math.max(
    300,
    innerWidth + chartPadding.left + chartPadding.right
  );
  const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom;

  const xScale = (i: number) =>
    chartPadding.left +
    (i / (trendData.length - 1)) *
      (chartWidth - chartPadding.left - chartPadding.right);
  const yScale = (v: number) =>
    chartPadding.top + innerHeight - (v / 10) * innerHeight;

  return (
    <Section
      icon={<TrendingUp className="w-4 h-4 text-accent-cyan" />}
      title="Score Trends"
      delay="0.48s"
      defaultOpen
    >
      <div className="space-y-3">
        {/* Dimension selector */}
        <div className="flex flex-wrap gap-1.5">
          {TREND_DIMENSIONS.map((dim) => (
            <button
              key={dim.key}
              onClick={() => toggleDimension(dim.key)}
              className={`text-[11px] px-2 py-1 rounded-lg border transition-all ${
                selectedDimensions.has(dim.key)
                  ? "border-current font-medium"
                  : "border-border text-text-muted hover:text-text-secondary"
              }`}
              style={
                selectedDimensions.has(dim.key) ? { color: dim.color } : {}
              }
            >
              {dim.label}
            </button>
          ))}
        </div>

        {/* SVG Chart */}
        <div className="overflow-x-auto">
          <svg
            width={chartWidth}
            height={chartHeight}
            className="w-full"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          >
            {/* Y-axis grid lines */}
            {[0, 2, 4, 6, 8, 10].map((v) => (
              <g key={v}>
                <line
                  x1={chartPadding.left}
                  y1={yScale(v)}
                  x2={chartWidth - chartPadding.right}
                  y2={yScale(v)}
                  stroke="#e2e8f0"
                  strokeDasharray={v === 0 ? "0" : "3,3"}
                />
                <text
                  x={chartPadding.left - 8}
                  y={yScale(v) + 3}
                  textAnchor="end"
                  className="fill-[#9ca3af]"
                  fontSize={10}
                >
                  {v}
                </text>
              </g>
            ))}

            {/* X-axis labels */}
            {trendData.map((point, i) => (
              <text
                key={i}
                x={xScale(i)}
                y={chartHeight - 4}
                textAnchor="middle"
                className="fill-[#9ca3af]"
                fontSize={10}
              >
                {point.label}
              </text>
            ))}

            {/* Lines */}
            {TREND_DIMENSIONS.filter((d) =>
              selectedDimensions.has(d.key)
            ).map((dim) => {
              const points = trendData
                .map(
                  (p, i) =>
                    `${xScale(i)},${yScale(p.scores[dim.key] ?? 0)}`
                )
                .join(" ");
              return (
                <g key={dim.key}>
                  <polyline
                    points={points}
                    fill="none"
                    stroke={dim.color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {trendData.map((p, i) => (
                    <circle
                      key={i}
                      cx={xScale(i)}
                      cy={yScale(p.scores[dim.key] ?? 0)}
                      r={3}
                      fill="white"
                      stroke={dim.color}
                      strokeWidth={2}
                    />
                  ))}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Delta summary for latest vs first */}
        <div className="flex flex-wrap gap-2 pt-1">
          {TREND_DIMENSIONS.filter((d) => selectedDimensions.has(d.key)).map(
            (dim) => {
              const first = trendData[0].scores[dim.key] ?? 0;
              const last = trendData[trendData.length - 1].scores[dim.key] ?? 0;
              const delta = last - first;
              if (delta === 0) return null;
              return (
                <span
                  key={dim.key}
                  className={`text-[11px] px-2 py-0.5 rounded-lg ${
                    delta > 0
                      ? "bg-accent-red/10 text-accent-red"
                      : "bg-accent-emerald/10 text-accent-emerald"
                  }`}
                >
                  {dim.label}: {delta > 0 ? "+" : ""}
                  {delta}
                </span>
              );
            }
          )}
        </div>
      </div>
    </Section>
  );
}
