import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
/* eslint-disable @typescript-eslint/no-unused-vars */
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";
const OPENAI_BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1";

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  baseURL: OPENAI_BASE_URL,
});

function isOpenAICompatible(): boolean {
  return (
    OPENAI_BASE_URL === "https://api.openai.com/v1" ||
    OPENAI_BASE_URL.includes("replit") ||
    !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY
  );
}

interface ScannedFloorPlan {
  model_name: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sq_ft: number | null;
  stories: number | null;
  garage_spaces: number | null;
  base_price: number | null;
  key_features: string[];
  url: string | null;
}

interface ScanResult {
  plans: ScannedFloorPlan[];
  sources: Array<{ title: string; url: string }>;
  builder_name: string;
  full_report: string;
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
}): { text: string; sources: Array<{ title: string; url: string }> } {
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
        model: "gpt-5.2",
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
    model: "gpt-5.2",
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

function parseJsonFromText(text: string): unknown {
  let cleaned = text.trim();

  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // continue
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = cleaned.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonCandidate);
    } catch {
      const fixed = jsonCandidate
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\x00-\x1F\x7F]/g, (ch) => (ch === "\n" || ch === "\r" || ch === "\t" ? ch : ""));
      try {
        return JSON.parse(fixed);
      } catch {
        const withoutCitations = fixed.replace(/【[^】]*】/g, "");
        return JSON.parse(withoutCitations);
      }
    }
  }

  throw new Error("No valid JSON object found in AI response");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url, builder_name, source } = body as {
    url: string;
    builder_name: string;
    source: "company" | "competitor";
  };

  if (!url || !builder_name) {
    return NextResponse.json(
      { error: "URL and builder name are required" },
      { status: 400 }
    );
  }

  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "AI is not configured. Please set up OpenAI integration first." },
      { status: 500 }
    );
  }

  try {
    const instructions = `You are an expert home builder researcher. Your job is to scan a builder's website and produce TWO things:

1. A comprehensive NARRATIVE REPORT about their floor plan offerings
2. A structured JSON data extract of every floor plan found

For the NARRATIVE REPORT, include:
- Overview of the builder's product lines, collections, and communities
- Pricing strategy and price range analysis
- Target market segments (first-time buyers, move-up, luxury, etc.)
- Notable design trends or unique features across their portfolio
- How their floor plans compare to typical market offerings
- Any promotions, incentives, or limited-time offers found
- Community/location information if available
- Any additional context about their building process, customization options, or included features

For the STRUCTURED DATA, extract every floor plan/model you can find with:
- Model names and plan names
- Square footage, bedrooms, bathrooms, stories
- Garage capacity (number of car spaces)
- Base pricing or "starting from" prices
- Key features and highlights
- URLs/links to specific floor plan pages

IMPORTANT INSTRUCTIONS:
- Search the website URL provided AND also search for "[builder name] floor plans" and "[builder name] model homes"
- Extract ALL floor plans/models you can find, not just a few
- For prices, extract the numeric value only (no dollar signs or commas). If a range is given, use the starting price.
- For square footage, extract the numeric value only
- If a value is not available, use null
- Be thorough — check multiple pages if the builder has many communities or collections

Return your response as a JSON object with this exact structure:
{
  "report": "Your comprehensive narrative report here as a single string with newlines for paragraphs...",
  "plans": [
    {
      "model_name": "Plan Name / Model Name",
      "bedrooms": 4,
      "bathrooms": 3,
      "sq_ft": 2500,
      "stories": 2,
      "garage_spaces": 2,
      "base_price": 450000,
      "key_features": ["Open concept", "Island kitchen", "Covered patio"],
      "url": "https://example.com/plans/model-name"
    }
  ],
  "builder_name": "Detected Builder Name"
}

Return ONLY the JSON object, no other text.`;

    const prompt = `Scan this home builder's website and extract all floor plans / model homes with their specs:

Website URL: ${url}
Builder Name: ${builder_name}

Search the website and related pages to find every available floor plan, model home, or home design. Extract complete specifications for each one.`;

    const result = await callAI({
      instructions,
      prompt,
      webSearch: true,
      maxTokens: 16384,
    });

    let scanResult: ScanResult;
    try {
      const parsed = parseJsonFromText(result.text) as {
        plans: ScannedFloorPlan[];
        builder_name?: string;
        report?: string;
      };
      scanResult = {
        plans: parsed.plans || [],
        sources: result.sources,
        builder_name: parsed.builder_name || builder_name,
        full_report: parsed.report || "",
      };
    } catch (parseError) {
      console.error("Failed to parse AI scan response. Raw text (first 1000 chars):", result.text.substring(0, 1000));
      console.error("Parse error:", parseError);
      return NextResponse.json(
        { error: "AI returned an unexpected format. Please try again — the web search found data but it couldn't be processed." },
        { status: 500 }
      );
    }

    if (scanResult.plans.length === 0) {
      return NextResponse.json(
        {
          plans: [],
          sources: scanResult.sources,
          builder_name: scanResult.builder_name,
          full_report: scanResult.full_report,
          message: "No floor plans found on this website. Try a more specific URL (e.g., the builder's floor plans or communities page).",
        }
      );
    }

    return NextResponse.json({
      plans: scanResult.plans,
      sources: scanResult.sources,
      builder_name: scanResult.builder_name,
      full_report: scanResult.full_report,
    });
  } catch (error) {
    console.error("Floor plan scan error:", error);
    return NextResponse.json(
      { error: "Failed to scan website. Please try again." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { plans, source, builder_name, competitor_id, full_report, scan_sources } = body as {
    plans: ScannedFloorPlan[];
    source: "company" | "competitor";
    builder_name: string;
    competitor_id?: string;
    full_report?: string;
    scan_sources?: Array<{ title: string; url: string }>;
  };

  if (!plans || plans.length === 0) {
    return NextResponse.json({ error: "No plans to import" }, { status: 400 });
  }

  if (source === "competitor" && !builder_name?.trim()) {
    return NextResponse.json({ error: "Builder name is required for competitor plans" }, { status: 400 });
  }

  const db = await getDb();
  const imported: unknown[] = [];

  for (const plan of plans) {
    const id = uuidv4();
    const pricePerSqft =
      plan.base_price && plan.sq_ft
        ? Math.round(plan.base_price / plan.sq_ft)
        : null;

    await db.run(
      `INSERT INTO floor_plans (id, source, competitor_id, competitor_name, model_name, bedrooms, bathrooms, sq_ft, stories, garage_spaces, base_price, price_per_sqft, key_features, url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        id,
        source,
        source === "competitor" ? (competitor_id || null) : null,
        source === "competitor" ? builder_name : null,
        plan.model_name,
        plan.bedrooms ?? null,
        plan.bathrooms ?? null,
        plan.sq_ft ?? null,
        plan.stories ?? null,
        plan.garage_spaces ?? null,
        plan.base_price ?? null,
        pricePerSqft,
        plan.key_features ? JSON.stringify(plan.key_features) : null,
        plan.url || null,
      ]
    );

    const saved = await db.getOne("SELECT * FROM floor_plans WHERE id = $1", [id]);
    imported.push(saved);
  }

  let caseFileId: string | null = null;

  if (full_report && full_report.trim()) {
    const planSummaryLines = plans.map(
      (p) =>
        `• ${p.model_name}: ${p.sq_ft ? p.sq_ft + " sq ft" : "N/A"}, ${p.bedrooms ?? "?"} bed / ${p.bathrooms ?? "?"} bath, ${p.base_price ? "$" + p.base_price.toLocaleString() : "Price N/A"}`
    );
    const summary = `Floor plan scan of ${builder_name} — found ${plans.length} plan(s):\n${planSummaryLines.join("\n")}`;

    const findings = {
      floor_plan_report: full_report,
      plans_extracted: plans.length,
      plan_details: plans,
      sources: scan_sources || [],
    };

    if (source === "competitor" && competitor_id) {
      caseFileId = uuidv4();
      await db.run(
        `INSERT INTO case_files (id, competitor_id, title, summary, research_type, status, findings, created_at, completed_at)
         VALUES ($1, $2, $3, $4, 'floor_plans', 'completed', $5, NOW(), NOW())`,
        [
          caseFileId,
          competitor_id,
          `Floor Plans — ${builder_name}`,
          summary,
          JSON.stringify(findings),
        ]
      );
    } else if (source === "company") {
      caseFileId = uuidv4();
      const companyRow = await db.getOne<{ id: string }>("SELECT id FROM company_profile LIMIT 1");
      if (companyRow) {
        await db.run(
          `INSERT INTO case_files (id, competitor_id, title, summary, research_type, status, findings, created_at, completed_at)
           VALUES ($1, $2, $3, $4, 'floor_plans', 'completed', $5, NOW(), NOW())`,
          [
            caseFileId,
            `company_${companyRow.id}`,
            `Floor Plans — ${builder_name}`,
            summary,
            JSON.stringify(findings),
          ]
        );
      }
    }
  }

  return NextResponse.json({ imported, count: imported.length, case_file_id: caseFileId });
}
