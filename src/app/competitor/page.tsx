"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Crosshair,
  Search,
  Globe,
  Clock,
  Trash2,
  Play,
  Loader2,
  X,
  Building2,
  Star,
} from "lucide-react";
import { Competitor, CaseFile } from "@/lib/types";

const COMPETITOR_COLORS = [
  { bg: "rgba(232, 112, 42, 0.08)", border: "#e8702a", text: "#c45a1f", dot: "#e8702a" },
  { bg: "rgba(139, 92, 246, 0.08)", border: "#8b5cf6", text: "#7c3aed", dot: "#8b5cf6" },
  { bg: "rgba(91, 168, 160, 0.08)", border: "#5ba8a0", text: "#3d8b83", dot: "#5ba8a0" },
  { bg: "rgba(234, 88, 12, 0.08)", border: "#ea580c", text: "#c2410c", dot: "#ea580c" },
  { bg: "rgba(16, 185, 129, 0.08)", border: "#10b981", text: "#059669", dot: "#10b981" },
  { bg: "rgba(244, 63, 94, 0.08)", border: "#f43f5e", text: "#e11d48", dot: "#f43f5e" },
  { bg: "rgba(245, 158, 11, 0.08)", border: "#f59e0b", text: "#d97706", dot: "#f59e0b" },
  { bg: "rgba(6, 182, 212, 0.08)", border: "#06b6d4", text: "#0891b2", dot: "#06b6d4" },
];

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [caseFiles, setCaseFiles] = useState<CaseFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newSchedule, setNewSchedule] = useState("manual");
  const [adding, setAdding] = useState(false);
  const [researchingId, setResearchingId] = useState<string | null>(null);

  const ownCompany = competitors.find((c) => c.is_own_company === 1);
  const regularCompetitors = competitors.filter((c) => c.is_own_company !== 1);
  const ownCompanyCaseFile = ownCompany
    ? caseFiles.find((f) => f.competitor_id === ownCompany.id && f.status === "completed")
    : null;

  const fetchData = () => {
    Promise.all([
      fetch("/api/competitors").then((r) => r.json()),
      fetch("/api/research").then((r) => r.json()),
    ]).then(([comps, files]) => {
      setCompetitors(comps);
      setCaseFiles(files);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addCompetitor = async () => {
    if (!newName.trim()) return;
    setAdding(true);

    const res = await fetch("/api/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        website: newWebsite || null,
        notes: newNotes || null,
        research_schedule: newSchedule,
      }),
    });

    if (res.ok) {
      setNewName("");
      setNewWebsite("");
      setNewNotes("");
      setNewSchedule("manual");
      setShowAdd(false);
      fetchData();
    }
    setAdding(false);
  };

  const deleteCompetitor = async (id: string) => {
    if (!confirm("Delete this competitor and all associated case files?")) return;
    await fetch(`/api/competitors?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  const launchResearch = async (competitor: Competitor) => {
    setResearchingId(competitor.id);
    try {
      await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitor_id: competitor.id }),
      });
      fetchData();
    } finally {
      setResearchingId(null);
    }
  };

  const getFilesForCompetitor = (id: string) =>
    caseFiles.filter((f) => f.competitor_id === id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-text-muted">Loading competitors...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crosshair className="w-6 h-6 text-accent-blue" />
            Case Files
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Track competitors and build intelligence dossiers
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-amber hover:bg-accent-amber/90 rounded-lg text-white text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Competitor
        </button>
      </div>

      {/* Add Competitor Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">New Competitor</h2>
              <button
                onClick={() => setShowAdd(false)}
                className="text-text-muted hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent-blue/50"
                  placeholder="e.g., Rival Corp"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">
                  Website
                </label>
                <input
                  type="text"
                  className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent-blue/50"
                  placeholder="https://rivalcorp.com"
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">
                  Notes
                </label>
                <textarea
                  className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent-blue/50 resize-none"
                  rows={2}
                  placeholder="Any context about this competitor..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">
                  Research Schedule
                </label>
                <select
                  className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent-blue/50"
                  value={newSchedule}
                  onChange={(e) => setNewSchedule(e.target.value)}
                >
                  <option value="manual">Manual Only</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addCompetitor}
                  disabled={!newName.trim() || adding}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-amber hover:bg-accent-amber/90 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  {adding ? "Adding..." : "Add Competitor"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Your Company Card */}
      {ownCompany && ownCompanyCaseFile && (
        <div className="mb-6 animate-fade-in">
          <div className="bg-gradient-to-r from-accent-blue/5 to-accent-cyan/5 border-2 border-accent-blue/30 rounded-xl p-5">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-blue/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-accent-blue" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/competitor/${ownCompany.id}`}
                      className="text-lg font-semibold hover:text-accent-blue transition-colors"
                    >
                      {ownCompany.name}
                    </Link>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-accent-blue/20 text-accent-blue tracking-wider">
                      Your Company
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    Self-assessment case file &middot; Last updated:{" "}
                    {ownCompany.last_researched
                      ? new Date(ownCompany.last_researched).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>
              <Link
                href={`/competitor/${ownCompany.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue/20 text-accent-blue rounded-lg text-xs font-medium hover:bg-accent-blue/30 transition-colors"
              >
                <Search className="w-3 h-3" />
                View Case File
              </Link>
            </div>
            {ownCompanyCaseFile.summary && (
              <p className="text-xs text-text-secondary mt-3 line-clamp-2 pl-[52px]">
                {ownCompanyCaseFile.summary}
              </p>
            )}
          </div>
        </div>
      )}

      {!ownCompany && (
        <div className="mb-6 animate-fade-in">
          <div className="bg-bg-card border border-dashed border-accent-blue/30 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-accent-blue/50" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">
                  Run deep research on your own company
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  Go to{" "}
                  <Link href="/setup" className="text-accent-blue hover:underline">
                    My Company
                  </Link>{" "}
                  and launch deep research to create your own case file. This lets you compare your company side-by-side with competitors.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Competitors Grid */}
      {regularCompetitors.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <Crosshair className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No competitors yet</h2>
          <p className="text-text-secondary text-sm mb-4">
            Add a competitor to start building intelligence case files.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-amber hover:bg-accent-amber/90 rounded-lg text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Your First Competitor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {regularCompetitors.map((comp, i) => {
            const files = getFilesForCompetitor(comp.id);
            const completedFiles = files.filter((f) => f.status === "completed");
            const isResearching =
              researchingId === comp.id || comp.status === "researching";
            const compColor = COMPETITOR_COLORS[i % COMPETITOR_COLORS.length];

            return (
              <div
                key={comp.id}
                className={`bg-bg-card border border-border rounded-xl p-5 animate-fade-in card-hover ${
                  isResearching ? "scan-effect" : ""
                }`}
                style={{ animationDelay: `${i * 0.05}s`, borderLeftWidth: "4px", borderLeftColor: compColor.border }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: compColor.dot }} />
                      <Link
                        href={`/competitor/${comp.id}`}
                        className="text-lg font-semibold hover:text-accent-blue transition-colors"
                        style={{ color: compColor.text }}
                      >
                        {comp.name}
                      </Link>
                    </div>
                    {comp.website && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-text-muted ml-4">
                        <Globe className="w-3 h-3" />
                        {comp.website}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {comp.research_schedule !== "manual" && (
                      <span className="text-xs px-2 py-0.5 rounded bg-accent-amber/20 text-accent-amber capitalize mr-1">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {comp.research_schedule}
                      </span>
                    )}
                    <button
                      onClick={() => deleteCompetitor(comp.id)}
                      className="p-1.5 text-text-muted hover:text-accent-red transition-colors rounded"
                      title="Delete competitor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {comp.notes && (
                  <p className="text-xs text-text-muted mb-3 line-clamp-2">
                    {comp.notes}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted">
                      <Search className="w-3 h-3 inline mr-1" />
                      {completedFiles.length} case file
                      {completedFiles.length !== 1 ? "s" : ""}
                    </span>
                    {comp.last_researched && (
                      <span className="text-xs text-text-muted">
                        Last:{" "}
                        {new Date(comp.last_researched).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {isResearching ? (
                    <span className="flex items-center gap-1.5 text-xs text-accent-blue">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Researching...
                    </span>
                  ) : (
                    <button
                      onClick={() => launchResearch(comp)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue/20 text-accent-blue rounded-lg text-xs font-medium hover:bg-accent-blue/30 transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      Research
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
