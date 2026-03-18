import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { DIGEST_PROMPT } from "@/lib/prompts";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function prepareContent(content, maxChars = 120000) {
  if (content.length <= maxChars) return content;
  const first = content.substring(0, Math.floor(maxChars * 0.8));
  const last = content.substring(content.length - Math.floor(maxChars * 0.2));
  return first + "\n\n[...]\n\n" + last;
}

export async function POST(req) {
  try {
    const { content, inputType } = await req.json();
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Contenu vide" }, { status: 400 });
    }

    const supabase = createServerClient();
    const startTime = Date.now();
    const prepared = prepareContent(content);

    // 1. Call Claude
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: DIGEST_PROMPT,
      messages: [{ role: "user", content: prepared }],
    });

    const rawText = msg.content[0]?.text || "";
    let parsed;
    try {
      const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Erreur parsing IA. Réessaie." }, { status: 500 });
    }

    const duration = Date.now() - startTime;
    const catName = parsed.category || "Business";

    // 2. Find or create category (non-blocking)
    let catId = null;
    try {
      const { data: cat } = await supabase.from("categories").select("id").eq("name", catName).maybeSingle();
      if (cat) { catId = cat.id; }
      else {
        const { data: nc } = await supabase.from("categories").insert({ name: catName, is_default: false }).select().single();
        if (nc) catId = nc.id;
      }
    } catch {}

    // 3. Save article with raw_input
    const { data: article, error: err } = await supabase.from("articles").insert({
      raw_input: content,
      input_type: inputType || "text",
      title: parsed.title || "Sans titre",
      source: parsed.source || null,
      category: catName,
      category_id: catId,
      content_type: parsed.content_type || "C",
      summary_one_line: parsed.summary_one_line || "",
      summary_paragraph: parsed.summary_paragraph || "",
      summary_full: parsed.summary_full || "",
      content_diagnostic: parsed.content_diagnostic || {},
      golden_nuggets: parsed.golden_nuggets || [],
      data_evidence: parsed.data_evidence || [],
      actionable_insights: parsed.actionable_insights || [],
      perspective_shifts: parsed.perspective_shifts || [],
      mental_models: parsed.mental_models || [],
      contrarian_take: parsed.contrarian_take || null,
      blind_spots: parsed.blind_spots || null,
      key_concepts: parsed.key_concepts || [],
      tags: parsed.tags || [],
      novelty_score: parsed.novelty_score || 5,
      actionability_score: parsed.actionability_score || 5,
      content_potential_score: parsed.content_potential_score || 5,
      one_key_takeaway: parsed.one_key_takeaway || "",
      content_angles: parsed.content_angles || {},
      final_rating: parsed.final_rating || null,
      digest_version: "v4",
      ai_model_used: "claude-sonnet-4",
      digest_duration_ms: duration,
    }).select().single();

    if (err) {
      return NextResponse.json({ error: "Erreur DB: " + err.message }, { status: 500 });
    }

    return NextResponse.json({ article });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
