import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

const EXPECTED_HEADERS = [
  "model_name",
  "bedrooms",
  "bathrooms",
  "sq_ft",
  "stories",
  "garage_spaces",
  "base_price",
  "key_features",
  "url",
];

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function parseNumber(val: string): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[$,\s]/g, "");
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const source = (formData.get("source") as string) || "company";
    const competitorId = formData.get("competitor_id") as string | null;
    const competitorName = formData.get("competitor_name") as string | null;
    const mode = (formData.get("mode") as string) || "preview";

    if (!file) {
      return NextResponse.json({ error: "No CSV file provided" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV must have a header row and at least one data row" },
        { status: 400 }
      );
    }

    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine).map((h) =>
      h.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
    );

    const modelIdx = headers.findIndex((h) => h === "model_name" || h === "model" || h === "name" || h === "plan_name" || h === "plan");
    if (modelIdx === -1) {
      return NextResponse.json(
        {
          error:
            'CSV must include a "model_name" (or "model", "name", "plan_name", "plan") column',
          expected_headers: EXPECTED_HEADERS,
        },
        { status: 400 }
      );
    }

    const colMap: Record<string, number> = {};
    const aliases: Record<string, string[]> = {
      model_name: ["model_name", "model", "name", "plan_name", "plan"],
      bedrooms: ["bedrooms", "beds", "bed", "br"],
      bathrooms: ["bathrooms", "baths", "bath", "ba"],
      sq_ft: ["sq_ft", "sqft", "square_feet", "square_footage", "size"],
      stories: ["stories", "story", "floors", "levels"],
      garage_spaces: ["garage_spaces", "garage", "garages", "car_garage"],
      base_price: ["base_price", "price", "starting_price", "msrp"],
      key_features: ["key_features", "features"],
      url: ["url", "link", "website"],
    };

    for (const [field, names] of Object.entries(aliases)) {
      const idx = headers.findIndex((h) => names.includes(h));
      if (idx !== -1) colMap[field] = idx;
    }

    const rows: Array<{
      model_name: string;
      bedrooms: number | null;
      bathrooms: number | null;
      sq_ft: number | null;
      stories: number | null;
      garage_spaces: number | null;
      base_price: number | null;
      price_per_sqft: number | null;
      key_features: string[];
      url: string | null;
    }> = [];

    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const modelName = colMap.model_name !== undefined ? values[colMap.model_name]?.trim() : "";

      if (!modelName) {
        errors.push(`Row ${i + 1}: missing model name, skipped`);
        continue;
      }

      const bedrooms = colMap.bedrooms !== undefined ? parseNumber(values[colMap.bedrooms]) : null;
      const bathrooms = colMap.bathrooms !== undefined ? parseNumber(values[colMap.bathrooms]) : null;
      const sqFt = colMap.sq_ft !== undefined ? parseNumber(values[colMap.sq_ft]) : null;
      const storiesVal = colMap.stories !== undefined ? parseNumber(values[colMap.stories]) : null;
      const garageSpaces = colMap.garage_spaces !== undefined ? parseNumber(values[colMap.garage_spaces]) : null;
      const basePrice = colMap.base_price !== undefined ? parseNumber(values[colMap.base_price]) : null;
      const pricePerSqft = basePrice && sqFt ? Math.round(basePrice / sqFt) : null;

      let keyFeatures: string[] = [];
      if (colMap.key_features !== undefined && values[colMap.key_features]) {
        const raw = values[colMap.key_features].trim();
        keyFeatures = raw.split(/[;|]/).map((f) => f.trim()).filter(Boolean);
      }

      const url = colMap.url !== undefined ? values[colMap.url]?.trim() || null : null;

      rows.push({
        model_name: modelName,
        bedrooms,
        bathrooms,
        sq_ft: sqFt,
        stories: storiesVal,
        garage_spaces: garageSpaces,
        base_price: basePrice,
        price_per_sqft: pricePerSqft,
        key_features: keyFeatures,
        url,
      });
    }

    if (mode === "preview") {
      return NextResponse.json({
        preview: true,
        plans: rows,
        total: rows.length,
        errors,
        matched_columns: Object.keys(colMap),
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({ imported: 0, plans: [], errors });
    }

    if (source === "competitor" && !competitorId && !competitorName) {
      return NextResponse.json(
        { error: "Competitor name or selection is required when importing competitor plans" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const ids: string[] = [];

    for (const plan of rows) {
      const id = uuidv4();
      await db.run(
        `INSERT INTO floor_plans (id, source, competitor_id, competitor_name, model_name, bedrooms, bathrooms, sq_ft, stories, garage_spaces, base_price, price_per_sqft, key_features, url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          id,
          source,
          competitorId || null,
          competitorName || null,
          plan.model_name,
          plan.bedrooms,
          plan.bathrooms,
          plan.sq_ft,
          plan.stories,
          plan.garage_spaces,
          plan.base_price,
          plan.price_per_sqft,
          plan.key_features.length > 0 ? JSON.stringify(plan.key_features) : null,
          plan.url,
        ]
      );
      ids.push(id);
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
    const imported = await db.getAll(
      `SELECT * FROM floor_plans WHERE id IN (${placeholders})`,
      ids
    );

    return NextResponse.json({
      imported: imported.length,
      plans: imported,
      errors,
    });
  } catch (err) {
    console.error("CSV import error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process CSV" },
      { status: 500 }
    );
  }
}
