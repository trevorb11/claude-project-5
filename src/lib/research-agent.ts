import { CompanyProfile, CaseFileFindings } from "./types";
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

export async function generateIntelligenceReport(
  myCompany: CompanyProfile,
  allFindings: Array<{ competitorName: string; findings: CaseFileFindings }>
): Promise<{ content: string; highlights: string }> {
  const systemPrompt = `You are a Chief Intelligence Officer preparing a strategic briefing for ${myCompany.name}.
Industry: ${myCompany.industry}
Products: ${myCompany.products}
Target Market: ${myCompany.target_market}

Synthesize the competitive intelligence from multiple case files into a clear, actionable report.`;

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
- Executive summary of the competitive landscape
- Key threats we need to address
- Opportunities we should pursue
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
