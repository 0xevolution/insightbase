import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { DIGEST_PROMPT } from "@/lib/prompts";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function prepareContent(content, maxChars = 100000) {
  if (content.length <= maxChars) return content;
  const firstPart = content.substring(0, Math.floor(maxChars * 0.8));
  const lastPart = content.substring(content.length - Math.floor(maxChars * 0.2));
  return firstPart + "\n\n[...]\n\n" + lastPart;
}

export async function POST(req) {
  try {
    const { content, inputType, sourceUrl, fileName } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "Contenu vide" }, { status: 400 });
    }

    const supabase = createServerClient();
    const startTime = Date.now();

    // 1. Call Claude FIRST — this is the core value
    const preparedContent = prepareContent(content);
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: DIGEST_PROMPT,
      messages: [{ role: "user", content: preparedContent }],
    });

    const rawText = msg.content[0]?.text || "";
    let parsed;
    try {
      const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Erreur de parsing IA. Réessaie.", raw: rawText.substring(0, 300) }, { status: 500 });
    }

    const digestDuration = Date.now() - startTime;
    const categoryName = parsed.category || "Business";

    // 2. Try to create input record (non-blocking)
    let inputId = null;
    try {
      const wordCount = content.trim().split(/\s+/).length;
      const { data: inputRecord } = await supabase
        .from("inputs")
        .insert({
          type: (inputType === "texte" ? "text" : inputType) || "text",
          content: content.substring(0, 500000),
          source_url: sourceUrl || null,
          file_name: fileName || null,
          word_count: wordCount,
        })
        .select()
        .single();
      if (inputRecord) inputId = inputRecord.id;
    } catch (e) {
      console.log("Input creation skipped:", e.message);
    }

    // 3. Try to find or create category (non-blocking)
    let categoryId = null;
    try {
      const { data: catRecord } = await supabase
        .from("categories")
        .select("id")
        .eq("name", categoryName)
        .maybeSingle();

      if (catRecord) {
        categoryId = catRecord.id;
      } else {
        const { data: newCat } = await supabase
          .from("categories")
          .insert({
            name: categoryName,
            color: "#888888",
            emoji: "📁",
            description: "Auto: " + categoryName,
            is_default: false,
          })
          .select()
          .single();
        if (newCat) categoryId = newCat.id;
      }
    } catch (e) {
      console.log("Category skipped:", e.message);
    }

    // 4. Save article — THIS MUST SUCCEED
    const { data: article, error: artErr } = await supabase
      .from("articles")
      .insert({
        input_id: inputId,
        category_id: categoryId,
        title: parsed.title || "Sans titre",
        source: parsed.source || null,
        category: categoryName,
        summary_one_line: parsed.summary_one_line || "",
        summary_paragraph: parsed.summary_paragraph || "",
        summary_full: parsed.summary_full || "",
        content_diagnostic: parsed.content_diagnostic || {},
        golden_nuggets: parsed.golden_nuggets || [],
        data_evidence: parsed.data_evidence || [],
        actionable_insights: parsed.actionable_insights || [],
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
        content_type: parsed.content_type || "C",
        perspective_shifts: parsed.perspective_shifts || [],
        digest_version: "v4",
        ai_model_used: "claude-sonnet-4",
        digest_duration_ms: digestDuration,
      })
      .select()
      .single();

    if (artErr) {
      return NextResponse.json({ error: "Erreur article: " + artErr.message }, { status: 500 });
    }

    return NextResponse.json({ article });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
