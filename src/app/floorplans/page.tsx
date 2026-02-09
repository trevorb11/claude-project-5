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
  Globe,
  Check,
  AlertCircle,
  Upload,
  FileText,
  Download,
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

  const [showScanForm, setShowScanForm] = useState(false);
  const [scanUrl, setScanUrl] = useState("");
  const [scanBuilderName, setScanBuilderName] = useState("");
  const [scanSource, setScanSource] = useState<"company" | "competitor">("competitor");
  const [scanCompetitorId, setScanCompetitorId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<Array<{
    model_name: string;
    bedrooms: number | null;
    bathrooms: number | null;
    sq_ft: number | null;
    stories: number | null;
    garage_spaces: number | null;
    base_price: number | null;
    key_features: string[];
    url: string | null;
    selected: boolean;
  }> | null>(null);
  const [scanSources, setScanSources] = useState<Array<{ title: string; url: string }>>([]);
  const [scanError, setScanError] = useState("");
  const [importing, setImporting] = useState(false);

  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvSource, setCsvSource] = useState<"company" | "competitor">("company");
  const [csvCompetitorId, setCsvCompetitorId] = useState("");
  const [csvCompetitorName, setCsvCompetitorName] = useState("");
  const [csvPreviewing, setCsvPreviewing] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvPreview, setCsvPreview] = useState<Array<{
    model_name: string;
    bedrooms: number | null;
    bathrooms: number | null;
    sq_ft: number | null;
    stories: number | null;
    garage_spaces: number | null;
    base_price: number | null;
    price_per_sqft: number | null;
    key_features: string[];
    url: string | null;
  }> | null>(null);
  const [csvMatchedCols, setCsvMatchedCols] = useState<string[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvError, setCsvError] = useState("");

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

  const handleScan = async () => {
    if (!scanUrl.trim() || !scanBuilderName.trim()) return;
    setScanning(true);
    setScanError("");
    setScanResults(null);
    setScanSources([]);
    try {
      const res = await fetch("/api/floorplans/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: scanUrl.trim(),
          builder_name: scanBuilderName.trim(),
          source: scanSource,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScanError(data.error || "Scan failed");
        return;
      }
      if (data.message && (!data.plans || data.plans.length === 0)) {
        setScanError(data.message);
        if (data.sources) setScanSources(data.sources);
        return;
      }
      setScanResults(
        (data.plans || []).map((p: Record<string, unknown>) => ({
          ...p,
          key_features: Array.isArray(p.key_features) ? p.key_features : [],
          selected: true,
        }))
      );
      setScanSources(data.sources || []);
    } catch {
      setScanError("Failed to connect. Please try again.");
    } finally {
      setScanning(false);
    }
  };

  const handleImportScanned = async () => {
    if (!scanResults) return;
    const selected = scanResults.filter((p) => p.selected);
    if (selected.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch("/api/floorplans/scan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plans: selected.map(({ selected: _sel, ...rest }) => rest),
          source: scanSource,
          builder_name: scanBuilderName.trim(),
          competitor_id: scanSource === "competitor" ? scanCompetitorId || null : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.imported) {
          setPlans((prev) => [...(data.imported as FloorPlan[]), ...prev]);
        }
        setScanResults(null);
        setScanSources([]);
        setScanUrl("");
        setScanBuilderName("");
        setShowScanForm(false);
      }
    } catch {}
    setImporting(false);
  };

  const resetScan = () => {
    setShowScanForm(false);
    setScanUrl("");
    setScanBuilderName("");
    setScanSource("competitor");
    setScanCompetitorId("");
    setScanning(false);
    setScanResults(null);
    setScanSources([]);
    setScanError("");
  };

  const resetCsvUpload = () => {
    setShowCsvUpload(false);
    setCsvFile(null);
    setCsvSource("company");
    setCsvCompetitorId("");
    setCsvCompetitorName("");
    setCsvPreviewing(false);
    setCsvImporting(false);
    setCsvPreview(null);
    setCsvMatchedCols([]);
    setCsvErrors([]);
    setCsvError("");
  };

  const handleCsvPreview = async () => {
    if (!csvFile) return;
    setCsvPreviewing(true);
    setCsvError("");
    setCsvPreview(null);
    setCsvErrors([]);
    setCsvMatchedCols([]);
    try {
      const fd = new FormData();
      fd.append("file", csvFile);
      fd.append("mode", "preview");
      const res = await fetch("/api/floorplans/csv", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setCsvError(data.error || "Failed to parse CSV");
        return;
      }
      setCsvPreview(data.plans || []);
      setCsvMatchedCols(data.matched_columns || []);
      setCsvErrors(data.errors || []);
    } catch {
      setCsvError("Failed to parse CSV file");
    } finally {
      setCsvPreviewing(false);
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile || !csvPreview || csvPreview.length === 0) return;
    setCsvImporting(true);
    setCsvError("");
    try {
      const fd = new FormData();
      fd.append("file", csvFile);
      fd.append("mode", "import");
      fd.append("source", csvSource);
      if (csvSource === "competitor") {
        if (csvCompetitorId) fd.append("competitor_id", csvCompetitorId);
        if (csvCompetitorName) fd.append("competitor_name", csvCompetitorName);
      }
      const res = await fetch("/api/floorplans/csv", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setCsvError(data.error || "Import failed");
        return;
      }
      if (Array.isArray(data.plans)) {
        setPlans((prev) => [...(data.plans as FloorPlan[]), ...prev]);
      }
      resetCsvUpload();
    } catch {
      setCsvError("Import failed");
    } finally {
      setCsvImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const header = "model_name,bedrooms,bathrooms,sq_ft,stories,garage_spaces,base_price,key_features,url";
    const sample1 = 'The Oakwood,4,3,2850,2,3,425000,"Open floor plan;Quartz counters;Walk-in pantry",https://example.com/oakwood';
    const sample2 = 'The Maple,3,2.5,2200,2,2,375000,"Energy efficient;Smart home ready",';
    const csv = [header, sample1, sample2].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "floor_plans_template.csv";
    a.click();
    URL.revokeObjectURL(url);
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
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => {
                setForm({ ...EMPTY_FORM, source: "company" });
                setShowAddForm(true);
                setShowScanForm(false);
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
                setShowScanForm(false);
              }}
              className="px-4 py-2.5 bg-bg-card border border-border hover:bg-bg-secondary rounded-lg text-text-primary text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Competitor Plans
            </button>
            <button
              onClick={() => {
                setShowScanForm(true);
                setShowAddForm(false);
                resetCsvUpload();
              }}
              className="px-4 py-2.5 bg-accent-cyan hover:bg-accent-cyan/80 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Globe className="w-4 h-4" />
              Scan Website
            </button>
            <button
              onClick={() => {
                setShowCsvUpload(true);
                setShowAddForm(false);
                resetScan();
              }}
              className="px-4 py-2.5 bg-bg-card border border-border hover:bg-bg-secondary rounded-lg text-text-primary text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload CSV
            </button>
          </div>
        </div>

        {showCsvUpload && (
          <CsvUploadPanel
            csvFile={csvFile}
            setCsvFile={setCsvFile}
            csvSource={csvSource}
            setCsvSource={setCsvSource}
            csvCompetitorId={csvCompetitorId}
            setCsvCompetitorId={setCsvCompetitorId}
            csvCompetitorName={csvCompetitorName}
            setCsvCompetitorName={setCsvCompetitorName}
            competitors={competitors}
            csvPreviewing={csvPreviewing}
            csvImporting={csvImporting}
            csvPreview={csvPreview}
            csvMatchedCols={csvMatchedCols}
            csvErrors={csvErrors}
            csvError={csvError}
            onPreview={handleCsvPreview}
            onImport={handleCsvImport}
            onDownloadTemplate={handleDownloadTemplate}
            onClose={resetCsvUpload}
          />
        )}

        {showScanForm && (
          <ScanWebsitePanel
            scanUrl={scanUrl}
            setScanUrl={setScanUrl}
            scanBuilderName={scanBuilderName}
            setScanBuilderName={setScanBuilderName}
            scanSource={scanSource}
            setScanSource={setScanSource}
            scanCompetitorId={scanCompetitorId}
            setScanCompetitorId={setScanCompetitorId}
            competitors={competitors}
            scanning={scanning}
            scanResults={scanResults}
            setScanResults={setScanResults}
            scanSources={scanSources}
            scanError={scanError}
            importing={importing}
            onScan={handleScan}
            onImport={handleImportScanned}
            onClose={resetScan}
          />
        )}

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
                if (!showAddForm) resetScan();
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
              onClick={() => {
                setShowScanForm(!showScanForm);
                if (!showScanForm) { setShowAddForm(false); resetCsvUpload(); }
                if (showScanForm) resetScan();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                showScanForm
                  ? "bg-bg-secondary border border-border text-text-secondary hover:bg-bg-card"
                  : "bg-accent-cyan hover:bg-accent-cyan/80 text-white"
              }`}
            >
              {showScanForm ? (
                <>
                  <X className="w-4 h-4" />
                  Cancel Scan
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  Scan Website
                </>
              )}
            </button>
            <button
              onClick={() => {
                if (showCsvUpload) {
                  resetCsvUpload();
                } else {
                  setShowCsvUpload(true);
                  setShowAddForm(false);
                  resetScan();
                }
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                showCsvUpload
                  ? "bg-bg-secondary border border-border text-text-secondary hover:bg-bg-card"
                  : "bg-bg-card border border-border text-text-primary hover:bg-bg-secondary"
              }`}
            >
              {showCsvUpload ? (
                <>
                  <X className="w-4 h-4" />
                  Cancel CSV
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload CSV
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

        {/* CSV Upload Panel */}
        {showCsvUpload && (
          <CsvUploadPanel
            csvFile={csvFile}
            setCsvFile={setCsvFile}
            csvSource={csvSource}
            setCsvSource={setCsvSource}
            csvCompetitorId={csvCompetitorId}
            setCsvCompetitorId={setCsvCompetitorId}
            csvCompetitorName={csvCompetitorName}
            setCsvCompetitorName={setCsvCompetitorName}
            competitors={competitors}
            csvPreviewing={csvPreviewing}
            csvImporting={csvImporting}
            csvPreview={csvPreview}
            csvMatchedCols={csvMatchedCols}
            csvErrors={csvErrors}
            csvError={csvError}
            onPreview={handleCsvPreview}
            onImport={handleCsvImport}
            onDownloadTemplate={handleDownloadTemplate}
            onClose={resetCsvUpload}
          />
        )}

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

        {/* Scan Website Form */}
        {showScanForm && (
          <ScanWebsitePanel
            scanUrl={scanUrl}
            setScanUrl={setScanUrl}
            scanBuilderName={scanBuilderName}
            setScanBuilderName={setScanBuilderName}
            scanSource={scanSource}
            setScanSource={setScanSource}
            scanCompetitorId={scanCompetitorId}
            setScanCompetitorId={setScanCompetitorId}
            competitors={competitors}
            scanning={scanning}
            scanResults={scanResults}
            setScanResults={setScanResults}
            scanSources={scanSources}
            scanError={scanError}
            importing={importing}
            onScan={handleScan}
            onImport={handleImportScanned}
            onClose={resetScan}
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

function CsvUploadPanel({
  csvFile,
  setCsvFile,
  csvSource,
  setCsvSource,
  csvCompetitorId,
  setCsvCompetitorId,
  csvCompetitorName,
  setCsvCompetitorName,
  competitors,
  csvPreviewing,
  csvImporting,
  csvPreview,
  csvMatchedCols,
  csvErrors,
  csvError,
  onPreview,
  onImport,
  onDownloadTemplate,
  onClose,
}: {
  csvFile: File | null;
  setCsvFile: Dispatch<SetStateAction<File | null>>;
  csvSource: "company" | "competitor";
  setCsvSource: Dispatch<SetStateAction<"company" | "competitor">>;
  csvCompetitorId: string;
  setCsvCompetitorId: Dispatch<SetStateAction<string>>;
  csvCompetitorName: string;
  setCsvCompetitorName: Dispatch<SetStateAction<string>>;
  competitors: Competitor[];
  csvPreviewing: boolean;
  csvImporting: boolean;
  csvPreview: Array<{
    model_name: string;
    bedrooms: number | null;
    bathrooms: number | null;
    sq_ft: number | null;
    stories: number | null;
    garage_spaces: number | null;
    base_price: number | null;
    price_per_sqft: number | null;
    key_features: string[];
    url: string | null;
  }> | null;
  csvMatchedCols: string[];
  csvErrors: string[];
  csvError: string;
  onPreview: () => void;
  onImport: () => void;
  onDownloadTemplate: () => void;
  onClose: () => void;
}) {
  return (
    <div className="mb-6 bg-bg-card rounded-xl border border-border p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-accent-blue" />
          <h3 className="font-semibold text-sm">Upload Floor Plans from CSV</h3>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            These plans belong to:
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setCsvSource("company")}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                csvSource === "company"
                  ? "bg-accent-blue/15 text-accent-blue border border-accent-blue/30"
                  : "bg-bg-secondary border border-border text-text-secondary hover:bg-bg-card"
              }`}
            >
              Our Company
            </button>
            <button
              onClick={() => setCsvSource("competitor")}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                csvSource === "competitor"
                  ? "bg-accent-orange/15 text-accent-orange border border-accent-orange/30"
                  : "bg-bg-secondary border border-border text-text-secondary hover:bg-bg-card"
              }`}
            >
              A Competitor
            </button>
          </div>
        </div>

        {csvSource === "competitor" && (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Competitor
            </label>
            {competitors.length > 0 ? (
              <select
                value={csvCompetitorId}
                onChange={(e) => {
                  setCsvCompetitorId(e.target.value);
                  const comp = competitors.find((c) => c.id === e.target.value);
                  setCsvCompetitorName(comp?.name || "");
                }}
                className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm"
              >
                <option value="">Select competitor...</option>
                {competitors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={csvCompetitorName}
                onChange={(e) => setCsvCompetitorName(e.target.value)}
                placeholder="Competitor name"
                className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm"
              />
            )}
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <label className="block text-xs font-medium text-text-secondary">CSV File</label>
          <button
            onClick={onDownloadTemplate}
            className="text-xs text-accent-blue hover:underline flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            Download template
          </button>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex-1 flex items-center gap-3 px-4 py-3 bg-bg-secondary border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-accent-blue/40 transition-colors">
            <FileText className="w-5 h-5 text-text-muted" />
            <span className="text-sm text-text-secondary">
              {csvFile ? csvFile.name : "Choose a .csv file..."}
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setCsvFile(f);
              }}
            />
          </label>
          <button
            onClick={onPreview}
            disabled={!csvFile || csvPreviewing}
            className="px-4 py-2.5 bg-accent-blue hover:bg-accent-blue/80 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
          >
            {csvPreviewing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Preview
              </>
            )}
          </button>
        </div>
        <p className="text-[11px] text-text-muted mt-1.5">
          Columns: model_name (required), bedrooms, bathrooms, sq_ft, stories, garage_spaces, base_price, key_features (semicolon-separated), url
        </p>
      </div>

      {csvError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{csvError}</span>
        </div>
      )}

      {csvErrors.length > 0 && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          <p className="font-medium mb-1">Warnings:</p>
          {csvErrors.map((e, i) => (
            <p key={i} className="text-xs">{e}</p>
          ))}
        </div>
      )}

      {csvMatchedCols.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-text-muted">Matched columns:</span>
          {csvMatchedCols.map((col) => (
            <span
              key={col}
              className="px-2 py-0.5 bg-accent-emerald/10 text-accent-emerald text-xs rounded-full border border-accent-emerald/20"
            >
              {col.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}

      {csvPreview && csvPreview.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">
              Preview ({csvPreview.length} plan{csvPreview.length !== 1 ? "s" : ""} found)
            </h4>
            <button
              onClick={onImport}
              disabled={csvImporting || (csvSource === "competitor" && !csvCompetitorId && !csvCompetitorName)}
              className="px-4 py-2 bg-accent-emerald hover:bg-accent-emerald/80 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              {csvImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Import {csvPreview.length} Plans
                </>
              )}
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg-secondary/50 border-b border-border">
                  <th className="text-left px-3 py-2 text-xs font-medium text-text-muted">#</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-text-muted">Model</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-text-muted">Price</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-text-muted">Sq Ft</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-text-muted">$/SqFt</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-text-muted">Bed</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-text-muted">Bath</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-text-muted">Stories</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-text-muted">Garage</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-text-muted">Features</th>
                </tr>
              </thead>
              <tbody>
                {csvPreview.map((plan, idx) => (
                  <tr key={idx} className="border-b border-border last:border-b-0 hover:bg-bg-secondary/30">
                    <td className="px-3 py-2 text-text-muted text-xs">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium">{plan.model_name}</td>
                    <td className="px-3 py-2 text-right">
                      {plan.base_price ? `$${plan.base_price.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {plan.sq_ft ? plan.sq_ft.toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {plan.price_per_sqft ? `$${plan.price_per_sqft}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">{plan.bedrooms ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{plan.bathrooms ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{plan.stories ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{plan.garage_spaces ?? "—"}</td>
                    <td className="px-3 py-2">
                      {plan.key_features.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {plan.key_features.slice(0, 3).map((f, fi) => (
                            <span
                              key={fi}
                              className="px-1.5 py-0.5 bg-bg-secondary rounded text-[10px] text-text-secondary"
                            >
                              {f}
                            </span>
                          ))}
                          {plan.key_features.length > 3 && (
                            <span className="text-[10px] text-text-muted">
                              +{plan.key_features.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {csvPreview && csvPreview.length === 0 && (
        <div className="text-center py-6 text-text-muted text-sm">
          No valid floor plans found in the CSV file.
        </div>
      )}
    </div>
  );
}

function ScanWebsitePanel({
  scanUrl,
  setScanUrl,
  scanBuilderName,
  setScanBuilderName,
  scanSource,
  setScanSource,
  scanCompetitorId,
  setScanCompetitorId,
  competitors,
  scanning,
  scanResults,
  setScanResults,
  scanSources,
  scanError,
  importing,
  onScan,
  onImport,
  onClose,
}: {
  scanUrl: string;
  setScanUrl: (v: string) => void;
  scanBuilderName: string;
  setScanBuilderName: (v: string) => void;
  scanSource: "company" | "competitor";
  setScanSource: (v: "company" | "competitor") => void;
  scanCompetitorId: string;
  setScanCompetitorId: (v: string) => void;
  competitors: Competitor[];
  scanning: boolean;
  scanResults: Array<{
    model_name: string;
    bedrooms: number | null;
    bathrooms: number | null;
    sq_ft: number | null;
    stories: number | null;
    garage_spaces: number | null;
    base_price: number | null;
    key_features: string[];
    url: string | null;
    selected: boolean;
  }> | null;
  setScanResults: Dispatch<SetStateAction<typeof scanResults>>;
  scanSources: Array<{ title: string; url: string }>;
  scanError: string;
  importing: boolean;
  onScan: () => void;
  onImport: () => void;
  onClose: () => void;
}) {
  const selectedCount = scanResults?.filter((p) => p.selected).length ?? 0;

  return (
    <div className="bg-bg-card border border-accent-blue/30 rounded-xl p-5 mb-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Globe className="w-4 h-4 text-accent-blue" />
          Scan Website for Floor Plans
        </h3>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-text-secondary mb-4">
        Enter a builder&apos;s website URL and the AI will search for all available floor plans, model homes, and specs. You can then review and pick which ones to import.
      </p>

      {/* Source Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-text-muted">These plans belong to:</span>
        <button
          onClick={() => setScanSource("company")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            scanSource === "company"
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
          onClick={() => setScanSource("competitor")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            scanSource === "competitor"
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

      {/* Competitor selector for competitor source */}
      {scanSource === "competitor" && competitors.length > 0 && (
        <div className="mb-4">
          <label className="block text-xs text-text-muted mb-1">Link to existing competitor (optional)</label>
          <select
            value={scanCompetitorId}
            onChange={(e) => {
              setScanCompetitorId(e.target.value);
              const comp = competitors.find((c) => c.id === e.target.value);
              if (comp) {
                setScanBuilderName(comp.name);
                if (comp.website) setScanUrl(comp.website);
              }
            }}
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
          >
            <option value="">— None (custom name) —</option>
            {competitors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.website ? `(${c.website.replace(/^https?:\/\//, "")})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* URL and builder name inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="md:col-span-2">
          <label className="block text-xs text-text-muted mb-1">
            Website URL <span className="text-accent-red">*</span>
          </label>
          <input
            type="url"
            value={scanUrl}
            onChange={(e) => setScanUrl(e.target.value)}
            placeholder="https://www.builderwebsite.com/floor-plans"
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
          />
          <p className="text-[10px] text-text-muted mt-1">Tip: Use the builder&apos;s floor plans page URL for best results</p>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">
            Builder Name <span className="text-accent-red">*</span>
          </label>
          <input
            type="text"
            value={scanBuilderName}
            onChange={(e) => setScanBuilderName(e.target.value)}
            placeholder="e.g. Perry Homes"
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
          />
        </div>
      </div>

      {/* Scan Button */}
      {!scanResults && (
        <div className="flex items-center gap-3">
          <button
            onClick={onScan}
            disabled={scanning || !scanUrl.trim() || !scanBuilderName.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-cyan hover:bg-accent-cyan/80 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
          >
            {scanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scanning website...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                Scan for Floor Plans
              </>
            )}
          </button>
          {scanning && (
            <span className="text-xs text-text-muted">
              This may take 15-30 seconds while the AI searches the website...
            </span>
          )}
        </div>
      )}

      {/* Error message */}
      {scanError && (
        <div className="mt-4 p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-accent-red shrink-0 mt-0.5" />
          <p className="text-sm text-accent-red">{scanError}</p>
        </div>
      )}

      {/* Scan Results */}
      {scanResults && scanResults.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-accent-emerald" />
              Found {scanResults.length} floor plan{scanResults.length !== 1 ? "s" : ""}
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setScanResults((prev) =>
                    prev ? prev.map((p) => ({ ...p, selected: true })) : prev
                  )
                }
                className="text-xs text-accent-blue hover:underline"
              >
                Select All
              </button>
              <span className="text-text-muted text-xs">|</span>
              <button
                onClick={() =>
                  setScanResults((prev) =>
                    prev ? prev.map((p) => ({ ...p, selected: false })) : prev
                  )
                }
                className="text-xs text-text-secondary hover:underline"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden mb-4">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg-secondary sticky top-0">
                  <tr className="text-left text-xs text-text-muted">
                    <th className="px-3 py-2 w-8"></th>
                    <th className="px-3 py-2">Model</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-right">Sq Ft</th>
                    <th className="px-3 py-2 text-center">Bed</th>
                    <th className="px-3 py-2 text-center">Bath</th>
                    <th className="px-3 py-2 text-center">Stories</th>
                    <th className="px-3 py-2 text-center">Garage</th>
                    <th className="px-3 py-2">Features</th>
                  </tr>
                </thead>
                <tbody>
                  {scanResults.map((plan, idx) => (
                    <tr
                      key={idx}
                      className={`border-t border-border transition-colors ${
                        plan.selected ? "bg-accent-blue/5" : "opacity-50"
                      }`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={plan.selected}
                          onChange={() =>
                            setScanResults((prev) =>
                              prev
                                ? prev.map((p, i) =>
                                    i === idx ? { ...p, selected: !p.selected } : p
                                  )
                                : prev
                            )
                          }
                          className="rounded border-border"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">
                        <div className="flex items-center gap-1">
                          {plan.model_name}
                          {plan.url && (
                            <a
                              href={plan.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent-blue hover:text-accent-blue/80"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {plan.base_price ? `$${plan.base_price.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {plan.sq_ft ? plan.sq_ft.toLocaleString() : "—"}
                      </td>
                      <td className="px-3 py-2 text-center">{plan.bedrooms ?? "—"}</td>
                      <td className="px-3 py-2 text-center">{plan.bathrooms ?? "—"}</td>
                      <td className="px-3 py-2 text-center">{plan.stories ?? "—"}</td>
                      <td className="px-3 py-2 text-center">{plan.garage_spaces ?? "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {plan.key_features.slice(0, 3).map((f, fi) => (
                            <span
                              key={fi}
                              className="text-[10px] px-1.5 py-0.5 bg-bg-secondary rounded text-text-muted"
                            >
                              {f}
                            </span>
                          ))}
                          {plan.key_features.length > 3 && (
                            <span className="text-[10px] text-text-muted">
                              +{plan.key_features.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sources */}
          {scanSources.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-text-muted mb-1">Sources found:</p>
              <div className="flex flex-wrap gap-2">
                {scanSources.slice(0, 5).map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] px-2 py-1 bg-bg-secondary rounded-lg text-accent-blue hover:bg-accent-blue/10 transition-colors flex items-center gap-1 max-w-[200px] truncate"
                  >
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    {s.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Import button */}
          <div className="flex items-center gap-3">
            <button
              onClick={onImport}
              disabled={importing || selectedCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent-emerald hover:bg-accent-emerald/80 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Import {selectedCount} Plan{selectedCount !== 1 ? "s" : ""}
                </>
              )}
            </button>
            <button
              onClick={onScan}
              disabled={scanning}
              className="flex items-center gap-2 px-4 py-2.5 bg-bg-secondary border border-border hover:bg-bg-card rounded-lg text-text-secondary text-sm font-medium transition-colors"
            >
              <Globe className="w-4 h-4" />
              Re-scan
            </button>
          </div>
        </div>
      )}
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
