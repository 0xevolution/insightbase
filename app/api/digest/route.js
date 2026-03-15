import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { DIGEST_PROMPT } from "@/lib/prompts";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  try {
    const { content, inputType } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "Contenu vide" }, { status: 400 });
    }

    // Call Claude to digest
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
      return NextResponse.json({ error: "Erreur de parsing IA", raw: rawText }, { status: 500 });
    }

    // Save to Supabase
    const supabase = createServerClient();
    const { data, error } = await supabase.from("articles").insert({
      raw_input: content,
      input_type: inputType || "texte",
      title: parsed.title,
      source: parsed.source,
      summary_one_line: parsed.summary_one_line,
      summary_paragraph: parsed.summary_paragraph,
      summary_full: parsed.summary_full,
      actionable_insights: parsed.actionable_insights || [],
      mental_models: parsed.mental_models || [],
      contrarian_take: parsed.contrarian_take,
      key_concepts: parsed.key_concepts || [],
      content_angles: parsed.content_angles || [],
      one_key_takeaway: parsed.one_key_takeaway,
      category: parsed.category,
      tags: parsed.tags || [],
      novelty_score: parsed.novelty_score || 5,
      actionability_score: parsed.actionability_score || 5,
      content_potential_score: parsed.content_potential_score || 5,
    }).select().single();

    if (error) {
      return NextResponse.json({ error: "Erreur DB: " + error.message }, { status: 500 });
    }

    return NextResponse.json({ article: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
