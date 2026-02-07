import { CompanyProfile, CaseFileFindings, CompanyResearchFindings } from "./types";
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";
const OPENAI_BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1";

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  baseURL: OPENAI_BASE_URL,
});

// Check if we're using an OpenAI-compatible endpoint (supports Responses API + web search)
// This includes the native OpenAI API and Replit's AI Integrations proxy
function isOpenAICompatible(): boolean {
  return (
    OPENAI_BASE_URL === "https://api.openai.com/v1" ||
    OPENAI_BASE_URL.includes("replit") ||
    !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY
  );
}

interface ResearchContext {
  myCompany: CompanyProfile;
  competitorName: string;
  competitorWebsite?: string;
  competitorNotes?: string;
  companyResearch?: CompanyResearchFindings | null;
}

// ─── Helper: extract text + sources from Responses API output ───

interface ResponsesResult {
  text: string;
  sources: Array<{ title: string; url: string }>;
}

function extractResponsesOutput(response: {
  output_text?: string;
  output?: Array<{
    type: string;
    content?: Array<{
      type: string;
      text?: string;
      annotations?: Array<{
        type: string;
        url?: string;
        title?: string;
      }>;
    }>;
  }>;
}): ResponsesResult {
  const text = response.output_text || "";
  const sources: Array<{ title: string; url: string }> = [];
  const seenUrls = new Set<string>();

  if (response.output) {
    for (const item of response.output) {
      if (item.type === "message" && item.content) {
        for (const content of item.content) {
          if (content.annotations) {
            for (const ann of content.annotations) {
              if (ann.type === "url_citation" && ann.url && !seenUrls.has(ann.url)) {
                seenUrls.add(ann.url);
                sources.push({ title: ann.title || ann.url, url: ann.url });
              }
            }
          }
        }
      }
    }
  }

  return { text, sources };
}

// ─── Helper: call AI with optional web search ───

async function callAI(opts: {
  instructions: string;
  prompt: string;
  webSearch: boolean;
  maxTokens?: number;
}): Promise<{ text: string; sources: Array<{ title: string; url: string }> }> {
  const maxTokens = opts.maxTokens || 16384;

  if (opts.webSearch && isOpenAICompatible()) {
    try {
      const response = await (openai as unknown as {
        responses: {
          create: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
        };
      }).responses.create({
        model: "gpt-4o",
        instructions: opts.instructions,
        input: opts.prompt,
        tools: [
          {
            type: "web_search",
            search_context_size: "high",
          },
        ],
        temperature: 0.3,
        max_output_tokens: maxTokens,
      });

      return extractResponsesOutput(response as Parameters<typeof extractResponsesOutput>[0]);
    } catch (responsesError) {
      console.warn("Responses API unavailable, falling back to Chat Completions:", responsesError instanceof Error ? responsesError.message : responsesError);
    }
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: opts.instructions },
      { role: "user", content: opts.prompt },
    ],
    temperature: 0.3,
    max_completion_tokens: maxTokens,
  });

  return {
    text: response.choices?.[0]?.message?.content || "",
    sources: [],
  };
}

// ─── Helper: parse JSON from AI response text ───

function parseJsonFromText(text: string): unknown {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return JSON.parse(cleaned);
}

// ─── Competitor Deep Research (initial comprehensive analysis) ───

export async function runDeepResearch(
  context: ResearchContext
): Promise<CaseFileFindings> {
  if (!OPENAI_API_KEY) {
    return generateSimulatedFindings(context);
  }

  // Build the company self-assessment context if available
  const companyDeepDiveContext = context.companyResearch
    ? `

IMPORTANT — You have a deep-dive self-assessment of ${context.myCompany.name} to use for direct comparison:
- Our strengths: ${context.companyResearch.market_position.strengths.join("; ")}
- Our weaknesses: ${context.companyResearch.market_position.weaknesses.join("; ")}
- Our SWOT opportunities: ${context.companyResearch.swot_analysis.opportunities.join("; ")}
- Our SWOT threats: ${context.companyResearch.swot_analysis.threats.join("; ")}
- Our market position: ${context.companyResearch.market_position.summary}
- Our customer sentiment: ${context.companyResearch.customer_intelligence.sentiment}
- Our digital presence: ${context.companyResearch.digital_presence.website_analysis}

Use this to make DIRECT, SPECIFIC comparisons. For every strength/weakness you find about ${context.competitorName}, compare it against ${context.myCompany.name}'s known position. Score the competitive_scores with this context in mind — the overall_threat_level should reflect how dangerous they are to US specifically.`
    : "";

  const instructions = `You are an elite competitive intelligence analyst. You have deep expertise in market research, digital forensics, business analysis, and strategic consulting.

You are conducting research for: ${context.myCompany.name}
Industry: ${context.myCompany.industry}
What they do: ${context.myCompany.description}
Products/Services: ${context.myCompany.products}
Target Market: ${context.myCompany.target_market}
Key Differentiators: ${context.myCompany.key_differentiators}
${companyDeepDiveContext}

Your job is to create a comprehensive competitive intelligence case file on the target competitor. Think like a detective building a case — use web search to find real, current information. Your analysis should be specifically tailored to what would be most useful for ${context.myCompany.name}.

RESEARCH INSTRUCTIONS:
- Search the web for real, current information about this competitor
- Look for their website, pricing pages, recent news, job postings, social media, customer reviews
- Find concrete data: funding rounds, employee counts, revenue estimates, product features, pricing tiers
- Check review sites (G2, Capterra, Trustpilot, etc.) for real customer sentiment
- Be specific and factual. Cite what you actually find. If information isn't available, say so honestly.`;

  const userPrompt = `Create a comprehensive competitive intelligence case file for: ${context.competitorName}
${context.competitorWebsite ? `Website: ${context.competitorWebsite}` : ""}
${context.competitorNotes ? `Additional context: ${context.competitorNotes}` : ""}

Search the web thoroughly. Research their website, products, pricing, recent news, hiring activity, customer reviews, social media presence, and market position.

Return your findings as a JSON object with this exact structure:
{
  "overview": {
    "summary": "2-3 paragraph executive summary based on what you found",
    "founded": "founding year",
    "headquarters": "location",
    "employees": "employee count or range",
    "funding": "funding information",
    "revenue_estimate": "estimated revenue or range"
  },
  "products_and_services": {
    "summary": "overview of their product/service portfolio",
    "items": [{"name": "product name", "description": "what it does", "pricing": "actual pricing if found"}]
  },
  "market_position": {
    "summary": "their position relative to ${context.myCompany.name}",
    "strengths": ["specific strength based on research"],
    "weaknesses": ["specific weakness based on research"],
    "market_share": "estimated market share"
  },
  "digital_presence": {
    "website_analysis": "analysis of their actual website",
    "seo_observations": "SEO targeting observations",
    "social_media": [{"platform": "name", "observations": "findings"}],
    "content_strategy": "their content approach"
  },
  "customer_intelligence": {
    "summary": "what customers say based on review sites",
    "target_segments": ["segment"],
    "sentiment": "real customer sentiment from reviews",
    "key_reviews": ["actual review themes"]
  },
  "competitive_analysis": {
    "direct_threats": ["specific threat to ${context.myCompany.name}"],
    "opportunities_for_you": ["specific opportunity for ${context.myCompany.name}"],
    "key_differentiators": ["how they differentiate"],
    "pricing_comparison": "how their pricing compares"
  },
  "recent_activity": {
    "news": [{"title": "headline", "summary": "what happened", "date": "when"}],
    "hiring_signals": "what their job postings reveal",
    "partnerships": "partnerships or integrations"
  },
  "strategic_recommendations": {
    "summary": "strategic take for ${context.myCompany.name}",
    "action_items": [{"priority": "high|medium|low", "action": "specific action", "rationale": "why"}]
  },
  "competitive_scores": {
    "product_strength": 7,
    "market_position": 6,
    "digital_presence": 8,
    "customer_satisfaction": 5,
    "pricing_competitiveness": 7,
    "innovation_velocity": 6,
    "overall_threat_level": 7
  }
}

SCORING GUIDE (1-10): 1-3 = Weak/low threat, 4-6 = Moderate/average, 7-8 = Strong/significant, 9-10 = Exceptional/critical threat.
Score based on real evidence. overall_threat_level reflects how much of a competitive threat they pose to ${context.myCompany.name} specifically.

Return ONLY the JSON object, no markdown formatting or code blocks.`;

  try {
    const { text, sources } = await callAI({
      instructions,
      prompt: userPrompt,
      webSearch: true,
    });

    if (!text) throw new Error("No content in API response");

    const findings = parseJsonFromText(text) as CaseFileFindings;
    if (sources.length > 0) findings.sources = sources;

    // Ensure competitive_scores has defaults
    if (!findings.competitive_scores) {
      findings.competitive_scores = {
        product_strength: 5, market_position: 5, digital_presence: 5,
        customer_satisfaction: 5, pricing_competitiveness: 5,
        innovation_velocity: 5, overall_threat_level: 5,
      };
    }

    return findings;
  } catch (error) {
    console.error("Research agent error:", error);
    return generateSimulatedFindings(context);
  }
}

// ─── Competitor Update Scan (scheduled lightweight check for changes) ───

export async function runResearchUpdate(
  context: ResearchContext,
  previousFindings: CaseFileFindings
): Promise<CaseFileFindings> {
  if (!OPENAI_API_KEY) {
    return generateSimulatedFindings(context);
  }

  const instructions = `You are a competitive intelligence analyst performing a scheduled update scan for ${context.myCompany.name}.
Industry: ${context.myCompany.industry}

You have a previous case file on ${context.competitorName} and your job is to search for any NEW developments, changes, or updates since the last research. Focus on what has CHANGED — not on repeating known information.

Look for: new product launches, pricing changes, funding rounds, leadership changes, partnerships, major news, hiring shifts, customer sentiment changes, website updates, and any other competitive signals.`;

  const previousSummary = `Previous findings summary:
- Overview: ${previousFindings.overview.summary.substring(0, 300)}
- Products: ${previousFindings.products_and_services.items.map((i) => i.name).join(", ")}
- Strengths: ${previousFindings.market_position.strengths.slice(0, 3).join("; ")}
- Weaknesses: ${previousFindings.market_position.weaknesses.slice(0, 3).join("; ")}
- Previous scores: Product=${previousFindings.competitive_scores?.product_strength}, Market=${previousFindings.competitive_scores?.market_position}, Threat=${previousFindings.competitive_scores?.overall_threat_level}`;

  const userPrompt = `Perform an update scan for: ${context.competitorName}
${context.competitorWebsite ? `Website: ${context.competitorWebsite}` : ""}

${previousSummary}

Search the web for any recent news, changes, or developments about ${context.competitorName}. Compare what you find against the previous findings and produce an UPDATED case file.

IMPORTANT: Keep all previous findings that are still accurate. Update anything that has changed. Add any new information discovered. If something is unchanged, carry it forward. Adjust competitive_scores if the competitive picture has shifted.

Return the complete updated case file as JSON with this exact structure:
{
  "overview": {
    "summary": "Updated 2-3 paragraph summary incorporating any new developments",
    "founded": "${previousFindings.overview.founded}",
    "headquarters": "${previousFindings.overview.headquarters}",
    "employees": "updated if changed",
    "funding": "updated if new rounds found",
    "revenue_estimate": "updated if new data found"
  },
  "products_and_services": {
    "summary": "updated product overview",
    "items": [{"name": "product name", "description": "description", "pricing": "pricing"}]
  },
  "market_position": {
    "summary": "updated market position",
    "strengths": ["updated strengths"],
    "weaknesses": ["updated weaknesses"],
    "market_share": "updated if new data"
  },
  "digital_presence": {
    "website_analysis": "updated website analysis",
    "seo_observations": "updated SEO observations",
    "social_media": [{"platform": "name", "observations": "findings"}],
    "content_strategy": "updated content strategy"
  },
  "customer_intelligence": {
    "summary": "updated customer intelligence",
    "target_segments": ["segments"],
    "sentiment": "updated sentiment",
    "key_reviews": ["updated review themes"]
  },
  "competitive_analysis": {
    "direct_threats": ["updated threats to ${context.myCompany.name}"],
    "opportunities_for_you": ["updated opportunities"],
    "key_differentiators": ["updated differentiators"],
    "pricing_comparison": "updated pricing comparison"
  },
  "recent_activity": {
    "news": [{"title": "NEW headline found in this scan", "summary": "what happened", "date": "when"}],
    "hiring_signals": "updated hiring signals",
    "partnerships": "updated partnerships"
  },
  "strategic_recommendations": {
    "summary": "updated strategic take",
    "action_items": [{"priority": "high|medium|low", "action": "action", "rationale": "why"}]
  },
  "competitive_scores": {
    "product_strength": 7,
    "market_position": 6,
    "digital_presence": 8,
    "customer_satisfaction": 5,
    "pricing_competitiveness": 7,
    "innovation_velocity": 6,
    "overall_threat_level": 7
  }
}

Return ONLY the JSON object, no markdown formatting or code blocks.`;

  try {
    const { text, sources } = await callAI({
      instructions,
      prompt: userPrompt,
      webSearch: true,
      maxTokens: 12288,
    });

    if (!text) throw new Error("No content in API response");

    const findings = parseJsonFromText(text) as CaseFileFindings;
    if (sources.length > 0) findings.sources = sources;

    if (!findings.competitive_scores) {
      findings.competitive_scores = previousFindings.competitive_scores || {
        product_strength: 5, market_position: 5, digital_presence: 5,
        customer_satisfaction: 5, pricing_competitiveness: 5,
        innovation_velocity: 5, overall_threat_level: 5,
      };
    }

    return findings;
  } catch (error) {
    console.error("Research update error:", error);
    return generateSimulatedFindings(context);
  }
}

// ─── Company Deep Research ───

export async function runCompanyDeepResearch(
  company: CompanyProfile
): Promise<CompanyResearchFindings> {
  if (!OPENAI_API_KEY) {
    return generateSimulatedCompanyFindings(company);
  }

  const instructions = `You are an elite business intelligence analyst conducting a comprehensive self-assessment and market analysis.

You are analyzing: ${company.name}
Industry: ${company.industry}
Description: ${company.description}
Products/Services: ${company.products}
Target Market: ${company.target_market}
Stated Differentiators: ${company.key_differentiators}

Your job is to create an honest, thorough deep-dive analysis of this company from an outside-in perspective. Think like a due diligence analyst — be objective, find real data.

RESEARCH INSTRUCTIONS:
- Search the web for real information about this company
- Look for their website, product pages, pricing, news, customer reviews, social media
- Check review sites, job postings, press releases, industry coverage
- Be specific, factual, and brutally honest. Cite what you find.
- Avoid generic praise. The company needs to know its real position.`;

  const userPrompt = `Create a comprehensive deep-dive analysis of ${company.name}. Search the web for real information. Analyze their actual market position, digital footprint, customer perception, and strategic standing.

Return your findings as a JSON object with this exact structure:
{
  "overview": {
    "summary": "2-3 paragraph honest executive summary based on real findings",
    "founded": "founding year",
    "headquarters": "location",
    "employees": "employee count or range",
    "funding": "funding information if available",
    "revenue_estimate": "estimated revenue or range"
  },
  "products_and_services": {
    "summary": "objective assessment of their actual product/service portfolio",
    "items": [{"name": "product name", "description": "what it does", "market_fit": "how well it fits the market need"}]
  },
  "market_position": {
    "summary": "honest assessment of where ${company.name} actually stands",
    "strengths": ["real strength based on evidence"],
    "weaknesses": ["real weakness based on evidence"],
    "market_share": "estimated market share or position"
  },
  "digital_presence": {
    "website_analysis": "analysis of their actual website",
    "seo_observations": "real SEO observations",
    "social_media": [{"platform": "platform name", "observations": "what you found"}],
    "content_strategy": "their actual content approach"
  },
  "customer_intelligence": {
    "summary": "what customers actually say",
    "target_segments": ["segment 1"],
    "sentiment": "real customer sentiment from review sites",
    "key_reviews": ["actual review themes"]
  },
  "swot_analysis": {
    "strengths": ["internal strength based on evidence"],
    "weaknesses": ["internal weakness based on evidence"],
    "opportunities": ["market opportunity"],
    "threats": ["external threat"]
  },
  "recent_activity": {
    "news": [{"title": "real headline", "summary": "what happened", "date": "when"}],
    "hiring_signals": "what their actual job postings reveal",
    "partnerships": "real partnerships found"
  },
  "strategic_assessment": {
    "summary": "overall strategic position based on evidence",
    "growth_areas": [{"area": "growth area", "potential": "high|medium|low", "rationale": "why"}],
    "risk_factors": [{"risk": "risk description", "severity": "high|medium|low", "mitigation": "suggested mitigation"}]
  }
}

Return ONLY the JSON object, no markdown formatting or code blocks.`;

  try {
    const { text, sources } = await callAI({
      instructions,
      prompt: userPrompt,
      webSearch: true,
    });

    if (!text) throw new Error("No content in API response");

    const findings = parseJsonFromText(text) as CompanyResearchFindings;
    if (sources.length > 0) findings.sources = sources;

    return findings;
  } catch (error) {
    console.error("Company deep research error:", error);
    return generateSimulatedCompanyFindings(company);
  }
}

// ─── Intelligence Report Generation ───

export async function generateIntelligenceReport(
  myCompany: CompanyProfile,
  allFindings: Array<{ competitorName: string; findings: CaseFileFindings }>,
  companyResearch?: CompanyResearchFindings | null
): Promise<{ content: string; highlights: string }> {
  const companyDeepDiveSection = companyResearch
    ? `

You also have a deep-dive self-assessment of ${myCompany.name} to use as a baseline for comparisons:
- Overview: ${companyResearch.overview.summary}
- Strengths: ${companyResearch.market_position.strengths.join(", ")}
- Weaknesses: ${companyResearch.market_position.weaknesses.join(", ")}
- SWOT Strengths: ${companyResearch.swot_analysis.strengths.join(", ")}
- SWOT Weaknesses: ${companyResearch.swot_analysis.weaknesses.join(", ")}
- SWOT Opportunities: ${companyResearch.swot_analysis.opportunities.join(", ")}
- SWOT Threats: ${companyResearch.swot_analysis.threats.join(", ")}
- Growth Areas: ${companyResearch.strategic_assessment.growth_areas.map((g) => g.area).join(", ")}
- Risk Factors: ${companyResearch.strategic_assessment.risk_factors.map((r) => r.risk).join(", ")}
- Market Position: ${companyResearch.market_position.summary}
- Customer Sentiment: ${companyResearch.customer_intelligence.sentiment}

Use this self-assessment to make DIRECT, SPECIFIC comparisons between ${myCompany.name} and each competitor. Identify where ${myCompany.name} has genuine advantages, where competitors outperform them, and where the gaps are.`
    : "";

  const systemPrompt = `You are a Chief Intelligence Officer preparing a strategic briefing for ${myCompany.name}.
Industry: ${myCompany.industry}
Products: ${myCompany.products}
Target Market: ${myCompany.target_market}
${companyDeepDiveSection}

Synthesize the competitive intelligence from multiple case files into a clear, actionable report.${companyResearch ? " Since you have the company's own deep-dive analysis, make sure to include direct head-to-head comparisons showing where the company stands versus each competitor on key dimensions (product, market position, digital presence, customer satisfaction, pricing)." : ""}`;

  const findingsSummary = allFindings
    .map((f) => {
      const scoreSection = f.findings.competitive_scores
        ? `\nScores (1-10): Product=${f.findings.competitive_scores.product_strength}, Market=${f.findings.competitive_scores.market_position}, Digital=${f.findings.competitive_scores.digital_presence}, Customer=${f.findings.competitive_scores.customer_satisfaction}, Pricing=${f.findings.competitive_scores.pricing_competitiveness}, Innovation=${f.findings.competitive_scores.innovation_velocity}, Threat=${f.findings.competitive_scores.overall_threat_level}`
        : "";
      return `## ${f.competitorName}\n${f.findings.overview.summary}\nStrengths: ${f.findings.market_position.strengths.join(", ")}\nWeaknesses: ${f.findings.market_position.weaknesses.join(", ")}\nThreats: ${f.findings.competitive_analysis.direct_threats.join(", ")}\nOpportunities: ${f.findings.competitive_analysis.opportunities_for_you.join(", ")}${scoreSection}`;
    })
    .join("\n\n");

  const userPrompt = `Based on the following competitive intelligence gathered from case files on our competitors, create two things:

COMPETITOR DATA:
${findingsSummary}

1. A comprehensive intelligence report (as markdown) covering:
- Executive summary of the competitive landscape${companyResearch ? "\n- Our company's position (based on our deep-dive self-assessment)" : ""}
- Key threats we need to address
- Opportunities we should pursue${companyResearch ? "\n- Head-to-head comparison matrix: our strengths vs each competitor's strengths" : ""}
- Market trends we're seeing across competitors
- Specific recommended actions with priority levels

2. A highlights JSON object with this structure:
{
  "executive_summary": "brief overview",
  "key_insights": [{"category": "category", "insight": "the insight", "impact": "high|medium|low", "competitor": "name"}],
  "threats": ["threat 1"],
  "opportunities": ["opportunity 1"],
  "recommended_actions": [{"action": "what to do", "priority": "high|medium|low", "timeline": "when"}],
  "market_trends": ["trend 1"]
}

Return your response in this EXACT format:
---REPORT---
[markdown report here]
---HIGHLIGHTS---
[JSON highlights here]`;

  if (!OPENAI_API_KEY) {
    return generateSimulatedReport(myCompany, allFindings);
  }

  try {
    const { text } = await callAI({
      instructions: systemPrompt,
      prompt: userPrompt,
      webSearch: false,
      maxTokens: 16384,
    });

    const reportMatch = text.split("---REPORT---")[1]?.split("---HIGHLIGHTS---")[0]?.trim();
    const highlightsMatch = text.split("---HIGHLIGHTS---")[1]?.trim();

    return {
      content: reportMatch || text,
      highlights: highlightsMatch || "{}",
    };
  } catch (error) {
    console.error("Intelligence report error:", error);
    return generateSimulatedReport(myCompany, allFindings);
  }
}

// ─── Simulated Findings (fallback when no API key) ───

function generateSimulatedFindings(context: ResearchContext): CaseFileFindings {
  const name = context.competitorName;
  const myName = context.myCompany.name || "your company";
  const industry = context.myCompany.industry || "the industry";

  return {
    overview: {
      summary: `${name} is a notable player in the ${industry} space that directly competes with ${myName}. They have established a recognizable brand presence and appear to be actively investing in growth. Their approach focuses on capturing market share through aggressive pricing and broad feature sets, which poses both a competitive challenge and reveals potential vulnerabilities in their strategy. A deeper look at their operations suggests they prioritize rapid expansion over depth of service, which could be leveraged by competitors who focus on quality and specialization.`,
      founded: "Information requires live research — connect an API key for web search",
      headquarters: "Information requires live research",
      employees: "Estimated 50-500 based on digital footprint",
      funding: "Information requires live research — check Crunchbase",
      revenue_estimate: "Information requires live research",
    },
    products_and_services: {
      summary: `${name} offers a range of products/services in the ${industry} space. Their portfolio appears to target similar customer segments as ${myName}, with some key differences in approach and packaging.`,
      items: [
        {
          name: "Core Platform",
          description: `Their primary offering that competes most directly with ${myName}'s main products. Appears to emphasize ease of use and quick onboarding.`,
          pricing: "Requires live research — connect API key for web search",
        },
        {
          name: "Enterprise Solution",
          description: "An upmarket offering targeting larger organizations with more complex needs.",
          pricing: "Likely custom/quote-based pricing",
        },
        {
          name: "Add-on Services",
          description: "Supplementary services including onboarding, training, and consulting.",
        },
      ],
    },
    market_position: {
      summary: `${name} occupies a competitive position in the ${industry} market. They appear to be positioning themselves as a comprehensive solution provider, which creates direct overlap with ${myName}'s territory.`,
      strengths: [
        "Broad feature set that appeals to generalist buyers",
        "Active marketing and content presence",
        "Apparent investment in growth and customer acquisition",
        "Name recognition within the industry",
      ],
      weaknesses: [
        "Breadth-over-depth approach may lead to feature bloat",
        "Rapid growth can strain support and service quality",
        "May lack the specialization that discerning buyers value",
        "Pricing strategy may not be sustainable long-term",
      ],
      market_share: "Requires live market research data",
    },
    digital_presence: {
      website_analysis: `${name}'s website appears professionally designed with clear messaging around their value proposition. They use standard SaaS conversion tactics including free trials, demo CTAs, and social proof.`,
      seo_observations: `They appear to target broad ${industry}-related keywords. Their content marketing suggests an SEO strategy focused on top-of-funnel educational content.`,
      social_media: [
        { platform: "LinkedIn", observations: "Active presence with regular company updates and thought leadership posts." },
        { platform: "Twitter/X", observations: "Moderate activity focused on product announcements and industry commentary." },
        { platform: "YouTube", observations: "Product demos and customer testimonials suggest investment in video marketing." },
      ],
      content_strategy: `${name} appears to employ a content-heavy marketing strategy with blog posts, webinars, and case studies targeting decision-makers.`,
    },
    customer_intelligence: {
      summary: `${name}'s customer base appears to span from SMBs to mid-market companies. Customer sentiment is mixed, with praise for ease of use but concerns about depth and support quality.`,
      target_segments: [
        "Small to mid-sized businesses in " + industry,
        "Teams looking for quick-to-implement solutions",
        "Cost-conscious buyers comparing multiple options",
      ],
      sentiment: "Generally positive with notable areas of frustration around advanced features and support responsiveness.",
      key_reviews: [
        "Users frequently praise the onboarding experience",
        "Common complaints about limitations when scaling",
        "Support response times are a recurring concern",
        "Pricing is competitive initially but escalates with add-ons",
      ],
    },
    competitive_analysis: {
      direct_threats: [
        `${name}'s aggressive pricing could pressure ${myName}'s margins`,
        "Their broad feature set may win feature-comparison evaluations",
        "Active marketing keeps them top-of-mind for prospects",
      ],
      opportunities_for_you: [
        `${myName} can win on depth and quality where ${name} spreads thin`,
        "Target dissatisfied customers needing advanced capabilities",
        "Emphasize superior support in competitive positioning",
        `Create comparison content highlighting ${myName}'s advantages`,
      ],
      key_differentiators: [
        "Emphasizes speed and simplicity",
        "Broader but shallower feature set",
        "Aggressive growth-oriented approach",
      ],
      pricing_comparison: `${name} appears to compete on price at the entry level but may have higher costs at scale.`,
    },
    recent_activity: {
      news: [
        { title: "Market Activity", summary: `${name} appears actively investing in growth. Connect an API key for real-time news.`, date: "Ongoing" },
      ],
      hiring_signals: `Monitor ${name}'s careers page for signals about strategic direction.`,
      partnerships: `Review ${name}'s partner page for recent additions.`,
    },
    strategic_recommendations: {
      summary: `${name} is a credible competitor. Their breadth-over-depth approach creates opportunities for ${myName} to differentiate on quality and customer success.`,
      action_items: [
        { priority: "high", action: `Create a competitive battle card for ${myName} vs ${name}`, rationale: "Equip your sales team for head-to-head evaluations" },
        { priority: "high", action: `Set up monitoring for ${name}'s public activity`, rationale: "Early awareness of competitive moves enables proactive responses" },
        { priority: "medium", action: `Develop content addressing ${name}'s weak points`, rationale: "Capture prospects evaluating alternatives" },
        { priority: "medium", action: "Strengthen customer success as a differentiator", rationale: "Double down where they're weak" },
        { priority: "low", action: `Conduct win/loss analysis for deals involving ${name}`, rationale: "Data-driven competitive strategy improvement" },
      ],
    },
    competitive_scores: {
      product_strength: 6,
      market_position: 6,
      digital_presence: 7,
      customer_satisfaction: 5,
      pricing_competitiveness: 7,
      innovation_velocity: 6,
      overall_threat_level: 6,
    },
  };
}

function generateSimulatedReport(
  myCompany: CompanyProfile,
  allFindings: Array<{ competitorName: string; findings: CaseFileFindings }>
): { content: string; highlights: string } {
  const myName = myCompany.name || "Your Company";
  const competitorNames = allFindings.map((f) => f.competitorName);

  const content = `# Competitive Intelligence Briefing
## Prepared for ${myName}

### Executive Summary

This intelligence report synthesizes findings from case files on ${competitorNames.length} competitor${competitorNames.length !== 1 ? "s" : ""}: ${competitorNames.join(", ")}. The competitive landscape in the ${myCompany.industry || "your"} industry shows several actionable patterns that ${myName} can leverage for strategic advantage.

### Competitive Landscape Overview

${allFindings
    .map(
      (f) => `#### ${f.competitorName}
${f.findings.overview.summary}

**Key Strengths:** ${f.findings.market_position.strengths.slice(0, 2).join("; ")}
**Key Weaknesses:** ${f.findings.market_position.weaknesses.slice(0, 2).join("; ")}
**Threat Level:** ${f.findings.competitive_scores?.overall_threat_level || "N/A"}/10`
    )
    .join("\n\n")}

### Critical Threats

${allFindings.flatMap((f) => f.findings.competitive_analysis.direct_threats.slice(0, 2).map((t) => `- ${t}`)).join("\n")}

### Strategic Opportunities

${allFindings.flatMap((f) => f.findings.competitive_analysis.opportunities_for_you.slice(0, 2).map((o) => `- ${o}`)).join("\n")}

### Recommended Priority Actions

${allFindings
    .flatMap((f) =>
      f.findings.strategic_recommendations.action_items
        .filter((a) => a.priority === "high")
        .map((a) => `1. **[${a.priority.toUpperCase()}]** ${a.action} — ${a.rationale}`)
    )
    .join("\n")}

### Market Signals to Monitor

- Track competitor hiring patterns for strategic direction clues
- Monitor product launches and feature updates across all competitors
- Watch for partnership announcements that could shift market dynamics
- Follow customer review trends for competitive sentiment shifts

---
*Report generated based on available competitive intelligence. Connect an OpenAI API key for live web-powered deep research.*`;

  const highlights = JSON.stringify({
    executive_summary: `Analysis of ${competitorNames.length} competitor${competitorNames.length !== 1 ? "s" : ""} reveals key strategic opportunities for ${myName}. The competitive landscape shows openings in service quality, specialization, and customer experience.`,
    key_insights: allFindings.flatMap((f) => [
      { category: "Market Position", insight: f.findings.market_position.summary, impact: "high" as const, competitor: f.competitorName },
      { category: "Customer Intelligence", insight: f.findings.customer_intelligence.sentiment, impact: "medium" as const, competitor: f.competitorName },
    ]),
    threats: allFindings.flatMap((f) => f.findings.competitive_analysis.direct_threats.slice(0, 2)),
    opportunities: allFindings.flatMap((f) => f.findings.competitive_analysis.opportunities_for_you.slice(0, 2)),
    recommended_actions: allFindings
      .flatMap((f) => f.findings.strategic_recommendations.action_items)
      .filter((a) => a.priority === "high")
      .map((a) => ({ action: a.action, priority: a.priority, timeline: "Within 2 weeks" })),
    market_trends: [
      "Competitors investing heavily in ease-of-use and onboarding",
      "Price competition intensifying at entry level",
      "Growing emphasis on content marketing and thought leadership",
      "Customer experience becoming a key differentiator",
    ],
  });

  return { content, highlights };
}

function generateSimulatedCompanyFindings(company: CompanyProfile): CompanyResearchFindings {
  const name = company.name || "Your Company";
  const industry = company.industry || "the industry";

  return {
    overview: {
      summary: `${name} operates in the ${industry} space with a focused approach to serving their target market. Based on available information, the company has established a recognizable presence in its niche and appears to be in a growth phase. Their stated focus on ${company.key_differentiators || "quality and innovation"} positions them as a specialist rather than generalist player, which can be both a strength and a limitation.`,
      founded: "Information requires live research — connect API key for web search",
      headquarters: "Information requires live research",
      employees: "Estimated based on digital footprint — requires verification",
      funding: "Information requires live research",
      revenue_estimate: "Information requires live research",
    },
    products_and_services: {
      summary: `${name}'s product portfolio centers around ${company.products || "their core offerings"}. Product-market fit appears solid for core offerings but untested in adjacent segments.`,
      items: [
        { name: "Core Product/Service", description: company.products || "Primary offering in " + industry, market_fit: "Appears strong for primary target segment." },
        { name: "Supporting Services", description: "Complementary services including onboarding, support, and consulting.", market_fit: "Standard for the industry." },
      ],
    },
    market_position: {
      summary: `${name} holds a competitive position in the ${industry} market with specialization giving them credibility.`,
      strengths: ["Focused expertise in specific market segments", "Clear value proposition and differentiation strategy", "Commitment to product quality over breadth", "Growing brand recognition within target market"],
      weaknesses: ["Limited brand awareness outside core segment", "Potential resource constraints vs larger competitors", "May lack enterprise-level feature breadth", "Digital presence could be more aggressive"],
      market_share: "Requires live market research data",
    },
    digital_presence: {
      website_analysis: `${name}'s website communicates their value proposition but may not be optimized for maximum conversion.`,
      seo_observations: `SEO presence appears moderate. Likely ranks well for branded terms but may underperform on high-value industry keywords.`,
      social_media: [
        { platform: "LinkedIn", observations: "Primary B2B channel with moderate engagement." },
        { platform: "Twitter/X", observations: "Presence exists but engagement levels suggest room for growth." },
      ],
      content_strategy: `Content marketing is an area of opportunity. Increasing educational content could improve inbound lead generation.`,
    },
    customer_intelligence: {
      summary: `Customers appear generally satisfied with the core product. Sentiment trends positive but public review samples may be limited.`,
      target_segments: [company.target_market || "Primary target market", "Adjacent segments in " + industry],
      sentiment: "Generally positive with customers valuing the focused approach. Some signals suggest desire for broader features and faster innovation.",
      key_reviews: ["Core product quality praised", "Specialized approach valued", "Some requests for broader features", "Support noted positively"],
    },
    swot_analysis: {
      strengths: ["Deep domain expertise", "Clear differentiation: " + (company.key_differentiators || "specialization"), "Solid product-market fit", "Positive customer retention"],
      weaknesses: ["Limited brand awareness outside core", "Resource constraints on feature development", "Digital marketing could be stronger", "Potential over-reliance on core product"],
      opportunities: ["Expand into adjacent market segments", "Increase content marketing", "Build strategic partnerships", "Target dissatisfied customers of larger competitors"],
      threats: ["Larger competitors increasing niche focus", "New entrants with more funding", "Market consolidation", "Technology shifts disrupting current architecture"],
    },
    recent_activity: {
      news: [{ title: "Market Presence", summary: `${name} is building presence in ${industry}. Connect API key for real-time news.`, date: "Ongoing" }],
      hiring_signals: `Monitor careers page for alignment with strategic priorities.`,
      partnerships: "Review current partnerships for gaps where alliances could accelerate growth.",
    },
    strategic_assessment: {
      summary: `${name} has a solid foundation with clear differentiation and positive customer sentiment. Primary challenge is scaling awareness while maintaining quality.`,
      growth_areas: [
        { area: "Content marketing and thought leadership", potential: "high", rationale: "Low-cost way to expand reach and authority" },
        { area: "Adjacent market segments", potential: "medium", rationale: "Domain expertise may transfer to related segments" },
        { area: "Strategic partnerships", potential: "medium", rationale: "Extend reach without building everything internally" },
      ],
      risk_factors: [
        { risk: "Competitive pressure from better-funded players", severity: "high", mitigation: "Double down on specialization advantages" },
        { risk: "Over-dependence on narrow segment", severity: "medium", mitigation: "Gradually validate adjacent segments" },
        { risk: "Talent retention", severity: "medium", mitigation: "Invest in culture and competitive compensation" },
      ],
    },
  };
}
