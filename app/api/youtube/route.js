import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { PROMPT_YOUTUBE } from "@/lib/prompts";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  try {
    const { topic, articleIds } = await req.json();
    
    const supabase = createServerClient();

    // Fetch selected articles (or all if none specified)
    let query = supabase.from("articles").select("*").order("created_at", { ascending: false });
    
    if (articleIds?.length > 0) {
      query = query.in("id", articleIds);
    } else {
      query = query.limit(20);
    }

    const { data: articles } = await query;

    const artContext = (articles || []).map(a =>
      `═══ ARTICLE: ${a.title} ═══\nCatégorie: ${a.category}\nRésumé: ${a.summary_full}\nInsights: ${(a.actionable_insights || []).join(" | ")}\nModèles mentaux: ${(a.mental_models || []).join(" | ")}\nContrarian: ${a.contrarian_take || "N/A"}\nTakeaway: ${a.one_key_takeaway}\nConcepts: ${(a.key_concepts || []).join(", ")}`
    ).join("\n\n");

    const userMsg = topic?.trim()
      ? `Sujet demandé : "${topic}"\n\nArticles sources :\n\n${artContext}`
      : `Crée un script en synthétisant ces articles :\n\n${artContext}`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: PROMPT_YOUTUBE,
      messages: [{ role: "user", content: userMsg }],
    });

    const script = msg.content[0]?.text || "";

    // Save to DB
    const { data, error } = await supabase.from("youtube_scripts").insert({
      topic: topic || "Script auto-généré",
      script,
      article_ids: articleIds || [],
    }).select().single();

    return NextResponse.json({ script, saved: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
