import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { DIGEST_PROMPT } from "@/lib/prompts";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function prepareContent(content) {
  // Limit to 15000 chars to ensure Claude responds within 60s
  const maxChars = 15000;
  if (content.length <= maxChars) return content;
  const first = content.substring(0, 12000);
  const last = content.substring(content.length - 3000);
  return first + "\n\n[... contenu central omis pour traitement — " + content.length + " caractères au total ...]\n\n" + last;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const content = body?.content;
    const inputType = body?.inputType;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Contenu vide" }, { status: 400 });
    }

    const supabase = createServerClient();
    const startTime = Date.now();
    const prepared = prepareContent(content.trim());

    // 1. Call Claude with limited content for speed
    let msg;
    try {
      msg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: DIGEST_PROMPT,
        messages: [{ role: "user", content: prepared }],
      });
    } catch (aiErr) {
      return NextResponse.json({ error: "Erreur API Claude: " + (aiErr.message || "timeout") }, { status: 500 });
    }

    const rawText = msg?.content?.[0]?.text || "";
    if (!rawText) {
      return NextResponse.json({ error: "Claude n'a pas répondu." }, { status: 500 });
    }

    let parsed;
    try {
      let cleaned = rawText;
      // Remove markdown code blocks if present
      if (cleaned.includes("```")) {
        cleaned = cleaned.replace(/```json\s*/g, "").replace(/```\s*/g, "");
      }
      cleaned = cleaned.trim();
      // Find the JSON object
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        cleaned = cleaned.substring(start, end + 1);
      }
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      return NextResponse.json({ error: "Erreur parsing JSON. Réessaie.", detail: rawText.substring(0, 200) }, { status: 500 });
    }

    const duration = Date.now() - startTime;
    const catName = (typeof parsed.category === "string" && parsed.category) ? parsed.category : "Business";

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

    // 3. Save article — store FULL raw_input (not truncated)
    const safeStr = (v) => (typeof v === "string" ? v : "");
    const safeArr = (v) => (Array.isArray(v) ? v : []);
    const safeObj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
    const safeNum = (v) => (typeof v === "number" ? Math.min(Math.max(v, 1), 10) : 5);

    const { data: article, error: err } = await supabase.from("articles").insert({
      raw_input: content,
      input_type: (typeof inputType === "string") ? inputType : "text",
      title: safeStr(parsed.title) || "Sans titre",
      source: safeStr(parsed.source) || null,
      category: catName,
      category_id: catId,
      content_type: safeStr(parsed.content_type) || "C",
      summary_one_line: safeStr(parsed.summary_one_line),
      summary_paragraph: safeStr(parsed.summary_paragraph),
      summary_full: safeStr(parsed.summary_full),
      content_diagnostic: safeObj(parsed.content_diagnostic),
      golden_nuggets: safeArr(parsed.golden_nuggets),
      data_evidence: safeArr(parsed.data_evidence),
      actionable_insights: safeArr(parsed.actionable_insights),
      perspective_shifts: safeArr(parsed.perspective_shifts),
      mental_models: safeArr(parsed.mental_models),
      contrarian_take: safeStr(parsed.contrarian_take) || null,
      blind_spots: safeStr(parsed.blind_spots) || null,
      key_concepts: safeArr(parsed.key_concepts),
      tags: safeArr(parsed.tags),
      novelty_score: safeNum(parsed.novelty_score),
      actionability_score: safeNum(parsed.actionability_score),
      content_potential_score: safeNum(parsed.content_potential_score),
      one_key_takeaway: safeStr(parsed.one_key_takeaway),
      content_angles: safeObj(parsed.content_angles),
      final_rating: safeStr(parsed.final_rating) || null,
      digest_version: "v4",
      ai_model_used: "claude-sonnet-4",
      digest_duration_ms: duration,
    }).select().single();

    if (err) {
      return NextResponse.json({ error: "Erreur DB: " + err.message }, { status: 500 });
    }

    return NextResponse.json({ article });
  } catch (e) {
    return NextResponse.json({ error: "Erreur serveur: " + (e.message || "inconnue") }, { status: 500 });
  }
}
