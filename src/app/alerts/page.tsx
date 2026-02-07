"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Filter,
  TrendingUp,
  AlertTriangle,
  Package,
  DollarSign,
  Newspaper,
  Users,
  Handshake,
  BarChart3,
  Lightbulb,
  Zap,
  Building2,
} from "lucide-react";
import { CompetitiveAlert } from "@/lib/types";

const ALERT_TYPE_CONFIG: Record<
  string,
  { icon: typeof Bell; color: string; label: string }
> = {
  score_change: { icon: BarChart3, color: "text-accent-blue", label: "Score Change" },
  new_product: { icon: Package, color: "text-accent-purple", label: "New Product" },
  pricing_change: { icon: DollarSign, color: "text-accent-amber", label: "Pricing" },
  funding: { icon: Building2, color: "text-accent-emerald", label: "Funding" },
  leadership: { icon: Users, color: "text-accent-cyan", label: "Leadership" },
  partnership: { icon: Handshake, color: "text-accent-cyan", label: "Partnership" },
  market_move: { icon: TrendingUp, color: "text-accent-blue", label: "Market Move" },
  news: { icon: Newspaper, color: "text-text-secondary", label: "News" },
  hiring: { icon: Users, color: "text-accent-amber", label: "Hiring" },
  threat_increase: { icon: AlertTriangle, color: "text-accent-red", label: "Threat" },
  opportunity: { icon: Lightbulb, color: "text-accent-emerald", label: "Opportunity" },
};

const SEVERITY_CONFIG: Record<string, { bg: string; text: string }> = {
  high: { bg: "bg-accent-red/10", text: "text-accent-red" },
  medium: { bg: "bg-accent-amber/10", text: "text-accent-amber" },
  low: { bg: "bg-bg-secondary", text: "text-text-muted" },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<CompetitiveAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all"); // all | unread | high | medium | low
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchAlerts = () => {
    fetch("/api/alerts?limit=100")
      .then((r) => r.json())
      .then((data) => {
        setAlerts(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const markAllRead = async () => {
    await fetch("/api/alerts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    fetchAlerts();
  };

  const markRead = async (ids: string[]) => {
    await fetch("/api/alerts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    fetchAlerts();
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === "unread" && a.read) return false;
    if (filter === "high" && a.severity !== "high") return false;
    if (filter === "medium" && a.severity !== "medium") return false;
    if (filter === "low" && a.severity !== "low") return false;
    if (typeFilter !== "all" && a.alert_type !== typeFilter) return false;
    return true;
  });

  const unreadCount = alerts.filter((a) => !a.read).length;
  const highCount = alerts.filter((a) => a.severity === "high" && !a.read).length;

  // Group by date
  const grouped = filteredAlerts.reduce(
    (acc, alert) => {
      const date = new Date(alert.created_at).toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!acc[date]) acc[date] = [];
      acc[date].push(alert);
      return acc;
    },
    {} as Record<string, CompetitiveAlert[]>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-text-muted">Loading alerts...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-accent-amber" />
            Competitive Alerts
            {unreadCount > 0 && (
              <span className="text-sm font-normal bg-accent-red/10 text-accent-red px-2.5 py-0.5 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Real-time notifications when competitors make moves
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-border text-text-secondary hover:bg-bg-secondary"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 animate-fade-in" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-xs text-text-muted">Filter:</span>
        </div>
        {[
          { key: "all", label: "All" },
          { key: "unread", label: `Unread (${unreadCount})` },
          { key: "high", label: `High (${highCount})` },
          { key: "medium", label: "Medium" },
          { key: "low", label: "Low" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
              filter === f.key
                ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue font-medium"
                : "border-border text-text-muted hover:text-text-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}

        <div className="ml-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-text-secondary focus:outline-none"
          >
            <option value="all">All Types</option>
            {Object.entries(ALERT_TYPE_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty State */}
      {alerts.length === 0 && (
        <div className="text-center py-16 animate-fade-in">
          <Bell className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No Alerts Yet</h2>
          <p className="text-text-secondary text-sm mb-4 max-w-md mx-auto">
            Alerts are generated automatically when competitors make moves.
            Research a competitor more than once to start detecting changes.
          </p>
          <Link
            href="/competitor"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-accent-blue-dim rounded-lg text-white text-sm font-medium transition-colors"
          >
            <Zap className="w-4 h-4" />
            Go to Case Files
          </Link>
        </div>
      )}

      {/* Filtered empty */}
      {alerts.length > 0 && filteredAlerts.length === 0 && (
        <div className="text-center py-12 animate-fade-in">
          <p className="text-text-muted text-sm">
            No alerts match the current filters.
          </p>
        </div>
      )}

      {/* Alert List (grouped by date) */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([date, dateAlerts]) => (
          <div key={date} className="animate-fade-in">
            <h3 className="text-xs uppercase tracking-wide text-text-muted mb-3">
              {date}
            </h3>
            <div className="space-y-2">
              {dateAlerts.map((alert) => {
                const typeConfig =
                  ALERT_TYPE_CONFIG[alert.alert_type] ||
                  ALERT_TYPE_CONFIG.news;
                const sevConfig =
                  SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
                const Icon = typeConfig.icon;

                return (
                  <div
                    key={alert.id}
                    className={`bg-bg-card border rounded-xl p-4 transition-all ${
                      alert.read
                        ? "border-border opacity-70"
                        : "border-border-highlight shadow-card"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg ${sevConfig.bg} flex items-center justify-center shrink-0 mt-0.5`}
                      >
                        <Icon className={`w-4 h-4 ${typeConfig.color}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${sevConfig.bg} ${sevConfig.text}`}
                          >
                            {alert.severity}
                          </span>
                          <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded bg-bg-secondary">
                            {typeConfig.label}
                          </span>
                          {!alert.read && (
                            <span className="w-2 h-2 rounded-full bg-accent-blue" />
                          )}
                        </div>

                        <h4 className="text-sm font-medium text-text-primary mb-1">
                          {alert.title}
                        </h4>
                        <p className="text-xs text-text-secondary leading-relaxed">
                          {alert.description}
                        </p>

                        <div className="flex items-center gap-3 mt-2">
                          <Link
                            href={`/competitor/${alert.competitor_id}`}
                            className="text-[11px] text-accent-blue hover:underline"
                          >
                            View {alert.competitor_name}
                          </Link>
                          <span className="text-[10px] text-text-muted">
                            {new Date(alert.created_at).toLocaleTimeString(
                              undefined,
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                          {!alert.read && (
                            <button
                              onClick={() => markRead([alert.id])}
                              className="text-[11px] text-text-muted hover:text-text-secondary"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
