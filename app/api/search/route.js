import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { PROMPT_SEARCH } from "@/lib/prompts";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  try {
    const { query } = await req.json();
    if (!query?.trim()) {
      return NextResponse.json({ error: "Query vide" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: articles } = await supabase
      .from("articles")
      .select("id, title, category, tags, summary_one_line, summary_paragraph, actionable_insights, contrarian_take, one_key_takeaway, golden_nuggets, mental_models")
      .order("created_at", { ascending: false })
      .limit(200);

    const kb = (articles || []).map(a => {
      const nuggets = (Array.isArray(a.golden_nuggets) ? a.golden_nuggets : []).map(n => (n.title||"")).join(", ");
      return "[ID:" + a.id + "] " + (a.title||"") + " | Cat: " + (a.category||"") + " | Tags: " + (Array.isArray(a.tags) ? a.tags.join(",") : "") + " | " + (a.summary_one_line||"") + " | Takeaway: " + (a.one_key_takeaway||"") + " | Pépites: " + nuggets;
    }).join("\n\n");

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: PROMPT_SEARCH,
      messages: [{ role: "user", content: "Base:\n" + kb + "\n\nRecherche: " + query }],
    });

    const answer = msg.content[0]?.text || "";
    const mentionedIds = [...answer.matchAll(/\[ID:([a-f0-9-]+)\]/g)].map(m => m[1]);
    const matchedArticles = (articles || []).filter(a => mentionedIds.includes(a.id));

    return NextResponse.json({
      answer: answer.replace(/\[ID:[a-f0-9-]+\]/g, "").trim(),
      articles: matchedArticles,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
