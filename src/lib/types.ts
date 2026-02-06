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
