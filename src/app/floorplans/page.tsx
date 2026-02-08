"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Home,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Star,
  DollarSign,
  Maximize2,
  BedDouble,
  Bath,
  Layers,
  Car,
  Sparkles,
  Loader2,
  ExternalLink,
  Printer,
  Building2,
} from "lucide-react";
import { FloorPlan } from "@/lib/types";

type SortField =
  | "base_price"
  | "sq_ft"
  | "bedrooms"
  | "bathrooms"
  | "price_per_sqft"
  | "value_score"
  | "stories"
  | "garage_spaces";
type SortDir = "asc" | "desc";

const SORT_OPTIONS: { field: SortField; label: string; icon: typeof Home; defaultDir: SortDir }[] = [
  { field: "value_score", label: "Best Value", icon: Sparkles, defaultDir: "desc" },
  { field: "base_price", label: "Price", icon: DollarSign, defaultDir: "asc" },
  { field: "price_per_sqft", label: "$/Sq Ft", icon: DollarSign, defaultDir: "asc" },
  { field: "sq_ft", label: "Sq Ft", icon: Maximize2, defaultDir: "desc" },
  { field: "bedrooms", label: "Bedrooms", icon: BedDouble, defaultDir: "desc" },
  { field: "bathrooms", label: "Bathrooms", icon: Bath, defaultDir: "desc" },
  { field: "stories", label: "Stories", icon: Layers, defaultDir: "desc" },
  { field: "garage_spaces", label: "Garage", icon: Car, defaultDir: "desc" },
];

export default function FloorPlansPage() {
  const [plans, setPlans] = useState<FloorPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("value_score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [scoring, setScoring] = useState(false);
  const [filterSource, setFilterSource] = useState<"all" | "company" | "competitor">("all");

  useEffect(() => {
    fetch("/api/floorplans")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPlans(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleScore = async () => {
    setScoring(true);
    try {
      await fetch("/api/floorplans/score", { method: "POST" });
      // Refetch plans with updated scores
      const res = await fetch("/api/floorplans");
      const data = await res.json();
      if (Array.isArray(data)) setPlans(data);
    } catch {
      // ignore
    }
    setScoring(false);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      const opt = SORT_OPTIONS.find((o) => o.field === field);
      setSortField(field);
      setSortDir(opt?.defaultDir || "desc");
    }
  };

  const filteredPlans = useMemo(() => {
    let filtered = plans;
    if (filterSource !== "all") {
      filtered = plans.filter((p) => p.source === filterSource);
    }
    return filtered;
  }, [plans, filterSource]);

  const sortedPlans = useMemo(() => {
    return [...filteredPlans].sort((a, b) => {
      const aVal = a[sortField] ?? (sortDir === "asc" ? Infinity : -Infinity);
      const bVal = b[sortField] ?? (sortDir === "asc" ? Infinity : -Infinity);
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredPlans, sortField, sortDir]);

  // Stats
  const companyPlans = plans.filter((p) => p.source === "company");
  const competitorPlans = plans.filter((p) => p.source === "competitor");
  const competitorNames = [...new Set(competitorPlans.map((p) => p.competitor_name).filter(Boolean))];

  // Get rank for current sort
  const getRank = (plan: FloorPlan) => {
    const idx = sortedPlans.indexOf(plan);
    return idx + 1;
  };

  // Determine the "winner" for the active sort
  const topPlan = sortedPlans[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-text-muted">Loading floor plans...</span>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-fade-in text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-accent-emerald/20 flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-accent-emerald" />
          </div>
          <h1 className="text-xl font-bold mb-2">Floor Plan Comparison</h1>
          <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
            No floor plans found yet. Add your company&apos;s floor plans in the
            My Company page, then run competitor research to discover their
            models.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="/setup"
              className="px-4 py-2.5 bg-accent-emerald hover:bg-accent-emerald/80 rounded-lg text-white text-sm font-medium transition-colors"
            >
              Add Your Floor Plans
            </a>
            <a
              href="/competitor"
              className="px-4 py-2.5 bg-bg-card border border-border hover:bg-bg-secondary rounded-lg text-text-primary text-sm font-medium transition-colors"
            >
              Research Competitors
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-emerald/20 flex items-center justify-center">
              <Home className="w-5 h-5 text-accent-emerald" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Floor Plan Comparison</h1>
              <p className="text-sm text-text-secondary">
                {companyPlans.length} of yours · {competitorPlans.length} competitor models
                {competitorNames.length > 0 && (
                  <span className="text-text-muted">
                    {" "}
                    from {competitorNames.join(", ")}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handleScore}
              disabled={scoring}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent-purple hover:bg-accent-purple/80 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
            >
              {scoring ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scoring...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  AI Value Score
                </>
              )}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-2.5 bg-bg-card border border-border hover:bg-bg-secondary rounded-lg text-text-secondary text-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <SummaryCard
            label="Total Models"
            value={plans.length.toString()}
            sub={`${companyPlans.length} yours, ${competitorPlans.length} competitors`}
            icon={Home}
            color="text-accent-blue"
          />
          <SummaryCard
            label="Price Range"
            value={getPriceRange(plans)}
            sub="Base price across all models"
            icon={DollarSign}
            color="text-accent-emerald"
          />
          <SummaryCard
            label="Size Range"
            value={getSqFtRange(plans)}
            sub="Square footage"
            icon={Maximize2}
            color="text-accent-purple"
          />
          <SummaryCard
            label="Avg $/Sq Ft"
            value={getAvgPPSF(plans)}
            sub="Across all models"
            icon={DollarSign}
            color="text-accent-amber"
          />
        </div>

        {/* Filter + Sort Controls */}
        <div className="flex items-center justify-between mb-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Show:</span>
            {(["all", "company", "competitor"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterSource(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterSource === f
                    ? "bg-accent-blue/15 text-accent-blue border border-accent-blue/30"
                    : "bg-bg-card border border-border text-text-secondary hover:bg-bg-secondary"
                }`}
              >
                {f === "all" ? "All" : f === "company" ? "Our Plans" : "Competitors"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-muted">Sort:</span>
            {SORT_OPTIONS.map((opt) => {
              const active = sortField === opt.field;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.field}
                  onClick={() => handleSort(opt.field)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? "bg-accent-blue/15 text-accent-blue border border-accent-blue/30"
                      : "bg-bg-card border border-border text-text-secondary hover:bg-bg-secondary"
                  }`}
                >
                  {opt.label}
                  {active &&
                    (sortDir === "asc" ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    ))}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-secondary/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted w-8">
                    #
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">
                    Model / Builder
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs font-medium text-text-muted cursor-pointer hover:text-text-primary print:cursor-default"
                    onClick={() => handleSort("base_price")}
                  >
                    <span className="flex items-center justify-end gap-1">
                      Price
                      <SortIcon field="base_price" active={sortField} dir={sortDir} />
                    </span>
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs font-medium text-text-muted cursor-pointer hover:text-text-primary"
                    onClick={() => handleSort("sq_ft")}
                  >
                    <span className="flex items-center justify-end gap-1">
                      Sq Ft
                      <SortIcon field="sq_ft" active={sortField} dir={sortDir} />
                    </span>
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs font-medium text-text-muted cursor-pointer hover:text-text-primary"
                    onClick={() => handleSort("price_per_sqft")}
                  >
                    <span className="flex items-center justify-end gap-1">
                      $/SqFt
                      <SortIcon field="price_per_sqft" active={sortField} dir={sortDir} />
                    </span>
                  </th>
                  <th
                    className="text-center px-4 py-3 text-xs font-medium text-text-muted cursor-pointer hover:text-text-primary"
                    onClick={() => handleSort("bedrooms")}
                  >
                    <span className="flex items-center justify-center gap-1">
                      Bed
                      <SortIcon field="bedrooms" active={sortField} dir={sortDir} />
                    </span>
                  </th>
                  <th
                    className="text-center px-4 py-3 text-xs font-medium text-text-muted cursor-pointer hover:text-text-primary"
                    onClick={() => handleSort("bathrooms")}
                  >
                    <span className="flex items-center justify-center gap-1">
                      Bath
                      <SortIcon field="bathrooms" active={sortField} dir={sortDir} />
                    </span>
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-text-muted">
                    Stories
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-text-muted">
                    Garage
                  </th>
                  <th
                    className="text-center px-4 py-3 text-xs font-medium text-text-muted cursor-pointer hover:text-text-primary"
                    onClick={() => handleSort("value_score")}
                  >
                    <span className="flex items-center justify-center gap-1">
                      Value
                      <SortIcon field="value_score" active={sortField} dir={sortDir} />
                    </span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">
                    Features
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedPlans.map((plan, idx) => {
                  const isCompany = plan.source === "company";
                  const isTop = plan === topPlan;
                  const features: string[] = plan.key_features
                    ? JSON.parse(plan.key_features)
                    : [];

                  return (
                    <tr
                      key={plan.id}
                      className={`border-b border-border last:border-b-0 transition-colors ${
                        isCompany
                          ? "bg-accent-blue/5 hover:bg-accent-blue/10"
                          : "hover:bg-bg-secondary/50"
                      } ${isTop ? "ring-1 ring-inset ring-accent-emerald/30" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-bold ${
                            isTop
                              ? "text-accent-emerald"
                              : idx < 3
                                ? "text-accent-blue"
                                : "text-text-muted"
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isCompany ? (
                            <div className="w-6 h-6 rounded bg-accent-blue/20 flex items-center justify-center shrink-0">
                              <Building2 className="w-3.5 h-3.5 text-accent-blue" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded bg-bg-secondary flex items-center justify-center shrink-0">
                              <Home className="w-3.5 h-3.5 text-text-muted" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p
                                className={`text-sm font-medium truncate ${
                                  isCompany
                                    ? "text-accent-blue"
                                    : "text-text-primary"
                                }`}
                              >
                                {plan.model_name}
                              </p>
                              {isTop && (
                                <Star className="w-3.5 h-3.5 text-accent-emerald fill-accent-emerald shrink-0" />
                              )}
                              {plan.url && (
                                <a
                                  href={plan.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 text-text-muted hover:text-accent-blue print:hidden"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            <p className="text-xs text-text-muted truncate">
                              {isCompany ? (
                                <span className="text-accent-blue font-medium">
                                  Your Company
                                </span>
                              ) : (
                                plan.competitor_name || "Competitor"
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {plan.base_price ? (
                          <span className="font-medium text-text-primary">
                            ${plan.base_price.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {plan.sq_ft ? (
                          <span className="text-text-primary">
                            {plan.sq_ft.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {plan.price_per_sqft ? (
                          <span className="text-text-secondary">
                            ${plan.price_per_sqft}
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {plan.bedrooms ?? <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {plan.bathrooms ?? <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {plan.stories ?? <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {plan.garage_spaces ?? (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {plan.value_score ? (
                          <ValueBadge score={plan.value_score} />
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {features.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {features.slice(0, 3).map((f, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-1.5 py-0.5 bg-bg-secondary rounded text-text-muted"
                              >
                                {f}
                              </span>
                            ))}
                            {features.length > 3 && (
                              <span className="text-[10px] text-text-muted">
                                +{features.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-muted text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-xs text-text-muted print:hidden">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-accent-blue/20" />
            <span>Your company&apos;s plans (highlighted)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="w-3 h-3 text-accent-emerald fill-accent-emerald" />
            <span>Top ranked for current sort</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-accent-purple" />
            <span>AI-scored value (click &quot;AI Value Score&quot; to compute)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortIcon({
  field,
  active,
  dir,
}: {
  field: SortField;
  active: SortField;
  dir: SortDir;
}) {
  if (field !== active) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
  return dir === "asc" ? (
    <ArrowUp className="w-3 h-3" />
  ) : (
    <ArrowDown className="w-3 h-3" />
  );
}

function ValueBadge({ score }: { score: number }) {
  const color =
    score >= 8
      ? "bg-accent-emerald/20 text-accent-emerald"
      : score >= 6
        ? "bg-accent-blue/20 text-accent-blue"
        : score >= 4
          ? "bg-accent-amber/20 text-accent-amber"
          : "bg-accent-red/20 text-accent-red";

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${color}`}
    >
      {score.toFixed(1)}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof Home;
  color: string;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      <p className="text-lg font-bold text-text-primary">{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{sub}</p>
    </div>
  );
}

function getPriceRange(plans: FloorPlan[]): string {
  const prices = plans.filter((p) => p.base_price).map((p) => p.base_price!);
  if (prices.length === 0) return "N/A";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `$${min.toLocaleString()}`;
  return `$${(min / 1000).toFixed(0)}k – $${(max / 1000).toFixed(0)}k`;
}

function getSqFtRange(plans: FloorPlan[]): string {
  const sqfts = plans.filter((p) => p.sq_ft).map((p) => p.sq_ft!);
  if (sqfts.length === 0) return "N/A";
  const min = Math.min(...sqfts);
  const max = Math.max(...sqfts);
  if (min === max) return `${min.toLocaleString()} sqft`;
  return `${min.toLocaleString()} – ${max.toLocaleString()}`;
}

function getAvgPPSF(plans: FloorPlan[]): string {
  const ppsfs = plans.filter((p) => p.price_per_sqft).map((p) => p.price_per_sqft!);
  if (ppsfs.length === 0) return "N/A";
  const avg = ppsfs.reduce((a, b) => a + b, 0) / ppsfs.length;
  return `$${Math.round(avg)}/sqft`;
}
