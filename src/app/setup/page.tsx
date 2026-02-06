"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Save, CheckCircle, ArrowRight } from "lucide-react";
import { CompanyProfile } from "@/lib/types";

export default function SetupPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/company")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
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

        <div className="mt-4 p-4 bg-bg-secondary rounded-xl border border-border">
          <p className="text-xs text-text-muted">
            <strong className="text-text-secondary">Why this matters:</strong>{" "}
            Your company profile gives our research agents context about your
            business. This means the competitive intelligence they gather is
            specifically tailored to what matters for your company — threats to
            your market position, opportunities you can exploit, and strategic
            recommendations that make sense for your situation.
          </p>
        </div>
      </div>
    </div>
  );
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
