import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { PROMPT_YOUTUBE } from "@/lib/prompts";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  try {
    const { topic, articleIds } = await req.json();
    const supabase = createServerClient();

    let q = supabase.from("articles").select("*").order("created_at", { ascending: false });
    if (articleIds?.length > 0) q = q.in("id", articleIds); else q = q.limit(20);
    const { data: articles } = await q;

    const s = (v) => (typeof v === "string" ? v : "");
    const ctx = (articles || []).map(a => {
      const nuggets = (Array.isArray(a.golden_nuggets) ? a.golden_nuggets : []).map(n => "- " + (n?.title||"") + ": " + (n?.idea||"")).join("\n");
      return "=== " + s(a.title) + " ===\n" + s(a.summary_full) + "\nInsights: " + (Array.isArray(a.actionable_insights) ? a.actionable_insights.join(" | ") : "") + "\nTakeaway: " + s(a.one_key_takeaway) + "\n" + nuggets;
    }).join("\n\n");

    const userMsg = topic?.trim() ? "Sujet: \"" + topic + "\"\n\nSources:\n\n" + ctx : "Synthétise:\n\n" + ctx;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 8000, system: PROMPT_YOUTUBE,
      messages: [{ role: "user", content: userMsg }],
    });
    const script = msg.content[0]?.text || "";

    try {
      await supabase.from("youtube_scripts").insert({
        topic: topic || "Auto-généré", article_ids: articleIds || [],
        raw_text: script, status: "generated",
        content: { topic: topic || "Auto", generated_at: new Date().toISOString() },
      });
    } catch {}

    return NextResponse.json({ script });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
