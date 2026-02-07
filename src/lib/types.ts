export interface CompanyProfile {
  id: string;
  name: string;
  industry: string;
  description: string;
  products: string;
  target_market: string;
  key_differentiators: string;
  created_at: string;
  updated_at: string;
}

export interface Competitor {
  id: string;
  name: string;
  website: string | null;
  notes: string | null;
  research_schedule: "manual" | "daily" | "weekly" | "monthly";
  last_researched: string | null;
  next_research: string | null;
  status: "idle" | "researching" | "completed" | "error";
  created_at: string;
  updated_at: string;
}

export interface CaseFile {
  id: string;
  competitor_id: string;
  title: string;
  summary: string | null;
  research_type: string;
  status: "pending" | "in_progress" | "completed" | "error";
  findings: string | null;
  raw_data: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface CaseFileFindings {
  overview: {
    summary: string;
    founded: string;
    headquarters: string;
    employees: string;
    funding: string;
    revenue_estimate: string;
  };
  products_and_services: {
    summary: string;
    items: Array<{
      name: string;
      description: string;
      pricing?: string;
    }>;
  };
  market_position: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    market_share?: string;
  };
  digital_presence: {
    website_analysis: string;
    seo_observations: string;
    social_media: Array<{
      platform: string;
      observations: string;
    }>;
    content_strategy: string;
  };
  customer_intelligence: {
    summary: string;
    target_segments: string[];
    sentiment: string;
    key_reviews: string[];
  };
  competitive_analysis: {
    direct_threats: string[];
    opportunities_for_you: string[];
    key_differentiators: string[];
    pricing_comparison: string;
  };
  recent_activity: {
    news: Array<{
      title: string;
      summary: string;
      date?: string;
    }>;
    hiring_signals: string;
    partnerships: string;
  };
  strategic_recommendations: {
    summary: string;
    action_items: Array<{
      priority: "high" | "medium" | "low";
      action: string;
      rationale: string;
    }>;
  };
  competitive_scores: {
    product_strength: number;
    market_position: number;
    digital_presence: number;
    customer_satisfaction: number;
    pricing_competitiveness: number;
    innovation_velocity: number;
    overall_threat_level: number;
  };
  floor_plans?: Array<{
    model_name: string;
    bedrooms: number | null;
    bathrooms: number | null;
    sq_ft: number | null;
    stories: number | null;
    garage_spaces: number | null;
    base_price: number | null;
    key_features: string[];
    url?: string;
  }>;
  sources?: Array<{
    title: string;
    url: string;
  }>;
}

export interface IntelligenceReport {
  id: string;
  title: string;
  content: string;
  highlights: string | null;
  competitor_ids: string | null;
  created_at: string;
}

export interface CompanyResearch {
  id: string;
  findings: string | null;
  status: "pending" | "in_progress" | "completed" | "error";
  created_at: string;
  completed_at: string | null;
}

export interface CompanyResearchFindings {
  overview: {
    summary: string;
    founded: string;
    headquarters: string;
    employees: string;
    funding: string;
    revenue_estimate: string;
  };
  products_and_services: {
    summary: string;
    items: Array<{
      name: string;
      description: string;
      market_fit: string;
    }>;
  };
  market_position: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    market_share: string;
  };
  digital_presence: {
    website_analysis: string;
    seo_observations: string;
    social_media: Array<{
      platform: string;
      observations: string;
    }>;
    content_strategy: string;
  };
  customer_intelligence: {
    summary: string;
    target_segments: string[];
    sentiment: string;
    key_reviews: string[];
  };
  swot_analysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  recent_activity: {
    news: Array<{
      title: string;
      summary: string;
      date?: string;
    }>;
    hiring_signals: string;
    partnerships: string;
  };
  strategic_assessment: {
    summary: string;
    growth_areas: Array<{
      area: string;
      potential: "high" | "medium" | "low";
      rationale: string;
    }>;
    risk_factors: Array<{
      risk: string;
      severity: "high" | "medium" | "low";
      mitigation: string;
    }>;
  };
  sources?: Array<{
    title: string;
    url: string;
  }>;
}

export interface IntelligenceHighlights {
  executive_summary: string;
  key_insights: Array<{
    category: string;
    insight: string;
    impact: "high" | "medium" | "low";
    competitor?: string;
  }>;
  threats: string[];
  opportunities: string[];
  recommended_actions: Array<{
    action: string;
    priority: "high" | "medium" | "low";
    timeline: string;
  }>;
  market_trends: string[];
}

export interface CompetitiveAlert {
  id: string;
  competitor_id: string;
  competitor_name: string;
  case_file_id: string | null;
  alert_type:
    | "score_change"
    | "new_product"
    | "pricing_change"
    | "funding"
    | "leadership"
    | "partnership"
    | "market_move"
    | "news"
    | "hiring"
    | "threat_increase"
    | "opportunity";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  read: number; // 0 or 1 (SQLite boolean)
  created_at: string;
}

// ─── Floor Plans / Model Homes ───

export interface FloorPlan {
  id: string;
  source: "company" | "competitor"; // company = user's own, competitor = from research
  competitor_id: string | null; // null for company's own plans
  competitor_name: string | null;
  model_name: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sq_ft: number | null;
  stories: number | null;
  garage_spaces: number | null;
  base_price: number | null;
  price_per_sqft: number | null; // computed: base_price / sq_ft
  key_features: string | null; // JSON array of feature strings
  value_score: number | null; // AI-determined 1-10 "best value" score
  url: string | null; // link to floor plan page
  created_at: string;
  updated_at: string;
}

// ─── GoHighLevel Integration ───

export interface GHLConfig {
  id: string;
  api_key: string;
  location_id: string;
  enabled: number; // 0 or 1 (SQLite boolean)
  sync_on_research: number; // auto-sync competitor data after research
  sync_on_alert: number; // push alerts to GHL contact fields
  last_synced: string | null;
  created_at: string;
  updated_at: string;
}

export interface GHLContactMapping {
  id: string;
  competitor_id: string;
  ghl_contact_id: string;
  last_synced: string | null;
  created_at: string;
}

/** The custom fields we create/manage in GHL for each competitor contact */
export interface GHLCompetitorFields {
  // Core info
  competitor_name: string;
  competitor_website: string;
  threat_level: string;
  research_status: string;
  last_researched: string;

  // Competitive scores
  score_product: string;
  score_market: string;
  score_digital: string;
  score_customer: string;
  score_pricing: string;
  score_innovation: string;
  score_threat: string;

  // Latest intel
  top_strengths: string;
  top_weaknesses: string;
  top_threats: string;
  top_opportunities: string;
  pricing_summary: string;

  // Alerts
  latest_alert: string;
  latest_alert_severity: string;
  latest_alert_date: string;
  total_alerts: string;
}
