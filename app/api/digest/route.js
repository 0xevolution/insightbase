import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { DIGEST_PROMPT } from "@/lib/prompts";
import crypto from "crypto";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  try {
    const { content, inputType, sourceUrl, fileName } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "Contenu vide" }, { status: 400 });
    }

    const supabase = createServerClient();
    const startTime = Date.now();

    // 1. Check for duplicates via content hash
    const contentHash = crypto.createHash("md5").update(content.trim()).digest("hex");
    const { data: existing } = await supabase
      .from("inputs")
      .select("id")
      .eq("content_hash", contentHash)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Cet article a déjà été digéré." }, { status: 409 });
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

    // 3. Call Claude to digest
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: DIGEST_PROMPT,
      messages: [{ role: "user", content }],
    });

    const rawText = msg.content[0]?.text || "";
    let parsed;
    try {
      const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Erreur de parsing IA", raw: rawText.substring(0, 500) }, { status: 500 });
    }

    const digestDuration = Date.now() - startTime;

    // 4. Find or create category
    const categoryName = parsed.category || "Business";
    let { data: catRecord } = await supabase
      .from("categories")
      .select("id")
      .eq("name", categoryName)
      .single();

    if (!catRecord) {
      // Auto-create new category
      const { data: newCat } = await supabase
        .from("categories")
        .insert({
          name: categoryName,
          color: "#888888",
          emoji: "📁",
          description: `Catégorie créée automatiquement pour : ${categoryName}`,
          is_default: false,
        })
        .select()
        .single();
      catRecord = newCat;
    }

    // 5. Save article with all V3 fields
    const { data: article, error: artErr } = await supabase
      .from("articles")
      .insert({
        input_id: inputRecord.id,
        category_id: catRecord?.id || null,
        title: parsed.title,
        source: parsed.source,
        category: categoryName,
        summary_one_line: parsed.summary_one_line,
        summary_paragraph: parsed.summary_paragraph,
        summary_full: parsed.summary_full,
        content_diagnostic: parsed.content_diagnostic || {},
        golden_nuggets: parsed.golden_nuggets || [],
        data_evidence: parsed.data_evidence || [],
        actionable_insights: parsed.actionable_insights || [],
        mental_models: parsed.mental_models || [],
        contrarian_take: parsed.contrarian_take,
        blind_spots: parsed.blind_spots,
        key_concepts: parsed.key_concepts || [],
        tags: parsed.tags || [],
        novelty_score: parsed.novelty_score || 5,
        actionability_score: parsed.actionability_score || 5,
        content_potential_score: parsed.content_potential_score || 5,
        one_key_takeaway: parsed.one_key_takeaway,
        content_angles: parsed.content_angles || {},
        final_rating: parsed.final_rating,
        digest_version: "v3",
        ai_model_used: "claude-sonnet-4",
        digest_duration_ms: digestDuration,
      })
      .select()
      .single();

    if (artErr) {
      return NextResponse.json({ error: "Erreur article: " + artErr.message }, { status: 500 });
    }

    // Return article with raw_input for display
    return NextResponse.json({
      article: { ...article, raw_input: content },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
