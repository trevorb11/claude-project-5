"use client";

import { useEffect, useState, useMemo, type Dispatch, type SetStateAction } from "react";
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
  Plus,
  X,
  Trash2,
  Search,
  ChevronDown,
} from "lucide-react";
import { FloorPlan, Competitor } from "@/lib/types";

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

const EMPTY_FORM = {
  source: "company" as "company" | "competitor",
  competitor_id: "",
  competitor_name: "",
  model_name: "",
  bedrooms: "",
  bathrooms: "",
  sq_ft: "",
  stories: "",
  garage_spaces: "",
  base_price: "",
  key_features: "",
  url: "",
};

export default function FloorPlansPage() {
  const [plans, setPlans] = useState<FloorPlan[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("value_score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [scoring, setScoring] = useState(false);
  const [filterSource, setFilterSource] = useState<"all" | "company" | "competitor">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [competitorSearch, setCompetitorSearch] = useState("");
  const [showCompetitorDropdown, setShowCompetitorDropdown] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/floorplans").then((r) => r.json()),
      fetch("/api/competitors").then((r) => r.json()),
    ]).then(([planData, compData]) => {
      if (Array.isArray(planData)) setPlans(planData);
      if (Array.isArray(compData)) setCompetitors(compData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleScore = async () => {
    setScoring(true);
    try {
      await fetch("/api/floorplans/score", { method: "POST" });
      const res = await fetch("/api/floorplans");
      const data = await res.json();
      if (Array.isArray(data)) setPlans(data);
    } catch {}
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

  const handleAddPlan = async () => {
    if (!form.model_name.trim()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        source: form.source,
        model_name: form.model_name.trim(),
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        sq_ft: form.sq_ft ? Number(form.sq_ft) : null,
        stories: form.stories ? Number(form.stories) : null,
        garage_spaces: form.garage_spaces ? Number(form.garage_spaces) : null,
        base_price: form.base_price ? Number(form.base_price) : null,
        key_features: form.key_features ? form.key_features.split(",").map((f) => f.trim()).filter(Boolean) : [],
        url: form.url.trim() || null,
      };
      if (form.source === "competitor") {
        payload.competitor_id = form.competitor_id || null;
        payload.competitor_name = form.competitor_name || competitorSearch.trim() || null;
      }
      const res = await fetch("/api/floorplans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newPlan = await res.json();
        setPlans((prev) => [newPlan, ...prev]);
        setForm({ ...EMPTY_FORM });
        setCompetitorSearch("");
        setShowAddForm(false);
      }
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/floorplans?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setPlans((prev) => prev.filter((p) => p.id !== id));
      }
    } catch {}
    setDeletingId(null);
  };

  const selectCompetitor = (comp: Competitor) => {
    setForm((prev) => ({
      ...prev,
      source: "competitor",
      competitor_id: comp.id,
      competitor_name: comp.name,
    }));
    setCompetitorSearch(comp.name);
    setShowCompetitorDropdown(false);
  };

  const filteredCompetitors = competitors.filter((c) =>
    c.name.toLowerCase().includes(competitorSearch.toLowerCase())
  );

  const filteredPlans = useMemo(() => {
    if (filterSource === "all") return plans;
    return plans.filter((p) => p.source === filterSource);
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

  const companyPlans = plans.filter((p) => p.source === "company");
  const competitorPlans = plans.filter((p) => p.source === "competitor");
  const competitorNames = [...new Set(competitorPlans.map((p) => p.competitor_name).filter(Boolean))];

  const topPlan = sortedPlans[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-text-muted">Loading floor plans...</span>
      </div>
    );
  }

  if (plans.length === 0 && !showAddForm) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-fade-in text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-accent-emerald/20 flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-accent-emerald" />
          </div>
          <h1 className="text-xl font-bold mb-2">Floor Plan Comparison</h1>
          <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
            No floor plans found yet. Add your company&apos;s floor plans or
            competitor plans to start comparing.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setForm({ ...EMPTY_FORM, source: "company" });
                setShowAddForm(true);
              }}
              className="px-4 py-2.5 bg-accent-emerald hover:bg-accent-emerald/80 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Your Floor Plans
            </button>
            <button
              onClick={() => {
                setForm({ ...EMPTY_FORM, source: "competitor" });
                setShowAddForm(true);
              }}
              className="px-4 py-2.5 bg-bg-card border border-border hover:bg-bg-secondary rounded-lg text-text-primary text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Competitor Plans
            </button>
          </div>
        </div>

        {showAddForm && (
          <AddFloorPlanForm
            form={form}
            setForm={setForm}
            competitorSearch={competitorSearch}
            setCompetitorSearch={setCompetitorSearch}
            showCompetitorDropdown={showCompetitorDropdown}
            setShowCompetitorDropdown={setShowCompetitorDropdown}
            filteredCompetitors={filteredCompetitors}
            selectCompetitor={selectCompetitor}
            saving={saving}
            onSave={handleAddPlan}
            onClose={() => { setShowAddForm(false); setForm({ ...EMPTY_FORM }); setCompetitorSearch(""); }}
          />
        )}
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
              onClick={() => {
                setForm({ ...EMPTY_FORM });
                setCompetitorSearch("");
                setShowAddForm(!showAddForm);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                showAddForm
                  ? "bg-bg-secondary border border-border text-text-secondary hover:bg-bg-card"
                  : "bg-accent-emerald hover:bg-accent-emerald/80 text-white"
              }`}
            >
              {showAddForm ? (
                <>
                  <X className="w-4 h-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Plan
                </>
              )}
            </button>
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

        {/* Add Plan Form */}
        {showAddForm && (
          <AddFloorPlanForm
            form={form}
            setForm={setForm}
            competitorSearch={competitorSearch}
            setCompetitorSearch={setCompetitorSearch}
            showCompetitorDropdown={showCompetitorDropdown}
            setShowCompetitorDropdown={setShowCompetitorDropdown}
            filteredCompetitors={filteredCompetitors}
            selectCompetitor={selectCompetitor}
            saving={saving}
            onSave={handleAddPlan}
            onClose={() => { setShowAddForm(false); setForm({ ...EMPTY_FORM }); setCompetitorSearch(""); }}
          />
        )}

        {/* Summary Cards */}
        {plans.length > 0 && (
          <>
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
                      <th className="px-4 py-3 text-xs font-medium text-text-muted w-10 print:hidden" />
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
                          <td className="px-4 py-3 print:hidden">
                            <button
                              onClick={() => handleDelete(plan.id)}
                              disabled={deletingId === plan.id}
                              className="text-text-muted hover:text-accent-red transition-colors disabled:opacity-50"
                              title="Remove plan"
                            >
                              {deletingId === plan.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
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
          </>
        )}
      </div>
    </div>
  );
}

function AddFloorPlanForm({
  form,
  setForm,
  competitorSearch,
  setCompetitorSearch,
  showCompetitorDropdown,
  setShowCompetitorDropdown,
  filteredCompetitors,
  selectCompetitor,
  saving,
  onSave,
  onClose,
}: {
  form: typeof EMPTY_FORM;
  setForm: Dispatch<SetStateAction<typeof EMPTY_FORM>>;
  competitorSearch: string;
  setCompetitorSearch: (v: string) => void;
  showCompetitorDropdown: boolean;
  setShowCompetitorDropdown: (v: boolean) => void;
  filteredCompetitors: Competitor[];
  selectCompetitor: (c: Competitor) => void;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-5 mb-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4 text-accent-emerald" />
          Add Floor Plan
        </h3>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Source Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-text-muted">This plan belongs to:</span>
        <button
          onClick={() => {
            setForm((prev) => ({ ...prev, source: "company", competitor_id: "", competitor_name: "" }));
            setCompetitorSearch("");
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            form.source === "company"
              ? "bg-accent-blue/15 text-accent-blue border border-accent-blue/30"
              : "bg-bg-secondary border border-border text-text-secondary hover:bg-bg-card"
          }`}
        >
          <span className="flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            Your Company
          </span>
        </button>
        <button
          onClick={() => setForm((prev) => ({ ...prev, source: "competitor" }))}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            form.source === "competitor"
              ? "bg-accent-orange/15 text-accent-orange border border-accent-orange/30"
              : "bg-bg-secondary border border-border text-text-secondary hover:bg-bg-card"
          }`}
        >
          <span className="flex items-center gap-1">
            <Home className="w-3 h-3" />
            Competitor
          </span>
        </button>
      </div>

      {/* Competitor Selector */}
      {form.source === "competitor" && (
        <div className="mb-4 relative">
          <label className="block text-xs text-text-muted mb-1">Competitor</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              value={competitorSearch}
              onChange={(e) => {
                setCompetitorSearch(e.target.value);
                setShowCompetitorDropdown(true);
                if (!e.target.value) {
                  setForm((prev) => ({ ...prev, competitor_id: "", competitor_name: "" }));
                }
              }}
              onFocus={() => setShowCompetitorDropdown(true)}
              placeholder="Search or type competitor name..."
              className="w-full pl-9 pr-8 py-2 bg-bg-secondary border border-border rounded-lg text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
            />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          </div>
          {showCompetitorDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredCompetitors.length > 0 ? (
                filteredCompetitors.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectCompetitor(c)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-bg-secondary transition-colors flex items-center gap-2"
                  >
                    <Home className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    <span className="truncate">{c.name}</span>
                    {c.website && (
                      <span className="text-xs text-text-muted truncate ml-auto">
                        {c.website.replace(/^https?:\/\//, "")}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-text-muted">
                  {competitorSearch
                    ? "No matching competitors. The name you typed will be used."
                    : "No competitors added yet."}
                </div>
              )}
              {competitorSearch && !filteredCompetitors.some((c) => c.name.toLowerCase() === competitorSearch.toLowerCase()) && (
                <button
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      competitor_id: "",
                      competitor_name: competitorSearch.trim(),
                    }));
                    setShowCompetitorDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-bg-secondary transition-colors border-t border-border flex items-center gap-2 text-accent-blue"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  Use &quot;{competitorSearch}&quot; as competitor name
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Plan Details Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="col-span-2">
          <label className="block text-xs text-text-muted mb-1">
            Model Name <span className="text-accent-red">*</span>
          </label>
          <input
            type="text"
            value={form.model_name}
            onChange={(e) => setForm((prev) => ({ ...prev, model_name: e.target.value }))}
            placeholder="e.g. The Oakmont 2450"
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Base Price ($)</label>
          <input
            type="number"
            value={form.base_price}
            onChange={(e) => setForm((prev) => ({ ...prev, base_price: e.target.value }))}
            placeholder="350000"
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Sq Ft</label>
          <input
            type="number"
            value={form.sq_ft}
            onChange={(e) => setForm((prev) => ({ ...prev, sq_ft: e.target.value }))}
            placeholder="2450"
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Bedrooms</label>
          <input
            type="number"
            value={form.bedrooms}
            onChange={(e) => setForm((prev) => ({ ...prev, bedrooms: e.target.value }))}
            placeholder="4"
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Bathrooms</label>
          <input
            type="number"
            step="0.5"
            value={form.bathrooms}
            onChange={(e) => setForm((prev) => ({ ...prev, bathrooms: e.target.value }))}
            placeholder="3"
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Stories</label>
          <input
            type="number"
            value={form.stories}
            onChange={(e) => setForm((prev) => ({ ...prev, stories: e.target.value }))}
            placeholder="2"
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Garage Spaces</label>
          <input
            type="number"
            value={form.garage_spaces}
            onChange={(e) => setForm((prev) => ({ ...prev, garage_spaces: e.target.value }))}
            placeholder="2"
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs text-text-muted mb-1">Key Features (comma-separated)</label>
          <input
            type="text"
            value={form.key_features}
            onChange={(e) => setForm((prev) => ({ ...prev, key_features: e.target.value }))}
            placeholder="Open concept, Granite counters, Smart home ready"
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">URL (optional)</label>
          <input
            type="url"
            value={form.url}
            onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
            placeholder="https://example.com/floorplan"
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving || !form.model_name.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-accent-emerald hover:bg-accent-emerald/80 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Add Plan
            </>
          )}
        </button>
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
