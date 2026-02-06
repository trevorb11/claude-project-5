import { CompanyProfile, CaseFileFindings, CompanyResearchFindings } from "./types";
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";
const OPENAI_BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1";

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  baseURL: OPENAI_BASE_URL,
});

interface ResearchContext {
  myCompany: CompanyProfile;
  competitorName: string;
  competitorWebsite?: string;
  competitorNotes?: string;
}

export async function runDeepResearch(
  context: ResearchContext
): Promise<CaseFileFindings> {
  // Build a thorough research prompt that leverages user's company context
  const systemPrompt = `You are an elite competitive intelligence analyst. You have deep expertise in market research, digital forensics, business analysis, and strategic consulting.

You are conducting research for: ${context.myCompany.name}
Industry: ${context.myCompany.industry}
What they do: ${context.myCompany.description}
Products/Services: ${context.myCompany.products}
Target Market: ${context.myCompany.target_market}
Key Differentiators: ${context.myCompany.key_differentiators}

Your job is to create a comprehensive competitive intelligence case file on the target competitor. Think like a detective building a case — leave no digital stone unturned. Your analysis should be specifically tailored to what would be most useful for ${context.myCompany.name} given their industry position and offerings.

IMPORTANT: Be specific, factual, and actionable. Avoid generic statements. Every insight should be something the user can actually use to compete better.`;

  const userPrompt = `Create a comprehensive competitive intelligence case file for: ${context.competitorName}
${context.competitorWebsite ? `Website: ${context.competitorWebsite}` : ""}
${context.competitorNotes ? `Additional context: ${context.competitorNotes}` : ""}

Research and analyze every aspect of this competitor. Dig into their digital traces, public information, market positioning, and strategic moves. Focus on what matters most for ${context.myCompany.name} competing against them.

Return your findings as a JSON object with this exact structure:
{
  "overview": {
    "summary": "2-3 paragraph executive summary of who they are and why they matter",
    "founded": "founding year or 'Unknown'",
    "headquarters": "location",
    "employees": "estimated employee count or range",
    "funding": "funding information if available",
    "revenue_estimate": "estimated revenue or range"
  },
  "products_and_services": {
    "summary": "overview of their product/service portfolio",
    "items": [{"name": "product name", "description": "what it does", "pricing": "pricing if known"}]
  },
  "market_position": {
    "summary": "their position in the market relative to ${context.myCompany.name}",
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1", "weakness 2"],
    "market_share": "estimated market share if known"
  },
  "digital_presence": {
    "website_analysis": "analysis of their website, UX, messaging, conversion tactics",
    "seo_observations": "what they appear to be targeting SEO-wise",
    "social_media": [{"platform": "platform name", "observations": "what they do there"}],
    "content_strategy": "analysis of their content marketing approach"
  },
  "customer_intelligence": {
    "summary": "overview of their customer base",
    "target_segments": ["segment 1", "segment 2"],
    "sentiment": "general customer sentiment analysis",
    "key_reviews": ["notable review/feedback point 1", "point 2"]
  },
  "competitive_analysis": {
    "direct_threats": ["threat to ${context.myCompany.name} 1", "threat 2"],
    "opportunities_for_you": ["opportunity 1", "opportunity 2"],
    "key_differentiators": ["how they differentiate 1", "how they differentiate 2"],
    "pricing_comparison": "how their pricing compares"
  },
  "recent_activity": {
    "news": [{"title": "headline", "summary": "what happened", "date": "when"}],
    "hiring_signals": "what their hiring patterns tell us",
    "partnerships": "notable partnerships or integrations"
  },
  "strategic_recommendations": {
    "summary": "overall strategic take for ${context.myCompany.name}",
    "action_items": [{"priority": "high|medium|low", "action": "what to do", "rationale": "why"}]
  }
}

Return ONLY the JSON object, no markdown formatting or code blocks.`;

  if (!OPENAI_API_KEY) {
    return generateSimulatedFindings(context);
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_completion_tokens: 8192,
    });

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in API response");
    }

    let cleanContent = content.trim();
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const findings: CaseFileFindings = JSON.parse(cleanContent);
    return findings;
  } catch (error) {
    console.error("Research agent error:", error);
    return generateSimulatedFindings(context);
  }
}

export async function runCompanyDeepResearch(
  company: CompanyProfile
): Promise<CompanyResearchFindings> {
  const systemPrompt = `You are an elite business intelligence analyst conducting a comprehensive self-assessment and market analysis. You have deep expertise in market research, digital forensics, SWOT analysis, and strategic consulting.

You are analyzing: ${company.name}
Industry: ${company.industry}
Description: ${company.description}
Products/Services: ${company.products}
Target Market: ${company.target_market}
Stated Differentiators: ${company.key_differentiators}

Your job is to create an honest, thorough deep-dive analysis of this company from an outside-in perspective. Think like a due diligence analyst — be objective, identify real strengths AND real vulnerabilities. This analysis will be used as a baseline when comparing against competitors, so accuracy and depth are critical.

IMPORTANT: Be specific, factual, and brutally honest. Avoid generic praise. The company needs to know its real position — strengths to leverage and weaknesses to address before competitors exploit them.`;

  const userPrompt = `Create a comprehensive deep-dive analysis of ${company.name}. Research everything you can about this company from public information. Analyze their actual market position, digital footprint, customer perception, and strategic standing.

Return your findings as a JSON object with this exact structure:
{
  "overview": {
    "summary": "2-3 paragraph honest executive summary of the company's current state and market position",
    "founded": "founding year or 'Unknown'",
    "headquarters": "location",
    "employees": "estimated employee count or range",
    "funding": "funding information if available",
    "revenue_estimate": "estimated revenue or range"
  },
  "products_and_services": {
    "summary": "objective assessment of their product/service portfolio — what's strong and what's weak",
    "items": [{"name": "product name", "description": "what it does", "market_fit": "how well it fits the market need"}]
  },
  "market_position": {
    "summary": "honest assessment of where ${company.name} stands in the market",
    "strengths": ["real strength 1", "real strength 2"],
    "weaknesses": ["real weakness 1", "real weakness 2"],
    "market_share": "estimated market share or position"
  },
  "digital_presence": {
    "website_analysis": "analysis of their website effectiveness, UX, messaging, conversion",
    "seo_observations": "SEO strength and opportunities",
    "social_media": [{"platform": "platform name", "observations": "effectiveness assessment"}],
    "content_strategy": "analysis of content marketing quality and strategy"
  },
  "customer_intelligence": {
    "summary": "what customers actually think based on available signals",
    "target_segments": ["segment 1", "segment 2"],
    "sentiment": "honest customer sentiment analysis",
    "key_reviews": ["notable review/feedback point 1", "point 2"]
  },
  "swot_analysis": {
    "strengths": ["internal strength 1", "internal strength 2"],
    "weaknesses": ["internal weakness 1", "internal weakness 2"],
    "opportunities": ["market opportunity 1", "market opportunity 2"],
    "threats": ["external threat 1", "external threat 2"]
  },
  "recent_activity": {
    "news": [{"title": "headline", "summary": "what happened", "date": "when"}],
    "hiring_signals": "what hiring patterns reveal about company direction",
    "partnerships": "notable partnerships or integrations"
  },
  "strategic_assessment": {
    "summary": "overall strategic position and readiness to compete",
    "growth_areas": [{"area": "growth area", "potential": "high|medium|low", "rationale": "why"}],
    "risk_factors": [{"risk": "risk description", "severity": "high|medium|low", "mitigation": "suggested mitigation"}]
  }
}

Return ONLY the JSON object, no markdown formatting or code blocks.`;

  if (!OPENAI_API_KEY) {
    return generateSimulatedCompanyFindings(company);
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_completion_tokens: 8192,
    });

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in API response");
    }

    let cleanContent = content.trim();
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const findings: CompanyResearchFindings = JSON.parse(cleanContent);
    return findings;
  } catch (error) {
    console.error("Company deep research error:", error);
    return generateSimulatedCompanyFindings(company);
  }
}

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
    .map(
      (f) =>
        `## ${f.competitorName}\n${f.findings.overview.summary}\nStrengths: ${f.findings.market_position.strengths.join(", ")}\nWeaknesses: ${f.findings.market_position.weaknesses.join(", ")}\nThreats: ${f.findings.competitive_analysis.direct_threats.join(", ")}\nOpportunities: ${f.findings.competitive_analysis.opportunities_for_you.join(", ")}`
    )
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
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_completion_tokens: 8192,
    });

    const content = response.choices?.[0]?.message?.content || "";

    const reportMatch = content.split("---REPORT---")[1]?.split("---HIGHLIGHTS---")[0]?.trim();
    const highlightsMatch = content.split("---HIGHLIGHTS---")[1]?.trim();

    return {
      content: reportMatch || content,
      highlights: highlightsMatch || "{}",
    };
  } catch (error) {
    console.error("Intelligence report error:", error);
    return generateSimulatedReport(myCompany, allFindings);
  }
}

function generateSimulatedFindings(context: ResearchContext): CaseFileFindings {
  const name = context.competitorName;
  const myName = context.myCompany.name || "your company";
  const industry = context.myCompany.industry || "the industry";

  return {
    overview: {
      summary: `${name} is a notable player in the ${industry} space that directly competes with ${myName}. They have established a recognizable brand presence and appear to be actively investing in growth. Their approach focuses on capturing market share through aggressive pricing and broad feature sets, which poses both a competitive challenge and reveals potential vulnerabilities in their strategy. A deeper look at their operations suggests they prioritize rapid expansion over depth of service, which could be leveraged by competitors who focus on quality and specialization.`,
      founded: "Information requires live research",
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
          pricing: "Requires live research — check their pricing page",
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
      website_analysis: `${name}'s website appears professionally designed with clear messaging around their value proposition. They use standard SaaS conversion tactics including free trials, demo CTAs, and social proof. Their messaging emphasizes speed and simplicity, which may resonate with buyers who prioritize ease over capability.`,
      seo_observations: `They appear to target broad ${industry}-related keywords. Their content marketing suggests an SEO strategy focused on top-of-funnel educational content to capture search traffic. This is an area where ${myName} could compete by creating more specialized, in-depth content.`,
      social_media: [
        {
          platform: "LinkedIn",
          observations: "Active presence with regular company updates, thought leadership posts, and employee advocacy. This is likely their primary B2B social channel.",
        },
        {
          platform: "Twitter/X",
          observations: "Moderate activity focused on product announcements and industry commentary.",
        },
        {
          platform: "YouTube",
          observations: "Product demos and customer testimonials suggest investment in video marketing.",
        },
      ],
      content_strategy: `${name} appears to employ a content-heavy marketing strategy with blog posts, webinars, and case studies. Their content tends toward broad industry topics rather than deep technical material, suggesting they target decision-makers rather than technical practitioners.`,
    },
    customer_intelligence: {
      summary: `${name}'s customer base appears to span from SMBs to mid-market companies in the ${industry} space. Customer sentiment is mixed, with praise for ease of use but some concerns about depth and support quality.`,
      target_segments: [
        "Small to mid-sized businesses in " + industry,
        "Teams looking for quick-to-implement solutions",
        "Cost-conscious buyers comparing multiple options",
        "Organizations in growth phase needing scalable tools",
      ],
      sentiment: "Generally positive with notable areas of customer frustration around advanced features and support responsiveness. This represents an opportunity for competitors who excel in these areas.",
      key_reviews: [
        "Users frequently praise the onboarding experience and initial ease of use",
        "Common complaints about limitations when trying to scale or customize",
        "Support response times are a recurring concern in reviews",
        "Pricing is seen as competitive initially but can escalate with add-ons",
      ],
    },
    competitive_analysis: {
      direct_threats: [
        `${name}'s aggressive pricing could pressure ${myName}'s margins in competitive deals`,
        "Their broad feature set may win feature-comparison evaluations",
        "Active marketing presence keeps them top-of-mind for prospects",
        "They may be acquiring customers who would otherwise consider " + myName,
      ],
      opportunities_for_you: [
        `${myName} can win on depth and quality where ${name} spreads thin`,
        "Target dissatisfied customers who need more advanced capabilities",
        "Emphasize superior support and customer success in competitive positioning",
        `Create comparison content that highlights ${myName}'s specific advantages`,
        "Focus on the segments where specialization matters most",
      ],
      key_differentiators: [
        "Emphasizes speed and simplicity in their messaging",
        "Broader but potentially shallower feature set",
        "Aggressive growth-oriented market approach",
        "May offer lower entry-point pricing",
      ],
      pricing_comparison: `Based on available information, ${name} appears to compete on price at the entry level but may have comparable or higher costs at scale. A detailed pricing analysis requires checking their current pricing page and comparing feature-by-feature with ${myName}'s offerings.`,
    },
    recent_activity: {
      news: [
        {
          title: "Market Activity",
          summary: `${name} appears to be actively investing in growth. Monitor their press page, blog, and social media for the latest announcements. Setting up Google Alerts for "${name}" is recommended.`,
          date: "Ongoing",
        },
        {
          title: "Product Development",
          summary: "Check their changelog, blog, and social channels for recent product updates and feature releases that may affect competitive positioning.",
          date: "Ongoing",
        },
      ],
      hiring_signals: `Monitor ${name}'s careers page and LinkedIn job postings for signals about their strategic direction. Key roles to watch: engineering (product investment), sales (growth push), and new market roles (expansion plans).`,
      partnerships: `Review ${name}'s partner/integrations page for recent additions. New partnerships can signal strategic direction and potential competitive threats.`,
    },
    strategic_recommendations: {
      summary: `${name} is a credible competitor that ${myName} should monitor actively. Their breadth-over-depth approach creates clear opportunities for ${myName} to differentiate on quality, specialization, and customer success. The key is to compete on value rather than features, and to clearly articulate why ${myName}'s approach delivers better outcomes.`,
      action_items: [
        {
          priority: "high",
          action: `Create a competitive battle card comparing ${myName} vs ${name} for your sales team`,
          rationale: "Ensure your team can articulate clear advantages in head-to-head evaluations",
        },
        {
          priority: "high",
          action: `Set up monitoring for ${name}'s public activity (Google Alerts, social follows, job board tracking)`,
          rationale: "Early awareness of competitive moves allows proactive rather than reactive responses",
        },
        {
          priority: "medium",
          action: `Develop targeted content addressing pain points where ${name} falls short`,
          rationale: "Capture prospects who are evaluating alternatives or experiencing dissatisfaction",
        },
        {
          priority: "medium",
          action: "Strengthen customer success and support as a competitive differentiator",
          rationale: `If ${name}'s support is a weakness, doubling down here creates a clear advantage`,
        },
        {
          priority: "low",
          action: `Conduct periodic win/loss analysis for deals involving ${name}`,
          rationale: "Data-driven understanding of why you win or lose against them improves strategy over time",
        },
      ],
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
**Key Weaknesses:** ${f.findings.market_position.weaknesses.slice(0, 2).join("; ")}`
    )
    .join("\n\n")}

### Critical Threats

${allFindings
    .flatMap((f) =>
      f.findings.competitive_analysis.direct_threats.slice(0, 2).map((t) => `- ${t}`)
    )
    .join("\n")}

### Strategic Opportunities

${allFindings
    .flatMap((f) =>
      f.findings.competitive_analysis.opportunities_for_you.slice(0, 2).map((o) => `- ${o}`)
    )
    .join("\n")}

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
*Report generated based on available competitive intelligence. For maximum accuracy, connect an OpenAI API key to enable live AI-powered deep research.*`;

  const highlights = JSON.stringify({
    executive_summary: `Analysis of ${competitorNames.length} competitor${competitorNames.length !== 1 ? "s" : ""} reveals key strategic opportunities for ${myName}. The competitive landscape shows openings in service quality, specialization, and customer experience that ${myName} can exploit.`,
    key_insights: allFindings.flatMap((f) => [
      {
        category: "Market Position",
        insight: f.findings.market_position.summary,
        impact: "high" as const,
        competitor: f.competitorName,
      },
      {
        category: "Customer Intelligence",
        insight: f.findings.customer_intelligence.sentiment,
        impact: "medium" as const,
        competitor: f.competitorName,
      },
    ]),
    threats: allFindings.flatMap((f) =>
      f.findings.competitive_analysis.direct_threats.slice(0, 2)
    ),
    opportunities: allFindings.flatMap((f) =>
      f.findings.competitive_analysis.opportunities_for_you.slice(0, 2)
    ),
    recommended_actions: allFindings
      .flatMap((f) => f.findings.strategic_recommendations.action_items)
      .filter((a) => a.priority === "high")
      .map((a) => ({
        action: a.action,
        priority: a.priority,
        timeline: "Within 2 weeks",
      })),
    market_trends: [
      "Competitors investing heavily in ease-of-use and onboarding",
      "Price competition intensifying at entry level",
      "Growing emphasis on content marketing and thought leadership",
      "Customer experience becoming a key differentiator",
    ],
  });

  return { content, highlights };
}

function generateSimulatedCompanyFindings(
  company: CompanyProfile
): CompanyResearchFindings {
  const name = company.name || "Your Company";
  const industry = company.industry || "the industry";

  return {
    overview: {
      summary: `${name} operates in the ${industry} space with a focused approach to serving their target market. Based on available information, the company has established a recognizable presence in its niche and appears to be in a growth phase. Their stated focus on ${company.key_differentiators || "quality and innovation"} positions them as a specialist rather than generalist player, which can be both a strength (depth of expertise) and a limitation (narrower addressable market). A thorough external assessment suggests the company has solid foundations but faces the typical challenges of competing against both larger incumbents and agile newcomers.`,
      founded: "Information requires live research",
      headquarters: "Information requires live research",
      employees: "Estimated based on digital footprint — requires verification",
      funding: "Information requires live research — check Crunchbase",
      revenue_estimate: "Information requires live research",
    },
    products_and_services: {
      summary: `${name}'s product portfolio centers around ${company.products || "their core offerings"}. The lineup appears well-targeted for their stated market but may have gaps that competitors could exploit. Product-market fit appears solid for core offerings but untested in adjacent segments.`,
      items: [
        {
          name: "Core Product/Service",
          description: company.products || "Primary offering in " + industry,
          market_fit: "Appears strong for primary target segment. Opportunity to validate fit in adjacent markets.",
        },
        {
          name: "Supporting Services",
          description: "Complementary services around the core offering including onboarding, support, and consulting.",
          market_fit: "Standard for the industry. Could be a differentiator if elevated beyond competitor norms.",
        },
      ],
    },
    market_position: {
      summary: `${name} holds a competitive position in the ${industry} market. Their specialization gives them credibility with their target audience, but market share appears modest compared to larger players. The company's positioning around ${company.key_differentiators || "differentiation"} is a viable strategy if consistently executed.`,
      strengths: [
        "Focused expertise in specific market segments",
        "Clear value proposition and differentiation strategy",
        "Apparent commitment to product quality over breadth",
        "Growing brand recognition within target market",
      ],
      weaknesses: [
        "Limited brand awareness outside core market segment",
        "Potential resource constraints compared to larger competitors",
        "May lack the breadth of features that enterprise buyers expect",
        "Digital presence and content marketing could be more aggressive",
      ],
      market_share: "Requires live market research data for accurate estimate",
    },
    digital_presence: {
      website_analysis: `${name}'s website communicates their value proposition but may not be optimized for maximum conversion. The messaging appears clear to existing audiences but could be more compelling for prospects unfamiliar with the company. UX and design are functional but there may be room for improvement in terms of social proof, case studies, and conversion optimization.`,
      seo_observations: `SEO presence appears moderate. ${name} likely ranks well for branded terms but may underperform on high-value industry keywords. Content depth and frequency could be improved to capture more organic search traffic and establish thought leadership.`,
      social_media: [
        {
          platform: "LinkedIn",
          observations: "Primary B2B channel with moderate engagement. Opportunity to increase thought leadership content and employee advocacy.",
        },
        {
          platform: "Twitter/X",
          observations: "Presence exists but engagement levels suggest room for more strategic use of the platform.",
        },
      ],
      content_strategy: `Content marketing appears to be an area of opportunity for ${name}. Increasing the volume and depth of educational content could significantly improve inbound lead generation and brand authority. Current output may not be sufficient to compete with more content-aggressive competitors.`,
    },
    customer_intelligence: {
      summary: `${name}'s customers appear generally satisfied with the core product experience. Customer segments align with stated targets: ${company.target_market || "their target market"}. Sentiment trends positive but sample sizes for public reviews may be limited.`,
      target_segments: [
        company.target_market || "Primary target market",
        "Adjacent segments showing interest in " + industry + " solutions",
        "Underserved niches where specialized solutions are valued",
      ],
      sentiment: "Generally positive with customers valuing the focused approach and quality. Some signals suggest customers want more breadth of features and faster innovation cycles. Customer success and support appear to be a strength worth doubling down on.",
      key_reviews: [
        "Core product quality consistently praised by users",
        "Customers value the specialized approach over generalist alternatives",
        "Some requests for broader feature coverage and integrations",
        "Support responsiveness noted positively — potential competitive advantage",
      ],
    },
    swot_analysis: {
      strengths: [
        "Deep domain expertise and market-specific knowledge",
        "Clear differentiation strategy: " + (company.key_differentiators || "focused specialization"),
        "Solid product-market fit with core customer segments",
        "Positive customer sentiment and retention indicators",
      ],
      weaknesses: [
        "Brand awareness limited outside primary market segment",
        "Resource constraints may limit speed of feature development",
        "Digital marketing and content could be more aggressive",
        "Potential over-reliance on core product without diversification",
      ],
      opportunities: [
        "Expand into adjacent market segments where expertise transfers",
        "Increase content marketing to capture thought leadership position",
        "Build strategic partnerships and integrations to extend reach",
        "Target dissatisfied customers of larger, less specialized competitors",
      ],
      threats: [
        "Larger competitors could enter or increase focus on your niche",
        "New entrants with more funding could undercut on price or features",
        "Market consolidation could reduce the number of independent buyers",
        "Technology shifts could disrupt current product architecture",
      ],
    },
    recent_activity: {
      news: [
        {
          title: "Market Presence",
          summary: `${name} appears to be actively building their presence in the ${industry} space. Monitor press coverage, blog output, and social signals for trajectory indicators. Setting up Google Alerts for "${name}" is recommended.`,
          date: "Ongoing",
        },
      ],
      hiring_signals: `Monitor ${name}'s own careers page and LinkedIn postings to ensure hiring aligns with strategic priorities. Key areas to track: engineering velocity, sales capacity, and any new market-facing roles.`,
      partnerships: "Review and catalog current partnerships and integrations. Identify gaps where strategic alliances could accelerate growth or improve competitive positioning.",
    },
    strategic_assessment: {
      summary: `${name} has a solid foundation in the ${industry} market with clear differentiation and positive customer sentiment. The primary challenge is scaling awareness and market share while maintaining the quality and focus that defines the brand. The company should invest in making its strengths more visible (content, digital presence) while shoring up potential weaknesses before competitors can exploit them.`,
      growth_areas: [
        {
          area: "Content marketing and thought leadership",
          potential: "high",
          rationale: "Relatively low-cost way to expand reach and establish authority, directly supporting sales pipeline",
        },
        {
          area: "Adjacent market segments",
          potential: "medium",
          rationale: "Domain expertise may transfer to related segments, expanding TAM without major product changes",
        },
        {
          area: "Strategic partnerships and integrations",
          potential: "medium",
          rationale: "Can extend product reach and stickiness without building everything internally",
        },
      ],
      risk_factors: [
        {
          risk: "Competitive pressure from better-funded players",
          severity: "high",
          mitigation: "Double down on specialization advantages and customer relationships that large players can't easily replicate",
        },
        {
          risk: "Over-dependence on a narrow market segment",
          severity: "medium",
          mitigation: "Gradually validate adjacent segments while protecting the core business",
        },
        {
          risk: "Talent retention in a competitive hiring market",
          severity: "medium",
          mitigation: "Invest in culture, mission alignment, and competitive compensation to retain key team members",
        },
      ],
    },
  };
}
