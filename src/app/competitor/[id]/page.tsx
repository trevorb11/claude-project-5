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

          <div className="flex items-center gap-3">
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                researching
                  ? "bg-accent-blue/20 text-accent-blue"
                  : "bg-accent-blue hover:bg-accent-blue-dim text-white"
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
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-blue hover:bg-accent-blue-dim rounded-lg text-white text-sm font-medium transition-colors"
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

      {/* Findings Display */}
      {findings && (
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
