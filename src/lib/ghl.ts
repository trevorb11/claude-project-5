/**
 * GoHighLevel API Client
 *
 * Handles all communication with the GHL API v2:
 * - Contact CRUD (create/update competitors as contacts)
 * - Custom field management (create/update competitive intel fields)
 * - Field value syncing (push scores, alerts, findings to contact fields)
 *
 * GHL API v2 base: https://services.leadconnectorhq.com
 * Auth: Bearer token (API key) + Version header
 */

import { getDb } from "./db";
import {
  GHLConfig,
  GHLContactMapping,
  GHLCompetitorFields,
  Competitor,
  CaseFileFindings,
  CompetitiveAlert,
} from "./types";

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

// ─── Config helpers ───

export function getGHLConfig(): GHLConfig | null {
  const db = getDb();
  const config = db
    .prepare("SELECT * FROM ghl_config WHERE id = 'main'")
    .get() as GHLConfig | undefined;
  return config || null;
}

export function isGHLEnabled(): boolean {
  const config = getGHLConfig();
  return !!(config && config.enabled && config.api_key && config.location_id);
}

// ─── Core API caller ───

async function ghlFetch(
  path: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    apiKey: string;
  }
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const { method = "GET", body, apiKey } = options;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Version: GHL_API_VERSION,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const res = await fetch(`${GHL_API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    // Some GHL endpoints return empty bodies
  }

  return { ok: res.ok, status: res.status, data };
}

// ─── Custom Fields ───

/** The custom fields we manage in GHL. Key = our internal name, value = GHL field config */
const CUSTOM_FIELD_DEFINITIONS: Array<{
  key: keyof GHLCompetitorFields;
  name: string;
  dataType: string;
}> = [
  { key: "competitor_name", name: "Competitor Name", dataType: "TEXT" },
  { key: "competitor_website", name: "Competitor Website", dataType: "TEXT" },
  { key: "threat_level", name: "Threat Level (1-10)", dataType: "TEXT" },
  { key: "research_status", name: "Research Status", dataType: "TEXT" },
  { key: "last_researched", name: "Last Researched", dataType: "TEXT" },
  { key: "score_product", name: "Score: Product Strength", dataType: "TEXT" },
  { key: "score_market", name: "Score: Market Position", dataType: "TEXT" },
  { key: "score_digital", name: "Score: Digital Presence", dataType: "TEXT" },
  { key: "score_customer", name: "Score: Customer Satisfaction", dataType: "TEXT" },
  { key: "score_pricing", name: "Score: Pricing", dataType: "TEXT" },
  { key: "score_innovation", name: "Score: Innovation", dataType: "TEXT" },
  { key: "score_threat", name: "Score: Overall Threat", dataType: "TEXT" },
  { key: "top_strengths", name: "Top Strengths", dataType: "LARGE_TEXT" },
  { key: "top_weaknesses", name: "Top Weaknesses", dataType: "LARGE_TEXT" },
  { key: "top_threats", name: "Top Threats", dataType: "LARGE_TEXT" },
  { key: "top_opportunities", name: "Top Opportunities", dataType: "LARGE_TEXT" },
  { key: "pricing_summary", name: "Pricing Summary", dataType: "LARGE_TEXT" },
  { key: "latest_alert", name: "Latest Alert", dataType: "LARGE_TEXT" },
  { key: "latest_alert_severity", name: "Latest Alert Severity", dataType: "TEXT" },
  { key: "latest_alert_date", name: "Latest Alert Date", dataType: "TEXT" },
  { key: "total_alerts", name: "Total Alerts", dataType: "TEXT" },
];

/**
 * Ensure all our custom fields exist in the GHL location.
 * Returns a map of our field keys → GHL custom field IDs.
 */
export async function ensureCustomFields(
  apiKey: string,
  locationId: string
): Promise<Record<string, string>> {
  // Fetch existing custom fields
  const existing = await ghlFetch(
    `/locations/${locationId}/customFields`,
    { apiKey }
  );

  const existingFields = (
    (existing.data?.customFields as Array<{ id: string; name: string }>) || []
  );

  const fieldMap: Record<string, string> = {};

  for (const def of CUSTOM_FIELD_DEFINITIONS) {
    const ghlFieldName = `CI: ${def.name}`; // Prefix with "CI:" to namespace our fields
    const found = existingFields.find((f) => f.name === ghlFieldName);

    if (found) {
      fieldMap[def.key] = found.id;
    } else {
      // Create the custom field
      const created = await ghlFetch(
        `/locations/${locationId}/customFields`,
        {
          method: "POST",
          apiKey,
          body: {
            name: ghlFieldName,
            dataType: def.dataType,
            model: "contact",
          },
        }
      );

      if (created.ok && created.data?.customField) {
        const cf = created.data.customField as { id: string };
        fieldMap[def.key] = cf.id;
      }
    }
  }

  return fieldMap;
}

// ─── Contact Management ───

/**
 * Find or create a GHL contact for a competitor.
 * Uses the contact mapping table to track which competitor maps to which GHL contact.
 */
export async function findOrCreateContact(
  apiKey: string,
  locationId: string,
  competitor: Competitor
): Promise<string | null> {
  const db = getDb();

  // Check if we already have a mapping
  const mapping = db
    .prepare("SELECT * FROM ghl_contact_mappings WHERE competitor_id = ?")
    .get(competitor.id) as GHLContactMapping | undefined;

  if (mapping) {
    return mapping.ghl_contact_id;
  }

  // Search for an existing contact by company name
  const searchRes = await ghlFetch(
    `/contacts/search/duplicate?locationId=${locationId}&companyName=${encodeURIComponent(competitor.name)}`,
    { apiKey }
  );

  if (searchRes.ok && searchRes.data?.contact) {
    const contact = searchRes.data.contact as { id: string };
    // Save mapping
    db.prepare(
      `INSERT INTO ghl_contact_mappings (id, competitor_id, ghl_contact_id)
       VALUES (?, ?, ?)`
    ).run(crypto.randomUUID(), competitor.id, contact.id);
    return contact.id;
  }

  // Create new contact
  const createRes = await ghlFetch("/contacts/", {
    method: "POST",
    apiKey,
    body: {
      locationId,
      companyName: competitor.name,
      name: competitor.name,
      website: competitor.website || undefined,
      tags: ["competitor", "builder-studio-intel"],
      source: "Builder Studio Competitive Intelligence",
    },
  });

  if (createRes.ok && createRes.data?.contact) {
    const contact = createRes.data.contact as { id: string };
    db.prepare(
      `INSERT INTO ghl_contact_mappings (id, competitor_id, ghl_contact_id)
       VALUES (?, ?, ?)`
    ).run(crypto.randomUUID(), competitor.id, contact.id);
    return contact.id;
  }

  console.error("GHL: Failed to create contact", createRes.data);
  return null;
}

/**
 * Update a GHL contact's custom field values.
 */
async function updateContactFields(
  apiKey: string,
  contactId: string,
  fieldMap: Record<string, string>,
  values: Partial<GHLCompetitorFields>
): Promise<boolean> {
  const customFields: Array<{ id: string; field_value: string }> = [];

  for (const [key, value] of Object.entries(values)) {
    const fieldId = fieldMap[key];
    if (fieldId && value) {
      customFields.push({ id: fieldId, field_value: value });
    }
  }

  if (customFields.length === 0) return true;

  const res = await ghlFetch(`/contacts/${contactId}`, {
    method: "PUT",
    apiKey,
    body: { customFields },
  });

  return res.ok;
}

/**
 * Add a note to a GHL contact.
 */
async function addContactNote(
  apiKey: string,
  contactId: string,
  body: string
): Promise<boolean> {
  const res = await ghlFetch(`/contacts/${contactId}/notes`, {
    method: "POST",
    apiKey,
    body: { body },
  });

  return res.ok;
}

/**
 * Add a tag to a GHL contact.
 */
async function addContactTag(
  apiKey: string,
  contactId: string,
  tags: string[]
): Promise<boolean> {
  const res = await ghlFetch(`/contacts/${contactId}/tags`, {
    method: "POST",
    apiKey,
    body: { tags },
  });

  return res.ok;
}

// ─── High-level Sync Functions ───

/**
 * Sync a competitor's research findings to their GHL contact.
 * Called after research completes.
 */
export async function syncCompetitorToGHL(
  competitor: Competitor,
  findings: CaseFileFindings
): Promise<{ success: boolean; error?: string }> {
  const config = getGHLConfig();
  if (!config || !config.enabled || !config.api_key || !config.location_id) {
    return { success: false, error: "GHL integration not configured" };
  }
  if (!config.sync_on_research) {
    return { success: true }; // Sync disabled, skip silently
  }

  try {
    const fieldMap = await ensureCustomFields(config.api_key, config.location_id);
    const contactId = await findOrCreateContact(
      config.api_key,
      config.location_id,
      competitor
    );

    if (!contactId) {
      return { success: false, error: "Could not find or create GHL contact" };
    }

    // Build field values from findings
    const scores = findings.competitive_scores;
    const fieldValues: Partial<GHLCompetitorFields> = {
      competitor_name: competitor.name,
      competitor_website: competitor.website || "",
      threat_level: scores ? `${scores.overall_threat_level}/10` : "N/A",
      research_status: competitor.status,
      last_researched: new Date().toISOString(),
      score_product: scores ? `${scores.product_strength}/10` : "N/A",
      score_market: scores ? `${scores.market_position}/10` : "N/A",
      score_digital: scores ? `${scores.digital_presence}/10` : "N/A",
      score_customer: scores ? `${scores.customer_satisfaction}/10` : "N/A",
      score_pricing: scores ? `${scores.pricing_competitiveness}/10` : "N/A",
      score_innovation: scores ? `${scores.innovation_velocity}/10` : "N/A",
      score_threat: scores ? `${scores.overall_threat_level}/10` : "N/A",
      top_strengths: findings.market_position.strengths.slice(0, 3).join(" | "),
      top_weaknesses: findings.market_position.weaknesses.slice(0, 3).join(" | "),
      top_threats: findings.competitive_analysis.direct_threats.slice(0, 3).join(" | "),
      top_opportunities: findings.competitive_analysis.opportunities_for_you.slice(0, 3).join(" | "),
      pricing_summary: findings.competitive_analysis.pricing_comparison,
    };

    await updateContactFields(config.api_key, contactId, fieldMap, fieldValues);

    // Add a research note
    await addContactNote(
      config.api_key,
      contactId,
      `📊 Research Update — ${new Date().toLocaleDateString()}\n\n${findings.overview.summary.substring(0, 500)}\n\nThreat Level: ${scores?.overall_threat_level || "N/A"}/10\n\nTop Strengths:\n${findings.market_position.strengths.slice(0, 3).map((s) => `• ${s}`).join("\n")}\n\nTop Weaknesses:\n${findings.market_position.weaknesses.slice(0, 3).map((w) => `• ${w}`).join("\n")}`
    );

    // Tag based on threat level
    if (scores) {
      const tags: string[] = [];
      if (scores.overall_threat_level >= 8) tags.push("high-threat");
      else if (scores.overall_threat_level >= 6) tags.push("medium-threat");
      else tags.push("low-threat");
      await addContactTag(config.api_key, contactId, tags);
    }

    // Update last_synced in mapping
    const db = getDb();
    db.prepare(
      "UPDATE ghl_contact_mappings SET last_synced = datetime('now') WHERE competitor_id = ?"
    ).run(competitor.id);
    db.prepare(
      "UPDATE ghl_config SET last_synced = datetime('now') WHERE id = 'main'"
    ).run();

    return { success: true };
  } catch (error) {
    console.error("GHL sync error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Push an alert to the corresponding GHL contact.
 * Updates the latest alert fields and adds a note.
 */
export async function pushAlertToGHL(
  alert: CompetitiveAlert
): Promise<{ success: boolean; error?: string }> {
  const config = getGHLConfig();
  if (!config || !config.enabled || !config.api_key || !config.location_id) {
    return { success: false, error: "GHL integration not configured" };
  }
  if (!config.sync_on_alert) {
    return { success: true }; // Alert sync disabled
  }

  try {
    const db = getDb();
    const mapping = db
      .prepare("SELECT * FROM ghl_contact_mappings WHERE competitor_id = ?")
      .get(alert.competitor_id) as GHLContactMapping | undefined;

    if (!mapping) {
      // No GHL contact for this competitor yet — skip
      return { success: true };
    }

    const fieldMap = await ensureCustomFields(config.api_key, config.location_id);

    // Count total alerts for this competitor
    const alertCount = db
      .prepare("SELECT COUNT(*) as count FROM alerts WHERE competitor_id = ?")
      .get(alert.competitor_id) as { count: number };

    // Update alert fields
    const fieldValues: Partial<GHLCompetitorFields> = {
      latest_alert: alert.title,
      latest_alert_severity: alert.severity.toUpperCase(),
      latest_alert_date: new Date(alert.created_at).toISOString(),
      total_alerts: String(alertCount.count),
    };

    await updateContactFields(
      config.api_key,
      mapping.ghl_contact_id,
      fieldMap,
      fieldValues
    );

    // Add alert as a note
    const severityEmoji =
      alert.severity === "high" ? "🔴" : alert.severity === "medium" ? "🟠" : "🟢";

    await addContactNote(
      config.api_key,
      mapping.ghl_contact_id,
      `${severityEmoji} Alert: ${alert.title}\n\nSeverity: ${alert.severity.toUpperCase()}\nType: ${alert.alert_type}\n\n${alert.description}`
    );

    // Tag with alert severity
    await addContactTag(config.api_key, mapping.ghl_contact_id, [
      `alert-${alert.severity}`,
      `alert-${alert.alert_type}`,
    ]);

    return { success: true };
  } catch (error) {
    console.error("GHL alert push error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Validate GHL credentials by making a test API call.
 */
export async function testGHLConnection(
  apiKey: string,
  locationId: string
): Promise<{ success: boolean; error?: string; locationName?: string }> {
  try {
    const res = await ghlFetch(`/locations/${locationId}`, { apiKey });

    if (res.ok && res.data?.location) {
      const location = res.data.location as { name?: string };
      return { success: true, locationName: location.name || locationId };
    }

    return {
      success: false,
      error: res.status === 401
        ? "Invalid API key"
        : res.status === 404
        ? "Location not found"
        : `GHL API error (${res.status})`,
    };
  } catch (error) {
    return { success: false, error: `Connection failed: ${String(error)}` };
  }
}

/**
 * Full sync: push all competitors with research data to GHL.
 */
export async function fullSyncToGHL(): Promise<{
  synced: number;
  errors: number;
  details: Array<{ competitor: string; success: boolean; error?: string }>;
}> {
  const db = getDb();
  const config = getGHLConfig();

  if (!config || !config.enabled || !config.api_key || !config.location_id) {
    return { synced: 0, errors: 0, details: [] };
  }

  const competitors = db
    .prepare("SELECT * FROM competitors")
    .all() as Competitor[];

  const results: Array<{ competitor: string; success: boolean; error?: string }> = [];

  for (const competitor of competitors) {
    // Get latest completed case file
    const caseFile = db
      .prepare(
        "SELECT * FROM case_files WHERE competitor_id = ? AND status = 'completed' AND findings IS NOT NULL ORDER BY completed_at DESC LIMIT 1"
      )
      .get(competitor.id) as { findings: string } | undefined;

    if (!caseFile) {
      results.push({ competitor: competitor.name, success: true, error: "No research data" });
      continue;
    }

    try {
      const findings = JSON.parse(caseFile.findings) as CaseFileFindings;
      const result = await syncCompetitorToGHL(competitor, findings);
      results.push({ competitor: competitor.name, ...result });
    } catch (error) {
      results.push({ competitor: competitor.name, success: false, error: String(error) });
    }
  }

  db.prepare(
    "UPDATE ghl_config SET last_synced = datetime('now') WHERE id = 'main'"
  ).run();

  return {
    synced: results.filter((r) => r.success).length,
    errors: results.filter((r) => !r.success).length,
    details: results,
  };
}
