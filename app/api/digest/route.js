import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { DIGEST_PROMPT } from "@/lib/prompts";
import crypto from "crypto";

// Increase Vercel timeout to max allowed (60s on Hobby, 300s on Pro)
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Trim article to fit within Claude's context while keeping max content
function prepareContent(content, maxChars = 100000) {
  if (content.length <= maxChars) return content;
  // Keep first 80% and last 20% to preserve intro and conclusion
  const firstPart = content.substring(0, Math.floor(maxChars * 0.8));
  const lastPart = content.substring(content.length - Math.floor(maxChars * 0.2));
  return firstPart + "\n\n[...contenu tronqué pour traitement...]\n\n" + lastPart;
}

export async function POST(req) {
  try {
    const { content, inputType, sourceUrl, fileName } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "Contenu vide" }, { status: 400 });
    }

    const supabase = createServerClient();

    // 1. Check for duplicates via content hash (soft check — no block)
    const contentHash = crypto.createHash("md5").update(content.trim()).digest("hex");
    const { data: existing } = await supabase
      .from("inputs")
      .select("id")
      .eq("content_hash", contentHash)
      .maybeSingle();

    if (existing) {
      // Check if an article was actually created for this input
      const { data: existingArticle } = await supabase
        .from("articles")
        .select("id")
        .eq("input_id", existing.id)
        .maybeSingle();

      if (existingArticle) {
        return NextResponse.json({ error: "Cet article a déjà été digéré." }, { status: 409 });
      }
      // Input exists but no article — delete orphan input and retry
      await supabase.from("inputs").delete().eq("id", existing.id);
    }

    // 2. Create input record
    const wordCount = content.trim().split(/\s+/).length;
    const { data: inputRecord, error: inputErr } = await supabase
      .from("inputs")
      .insert({
        type: inputType || "text",
        content: content,
        source_url: sourceUrl || null,
        file_name: fileName || null,
        word_count: wordCount,
        content_hash: contentHash,
      })
      .select()
      .single();

    if (inputErr) {
      return NextResponse.json({ error: "Erreur input: " + inputErr.message }, { status: 500 });
    }

    // 3. Prepare content (trim if very long)
    const preparedContent = prepareContent(content);
    const startTime = Date.now();

    // 4. Call Claude to digest
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
      // If JSON parsing fails, delete orphan input
      await supabase.from("inputs").delete().eq("id", inputRecord.id);
      return NextResponse.json({ error: "Erreur de parsing IA. Réessaie avec un article plus court.", raw: rawText.substring(0, 300) }, { status: 500 });
    }

    const digestDuration = Date.now() - startTime;

    // 5. Find or create category
    const categoryName = parsed.category || "Business";
    let { data: catRecord } = await supabase
      .from("categories")
      .select("id")
      .eq("name", categoryName)
      .maybeSingle();

    if (!catRecord) {
      const { data: newCat } = await supabase
        .from("categories")
        .insert({
          name: categoryName,
          color: "#888888",
          emoji: "📁",
          description: "Catégorie créée automatiquement : " + categoryName,
          is_default: false,
        })
        .select()
        .single();
      catRecord = newCat;
    }

    // 6. Save article
    const { data: article, error: artErr } = await supabase
      .from("articles")
      .insert({
        input_id: inputRecord.id,
        category_id: catRecord?.id || null,
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
      // Delete orphan input if article creation fails
      await supabase.from("inputs").delete().eq("id", inputRecord.id);
      return NextResponse.json({ error: "Erreur article: " + artErr.message }, { status: 500 });
    }

    return NextResponse.json({ article: { ...article, raw_input: content.substring(0, 5000) } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
