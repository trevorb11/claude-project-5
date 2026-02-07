"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Cable,
  Check,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Zap,
  Settings,
  Unplug,
  ExternalLink,
} from "lucide-react";
import { GHLConfig, GHLContactMapping } from "@/lib/types";

export default function IntegrationsPage() {
  const [config, setConfig] = useState<GHLConfig | null>(null);
  const [mappings, setMappings] = useState<
    Array<GHLContactMapping & { competitor_name: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [settingUpFields, setSettingUpFields] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [locationId, setLocationId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [syncOnResearch, setSyncOnResearch] = useState(true);
  const [syncOnAlert, setSyncOnAlert] = useState(true);

  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
    locationName?: string;
  } | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [syncResult, setSyncResult] = useState<{
    synced: number;
    errors: number;
    details: Array<{ competitor: string; success: boolean; error?: string }>;
  } | null>(null);
  const [fieldsResult, setFieldsResult] = useState<{
    success: boolean;
    fieldsCreated?: number;
    error?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/integrations/ghl")
      .then((r) => r.json())
      .then((data) => {
        if (data.config) {
          setConfig(data.config);
          setApiKey(data.config.api_key);
          setLocationId(data.config.location_id);
          setEnabled(!!data.config.enabled);
          setSyncOnResearch(!!data.config.sync_on_research);
          setSyncOnAlert(!!data.config.sync_on_alert);
        }
        setMappings(data.mappings || []);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");

    const res = await fetch("/api/integrations/ghl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save",
        api_key: apiKey,
        location_id: locationId,
        enabled,
        sync_on_research: syncOnResearch,
        sync_on_alert: syncOnAlert,
      }),
    });

    const data = await res.json();
    if (data.success) {
      setConfig(data.config);
      setSaveMessage("Configuration saved successfully");
    } else {
      setSaveMessage("Failed to save: " + (data.error || "Unknown error"));
    }
    setSaving(false);
    setTimeout(() => setSaveMessage(""), 4000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    const res = await fetch("/api/integrations/ghl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "test",
        api_key: apiKey,
        location_id: locationId,
      }),
    });

    const data = await res.json();
    setTestResult(data);
    setTesting(false);
  };

  const handleSetupFields = async () => {
    setSettingUpFields(true);
    setFieldsResult(null);

    const res = await fetch("/api/integrations/ghl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setup_fields" }),
    });

    const data = await res.json();
    setFieldsResult(data);
    setSettingUpFields(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);

    const res = await fetch("/api/integrations/ghl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync" }),
    });

    const data = await res.json();
    setSyncResult(data);
    setSyncing(false);

    // Refresh mappings
    const refreshRes = await fetch("/api/integrations/ghl");
    const refreshData = await refreshRes.json();
    setMappings(refreshData.mappings || []);
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect GoHighLevel? This will remove all contact mappings.")) return;

    await fetch("/api/integrations/ghl", { method: "DELETE" });
    setConfig(null);
    setApiKey("");
    setLocationId("");
    setEnabled(false);
    setMappings([]);
    setTestResult(null);
    setSyncResult(null);
    setFieldsResult(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-text-muted">Loading integration settings...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <Link
          href="/setup"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Setup
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Cable className="w-6 h-6 text-accent-cyan" />
          GoHighLevel Integration
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Sync competitive intelligence data to GHL contacts for team
          notifications and CRM workflows
        </p>
      </div>

      <div className="space-y-5">
        {/* Connection Status */}
        <div
          className={`rounded-xl p-4 border animate-fade-in ${
            config?.enabled
              ? "bg-accent-emerald/5 border-accent-emerald/20"
              : "bg-bg-secondary border-border"
          }`}
          style={{ animationDelay: "0.05s" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  config?.enabled ? "bg-accent-emerald animate-pulse" : "bg-text-muted"
                }`}
              />
              <span className="text-sm font-medium">
                {config?.enabled ? "Connected" : "Not Connected"}
              </span>
              {config?.last_synced && (
                <span className="text-xs text-text-muted">
                  Last synced: {new Date(config.last_synced).toLocaleString()}
                </span>
              )}
            </div>
            {config?.enabled && (
              <button
                onClick={handleDisconnect}
                className="text-xs text-accent-red hover:underline flex items-center gap-1"
              >
                <Unplug className="w-3 h-3" />
                Disconnect
              </button>
            )}
          </div>
        </div>

        {/* API Credentials */}
        <div
          className="bg-bg-card border border-border rounded-xl p-5 animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-accent-blue" />
            API Credentials
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                GHL API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="eyJhbGciOiJSUzI1NiIs..."
                className="w-full px-3 py-2.5 rounded-lg bg-bg-secondary border border-border text-sm placeholder-text-muted focus:outline-none focus:border-accent-blue"
              />
              <p className="text-[11px] text-text-muted mt-1">
                Find this in GHL → Settings → Business Profile → API Keys, or use
                an Agency API key.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Location ID
              </label>
              <input
                type="text"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                placeholder="ve9EPM428h8vShlRW1KT"
                className="w-full px-3 py-2.5 rounded-lg bg-bg-secondary border border-border text-sm placeholder-text-muted focus:outline-none focus:border-accent-blue"
              />
              <p className="text-[11px] text-text-muted mt-1">
                Found in GHL → Settings → Business Profile, or in the URL of
                your sub-account.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleTest}
                disabled={testing || !apiKey || !locationId}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-border text-text-secondary hover:bg-bg-secondary disabled:opacity-50"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Test Connection
              </button>

              {testResult && (
                <span
                  className={`text-xs flex items-center gap-1 ${
                    testResult.success
                      ? "text-accent-emerald"
                      : "text-accent-red"
                  }`}
                >
                  {testResult.success ? (
                    <>
                      <Check className="w-3 h-3" />
                      Connected to {testResult.locationName}
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3" />
                      {testResult.error}
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sync Settings */}
        <div
          className="bg-bg-card border border-border rounded-xl p-5 animate-fade-in"
          style={{ animationDelay: "0.15s" }}
        >
          <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
            <RefreshCw className="w-4 h-4 text-accent-cyan" />
            Sync Settings
          </h2>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-2.5 bg-bg-secondary rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 rounded accent-accent-blue"
              />
              <div>
                <p className="text-sm font-medium">Enable Integration</p>
                <p className="text-[11px] text-text-muted">
                  Turn on/off the GHL sync globally
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-2.5 bg-bg-secondary rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={syncOnResearch}
                onChange={(e) => setSyncOnResearch(e.target.checked)}
                className="w-4 h-4 rounded accent-accent-blue"
              />
              <div>
                <p className="text-sm font-medium">Sync on Research</p>
                <p className="text-[11px] text-text-muted">
                  Auto-push competitor data to GHL after every research
                  completion
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-2.5 bg-bg-secondary rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={syncOnAlert}
                onChange={(e) => setSyncOnAlert(e.target.checked)}
                className="w-4 h-4 rounded accent-accent-blue"
              />
              <div>
                <p className="text-sm font-medium">Push Alerts</p>
                <p className="text-[11px] text-text-muted">
                  Send competitive alerts to GHL contact fields and notes in
                  real-time
                </p>
              </div>
            </label>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue hover:bg-accent-blue-dim rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Save Configuration
            </button>
            {saveMessage && (
              <span className="text-xs text-accent-emerald">{saveMessage}</span>
            )}
          </div>
        </div>

        {/* Field Setup & Sync */}
        <div
          className="bg-bg-card border border-border rounded-xl p-5 animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <h2 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-accent-amber" />
            Actions
          </h2>
          <p className="text-xs text-text-muted mb-4">
            Set up custom fields in your GHL location and sync all competitor
            data.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSetupFields}
              disabled={settingUpFields || !config?.api_key}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-border text-text-secondary hover:bg-bg-secondary disabled:opacity-50"
            >
              {settingUpFields ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Settings className="w-4 h-4" />
              )}
              Setup Custom Fields
            </button>

            <button
              onClick={handleSync}
              disabled={syncing || !config?.enabled}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors bg-accent-cyan hover:bg-accent-cyan/90 text-white disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Full Sync Now
            </button>
          </div>

          {fieldsResult && (
            <div
              className={`mt-3 p-3 rounded-lg text-xs ${
                fieldsResult.success
                  ? "bg-accent-emerald/10 text-accent-emerald"
                  : "bg-accent-red/10 text-accent-red"
              }`}
            >
              {fieldsResult.success
                ? `${fieldsResult.fieldsCreated} custom fields ready in GHL`
                : `Error: ${fieldsResult.error}`}
            </div>
          )}

          {syncResult && (
            <div className="mt-3 p-3 bg-bg-secondary rounded-lg">
              <p className="text-xs font-medium text-text-primary mb-2">
                Sync Complete: {syncResult.synced} synced, {syncResult.errors}{" "}
                errors
              </p>
              <div className="space-y-1">
                {syncResult.details.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-[11px] text-text-secondary"
                  >
                    {d.success ? (
                      <Check className="w-3 h-3 text-accent-emerald" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-accent-red" />
                    )}
                    {d.competitor}
                    {d.error && (
                      <span className="text-text-muted">— {d.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contact Mappings */}
        {mappings.length > 0 && (
          <div
            className="bg-bg-card border border-border rounded-xl p-5 animate-fade-in"
            style={{ animationDelay: "0.25s" }}
          >
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
              <Cable className="w-4 h-4 text-accent-emerald" />
              Mapped Contacts ({mappings.length})
            </h2>
            <div className="space-y-2">
              {mappings.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2.5 bg-bg-secondary rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">{m.competitor_name}</p>
                    <p className="text-[11px] text-text-muted">
                      GHL Contact: {m.ghl_contact_id}
                    </p>
                  </div>
                  <div className="text-right">
                    {m.last_synced ? (
                      <p className="text-[11px] text-text-muted">
                        Synced: {new Date(m.last_synced).toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="text-[11px] text-text-muted">Not synced</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How It Works */}
        <div
          className="bg-bg-secondary border border-border rounded-xl p-5 animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          <h2 className="font-semibold text-sm mb-3">How It Works</h2>
          <div className="space-y-2 text-xs text-text-secondary">
            <p>
              <strong className="text-text-primary">1. Connect</strong> — Enter
              your GHL API key and Location ID, then test the connection.
            </p>
            <p>
              <strong className="text-text-primary">2. Setup Fields</strong> —
              Click &quot;Setup Custom Fields&quot; to create 21 competitive intel
              fields in your GHL location (prefixed with &quot;CI:&quot;).
            </p>
            <p>
              <strong className="text-text-primary">3. Auto-Sync</strong> — When
              research runs, each competitor is created as a GHL contact. Scores,
              strengths, weaknesses, and threat levels are pushed to custom
              fields.
            </p>
            <p>
              <strong className="text-text-primary">4. Alert Push</strong> — When
              competitors make moves, alerts are pushed to GHL as updated field
              values and notes. Use GHL workflows to notify your team.
            </p>
          </div>
          <a
            href="https://highlevel.stoplight.io/docs/integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline mt-3"
          >
            GHL API Documentation <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
