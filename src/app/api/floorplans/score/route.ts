import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { FloorPlan } from "@/lib/types";
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";
const OPENAI_BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1";

export async function POST() {
  const db = await getDb();
  const plans = await db.getAll<FloorPlan>("SELECT * FROM floor_plans");

  if (plans.length === 0) {
    return NextResponse.json({ scored: 0 });
  }

  const planSummaries = plans.map((p) => ({
    id: p.id,
    model_name: p.model_name,
    company: p.source === "company" ? "Our Company" : p.competitor_name,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    sq_ft: p.sq_ft,
    stories: p.stories,
    garage_spaces: p.garage_spaces,
    base_price: p.base_price,
    price_per_sqft: p.price_per_sqft,
    key_features: p.key_features ? JSON.parse(p.key_features) : [],
  }));

  let scores: Record<string, number> = {};

  if (OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({
        apiKey: OPENAI_API_KEY,
        baseURL: OPENAI_BASE_URL,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          {
            role: "system",
            content: `You are a real estate value analyst. Score each floor plan on a 1-10 "best value" scale considering:
- Price relative to square footage (lower $/sqft = better value)
- Number of bedrooms and bathrooms for the price
- Number of stories and garage spaces as bonus value
- Key features and included upgrades
- Overall bang-for-the-buck

Be fair and objective. A modest home at a great price can score higher than a luxury home if the value proposition is stronger. Score honestly regardless of which company offers it.`,
          },
          {
            role: "user",
            content: `Score these floor plans on a 1-10 "best value" scale. Return ONLY a JSON object mapping plan ID to score, like: {"id1": 8, "id2": 6, ...}

Floor Plans:
${JSON.stringify(planSummaries, null, 2)}`,
          },
        ],
        temperature: 0.3,
        max_completion_tokens: 2048,
      });

      const text = response.choices?.[0]?.message?.content || "{}";
      let cleaned = text.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      scores = JSON.parse(cleaned);
    } catch (error) {
      console.error("Floor plan scoring error:", error);
      scores = computeHeuristicScores(plans);
    }
  } else {
    scores = computeHeuristicScores(plans);
  }

  let scored = 0;
  for (const [id, score] of Object.entries(scores)) {
    if (typeof score === "number" && score >= 1 && score <= 10) {
      await db.run(
        "UPDATE floor_plans SET value_score = $1, updated_at = NOW() WHERE id = $2",
        [score, id]
      );
      scored++;
    }
  }

  return NextResponse.json({ scored, total: plans.length });
}

function computeHeuristicScores(plans: FloorPlan[]): Record<string, number> {
  const scores: Record<string, number> = {};

  const ppsqfts = plans.filter((p) => p.price_per_sqft).map((p) => p.price_per_sqft!);
  const sqfts = plans.filter((p) => p.sq_ft).map((p) => p.sq_ft!);

  const minPPSF = ppsqfts.length > 0 ? Math.min(...ppsqfts) : 100;
  const maxPPSF = ppsqfts.length > 0 ? Math.max(...ppsqfts) : 300;
  const maxBeds = Math.max(...plans.map((p) => p.bedrooms || 0), 1);
  const maxSqft = sqfts.length > 0 ? Math.max(...sqfts) : 3000;

  for (const plan of plans) {
    let score = 5;

    if (plan.price_per_sqft && maxPPSF > minPPSF) {
      const ppsfNorm = 1 - (plan.price_per_sqft - minPPSF) / (maxPPSF - minPPSF);
      score += ppsfNorm * 2;
    }

    if (plan.sq_ft && maxSqft > 0) {
      score += (plan.sq_ft / maxSqft) * 1;
    }

    if (plan.bedrooms) {
      score += (plan.bedrooms / maxBeds) * 1;
    }

    if (plan.garage_spaces && plan.garage_spaces >= 2) {
      score += 0.5;
    }

    scores[plan.id] = Math.max(1, Math.min(10, Math.round(score * 10) / 10));
  }

  return scores;
}
