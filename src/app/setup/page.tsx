"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Save,
  CheckCircle,
  ArrowRight,
  Search,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  Shield,
  Target,
  BarChart3,
} from "lucide-react";
import { CompanyProfile, CompanyResearch, CompanyResearchFindings } from "@/lib/types";

export default function SetupPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [research, setResearch] = useState<CompanyResearch | null>(null);
  const [researching, setResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/company").then((r) => r.json()),
      fetch("/api/company/research").then((r) => r.json()),
    ]).then(([profileData, researchData]) => {
      setProfile(profileData);
      setResearch(researchData);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setSaved(false);

    await fetch("/api/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDeepResearch = useCallback(async () => {
    setResearching(true);
    setResearchError(null);

    try {
      const res = await fetch("/api/company/research", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Research failed");
      }
      const data = await res.json();
      setResearch(data);
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setResearching(false);
    }
  }, []);

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-text-muted">Loading...</span>
      </div>
    );
  }

  const isComplete = profile.name && profile.industry && profile.description;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent-blue/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-accent-blue" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Company Profile</h1>
            <p className="text-sm text-text-secondary">
              Help our research agents understand your business
            </p>
          </div>
        </div>

        <div className="bg-bg-card border border-border rounded-xl p-6 space-y-5">
          <Field
            label="Company Name"
            placeholder="e.g., Acme Corp"
            value={profile.name}
            onChange={(v) => setProfile({ ...profile, name: v })}
          />
          <Field
            label="Industry"
            placeholder="e.g., B2B SaaS, E-commerce, FinTech"
            value={profile.industry}
            onChange={(v) => setProfile({ ...profile, industry: v })}
          />
          <Field
            label="What You Do"
            placeholder="Describe your company, mission, and what problem you solve..."
            value={profile.description}
            onChange={(v) => setProfile({ ...profile, description: v })}
            multiline
          />
          <Field
            label="Products & Services"
            placeholder="List your main products and services..."
            value={profile.products}
            onChange={(v) => setProfile({ ...profile, products: v })}
            multiline
          />
          <Field
            label="Target Market"
            placeholder="Who are your ideal customers? What segments do you serve?"
            value={profile.target_market}
            onChange={(v) => setProfile({ ...profile, target_market: v })}
            multiline
          />
          <Field
            label="Key Differentiators"
            placeholder="What sets you apart from the competition?"
            value={profile.key_differentiators}
            onChange={(v) => setProfile({ ...profile, key_differentiators: v })}
            multiline
          />

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue hover:bg-accent-blue-dim disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
            >
              {saved ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save Profile"}
                </>
              )}
            </button>

            {isComplete && (
              <button
                onClick={() => router.push("/competitor")}
                className="flex items-center gap-2 px-4 py-2 text-accent-emerald text-sm hover:bg-accent-emerald/10 rounded-lg transition-colors"
              >
                Start Adding Competitors
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Deep Research Section */}
        {isComplete && (
          <div className="mt-6 bg-bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-purple/20 flex items-center justify-center">
                  <Search className="w-5 h-5 text-accent-purple" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Company Deep Research</h2>
                  <p className="text-sm text-text-secondary">
                    Run an in-depth analysis of your own company
                  </p>
                </div>
              </div>
              <button
                onClick={handleDeepResearch}
                disabled={researching}
                className="flex items-center gap-2 px-4 py-2.5 bg-accent-purple hover:bg-accent-purple/80 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
              >
                {researching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Researching...
                  </>
                ) : research?.status === "completed" ? (
                  <>
                    <Search className="w-4 h-4" />
                    Re-run Research
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Launch Deep Research
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-text-muted mb-4">
              Deep research performs a comprehensive self-assessment of your
              company — market position, SWOT analysis, digital presence,
              customer intelligence, and strategic assessment. This data is used
              as a baseline when generating intelligence reports, enabling direct
              head-to-head comparisons with competitors.
            </p>

            {researchError && (
              <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg mb-4">
                <p className="text-sm text-accent-red">{researchError}</p>
              </div>
            )}

            {researching && (
              <div className="flex items-center gap-3 p-4 bg-accent-purple/5 border border-accent-purple/20 rounded-lg">
                <Loader2 className="w-5 h-5 text-accent-purple animate-spin" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Research agent is analyzing your company...
                  </p>
                  <p className="text-xs text-text-muted">
                    Building comprehensive self-assessment across market
                    position, digital presence, customer intelligence, and more.
                  </p>
                </div>
              </div>
            )}

            {research?.status === "completed" && research.findings && (
              <CompanyResearchResults
                findings={JSON.parse(research.findings)}
                completedAt={research.completed_at}
              />
            )}

            {research?.status === "error" && (
              <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg">
                <p className="text-sm text-accent-red">
                  Previous research encountered an error. Try running it again.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 p-4 bg-bg-secondary rounded-xl border border-border">
          <p className="text-xs text-text-muted">
            <strong className="text-text-secondary">Why this matters:</strong>{" "}
            Your company profile gives our research agents context about your
            business. This means the competitive intelligence they gather is
            specifically tailored to what matters for your company — threats to
            your market position, opportunities you can exploit, and strategic
            recommendations that make sense for your situation.
            {research?.status === "completed" && (
              <>
                {" "}
                <strong className="text-text-secondary">
                  Deep research active:
                </strong>{" "}
                Your company deep dive is being used to enhance intelligence
                reports with direct competitor comparisons.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function CompanyResearchResults({
  findings,
  completedAt,
}: {
  findings: CompanyResearchFindings;
  completedAt: string | null;
}) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["overview", "swot_analysis"])
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const sections = [
    {
      key: "overview",
      title: "Company Overview",
      icon: Building2,
      color: "text-accent-blue",
      bgColor: "bg-accent-blue/10",
    },
    {
      key: "market_position",
      title: "Market Position",
      icon: BarChart3,
      color: "text-accent-emerald",
      bgColor: "bg-accent-emerald/10",
    },
    {
      key: "swot_analysis",
      title: "SWOT Analysis",
      icon: Target,
      color: "text-accent-purple",
      bgColor: "bg-accent-purple/10",
    },
    {
      key: "products_and_services",
      title: "Products & Services",
      icon: Building2,
      color: "text-accent-blue",
      bgColor: "bg-accent-blue/10",
    },
    {
      key: "digital_presence",
      title: "Digital Presence",
      icon: TrendingUp,
      color: "text-accent-emerald",
      bgColor: "bg-accent-emerald/10",
    },
    {
      key: "customer_intelligence",
      title: "Customer Intelligence",
      icon: Target,
      color: "text-accent-purple",
      bgColor: "bg-accent-purple/10",
    },
    {
      key: "strategic_assessment",
      title: "Strategic Assessment",
      icon: Shield,
      color: "text-accent-amber",
      bgColor: "bg-accent-amber/10",
    },
    {
      key: "recent_activity",
      title: "Recent Activity",
      icon: TrendingUp,
      color: "text-accent-blue",
      bgColor: "bg-accent-blue/10",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">
          {completedAt
            ? `Last researched: ${new Date(completedAt).toLocaleString()}`
            : "Research complete"}
        </p>
        <span className="text-xs px-2 py-0.5 bg-accent-emerald/20 text-accent-emerald rounded-full">
          Active
        </span>
      </div>

      {sections.map((section) => {
        const isExpanded = expandedSections.has(section.key);
        const Icon = section.icon;

        return (
          <div
            key={section.key}
            className="border border-border rounded-lg overflow-hidden"
          >
            <button
              onClick={() => toggleSection(section.key)}
              className="w-full flex items-center gap-3 p-3 hover:bg-bg-secondary/50 transition-colors text-left"
            >
              <div
                className={`w-7 h-7 rounded-lg ${section.bgColor} flex items-center justify-center`}
              >
                <Icon className={`w-3.5 h-3.5 ${section.color}`} />
              </div>
              <span className="text-sm font-medium text-text-primary flex-1">
                {section.title}
              </span>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronRight className="w-4 h-4 text-text-muted" />
              )}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-3">
                <SectionContent
                  sectionKey={section.key}
                  findings={findings}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionContent({
  sectionKey,
  findings,
}: {
  sectionKey: string;
  findings: CompanyResearchFindings;
}) {
  switch (sectionKey) {
    case "overview":
      return (
        <div className="space-y-2">
          <p className="text-sm text-text-secondary">
            {findings.overview.summary}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-bg-secondary rounded-lg p-2">
              <span className="text-text-muted">Founded:</span>{" "}
              <span className="text-text-primary">
                {findings.overview.founded}
              </span>
            </div>
            <div className="bg-bg-secondary rounded-lg p-2">
              <span className="text-text-muted">HQ:</span>{" "}
              <span className="text-text-primary">
                {findings.overview.headquarters}
              </span>
            </div>
            <div className="bg-bg-secondary rounded-lg p-2">
              <span className="text-text-muted">Employees:</span>{" "}
              <span className="text-text-primary">
                {findings.overview.employees}
              </span>
            </div>
            <div className="bg-bg-secondary rounded-lg p-2">
              <span className="text-text-muted">Revenue:</span>{" "}
              <span className="text-text-primary">
                {findings.overview.revenue_estimate}
              </span>
            </div>
          </div>
        </div>
      );

    case "market_position":
      return (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            {findings.market_position.summary}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-accent-emerald mb-1">
                Strengths
              </p>
              <ul className="space-y-1">
                {findings.market_position.strengths.map((s, i) => (
                  <li
                    key={i}
                    className="text-xs text-text-secondary flex items-start gap-1.5"
                  >
                    <span className="text-accent-emerald mt-0.5">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-accent-red mb-1">
                Weaknesses
              </p>
              <ul className="space-y-1">
                {findings.market_position.weaknesses.map((w, i) => (
                  <li
                    key={i}
                    className="text-xs text-text-secondary flex items-start gap-1.5"
                  >
                    <span className="text-accent-red mt-0.5">-</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      );

    case "swot_analysis":
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-accent-emerald/5 border border-accent-emerald/20 rounded-lg p-3">
            <p className="text-xs font-medium text-accent-emerald mb-2">
              Strengths
            </p>
            <ul className="space-y-1">
              {findings.swot_analysis.strengths.map((s, i) => (
                <li key={i} className="text-xs text-text-secondary">
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-accent-red/5 border border-accent-red/20 rounded-lg p-3">
            <p className="text-xs font-medium text-accent-red mb-2">Weaknesses</p>
            <ul className="space-y-1">
              {findings.swot_analysis.weaknesses.map((w, i) => (
                <li key={i} className="text-xs text-text-secondary">
                  {w}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-lg p-3">
            <p className="text-xs font-medium text-accent-blue mb-2">
              Opportunities
            </p>
            <ul className="space-y-1">
              {findings.swot_analysis.opportunities.map((o, i) => (
                <li key={i} className="text-xs text-text-secondary">
                  {o}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-accent-amber/5 border border-accent-amber/20 rounded-lg p-3">
            <p className="text-xs font-medium text-accent-amber mb-2">Threats</p>
            <ul className="space-y-1">
              {findings.swot_analysis.threats.map((t, i) => (
                <li key={i} className="text-xs text-text-secondary">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      );

    case "products_and_services":
      return (
        <div className="space-y-2">
          <p className="text-sm text-text-secondary">
            {findings.products_and_services.summary}
          </p>
          {findings.products_and_services.items.map((item, i) => (
            <div key={i} className="bg-bg-secondary rounded-lg p-3">
              <p className="text-sm font-medium text-text-primary">
                {item.name}
              </p>
              <p className="text-xs text-text-secondary mt-1">
                {item.description}
              </p>
              <p className="text-xs text-text-muted mt-1">
                Market fit: {item.market_fit}
              </p>
            </div>
          ))}
        </div>
      );

    case "digital_presence":
      return (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-text-primary mb-1">
              Website
            </p>
            <p className="text-xs text-text-secondary">
              {findings.digital_presence.website_analysis}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-primary mb-1">SEO</p>
            <p className="text-xs text-text-secondary">
              {findings.digital_presence.seo_observations}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-primary mb-1">
              Content Strategy
            </p>
            <p className="text-xs text-text-secondary">
              {findings.digital_presence.content_strategy}
            </p>
          </div>
          {findings.digital_presence.social_media.map((sm, i) => (
            <div key={i} className="bg-bg-secondary rounded-lg p-2">
              <p className="text-xs font-medium text-text-primary">
                {sm.platform}
              </p>
              <p className="text-xs text-text-secondary">{sm.observations}</p>
            </div>
          ))}
        </div>
      );

    case "customer_intelligence":
      return (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            {findings.customer_intelligence.summary}
          </p>
          <div>
            <p className="text-xs font-medium text-text-primary mb-1">
              Sentiment
            </p>
            <p className="text-xs text-text-secondary">
              {findings.customer_intelligence.sentiment}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-primary mb-1">
              Key Feedback
            </p>
            <ul className="space-y-1">
              {findings.customer_intelligence.key_reviews.map((r, i) => (
                <li key={i} className="text-xs text-text-secondary">
                  &bull; {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      );

    case "strategic_assessment":
      return (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            {findings.strategic_assessment.summary}
          </p>
          <div>
            <p className="text-xs font-medium text-accent-emerald mb-2">
              Growth Areas
            </p>
            {findings.strategic_assessment.growth_areas.map((g, i) => (
              <div key={i} className="bg-bg-secondary rounded-lg p-2 mb-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-text-primary">
                    {g.area}
                  </p>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      g.potential === "high"
                        ? "bg-accent-emerald/20 text-accent-emerald"
                        : g.potential === "medium"
                          ? "bg-accent-amber/20 text-accent-amber"
                          : "bg-text-muted/20 text-text-muted"
                    }`}
                  >
                    {g.potential}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {g.rationale}
                </p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-medium text-accent-red mb-2">
              Risk Factors
            </p>
            {findings.strategic_assessment.risk_factors.map((r, i) => (
              <div key={i} className="bg-bg-secondary rounded-lg p-2 mb-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-text-primary">
                    {r.risk}
                  </p>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      r.severity === "high"
                        ? "bg-accent-red/20 text-accent-red"
                        : r.severity === "medium"
                          ? "bg-accent-amber/20 text-accent-amber"
                          : "bg-text-muted/20 text-text-muted"
                    }`}
                  >
                    {r.severity}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Mitigation: {r.mitigation}
                </p>
              </div>
            ))}
          </div>
        </div>
      );

    case "recent_activity":
      return (
        <div className="space-y-3">
          {findings.recent_activity.news.map((n, i) => (
            <div key={i} className="bg-bg-secondary rounded-lg p-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-text-primary">
                  {n.title}
                </p>
                {n.date && (
                  <span className="text-xs text-text-muted">{n.date}</span>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-1">{n.summary}</p>
            </div>
          ))}
          <div>
            <p className="text-xs font-medium text-text-primary mb-1">
              Hiring Signals
            </p>
            <p className="text-xs text-text-secondary">
              {findings.recent_activity.hiring_signals}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-primary mb-1">
              Partnerships
            </p>
            <p className="text-xs text-text-secondary">
              {findings.recent_activity.partnerships}
            </p>
          </div>
        </div>
      );

    default:
      return null;
  }
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  multiline,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const baseClasses =
    "w-full bg-bg-secondary border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/20 transition-colors";

  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-1.5">
        {label}
      </label>
      {multiline ? (
        <textarea
          className={`${baseClasses} resize-none`}
          rows={3}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type="text"
          className={baseClasses}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
