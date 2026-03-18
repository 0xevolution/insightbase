import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { PROMPT_X, PROMPT_LINKEDIN, PROMPT_NEWSLETTER } from "@/lib/prompts";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PROMPTS = { x: PROMPT_X, linkedin: PROMPT_LINKEDIN, newsletter: PROMPT_NEWSLETTER };
const TABLES = { x: "content_x", linkedin: "content_linkedin", newsletter: "content_newsletter" };

export async function POST(req) {
  try {
    const { articleId, platform } = await req.json();
    if (!articleId || !platform || !PROMPTS[platform]) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: a, error: fe } = await supabase.from("articles").select("*").eq("id", articleId).single();
    if (fe || !a) return NextResponse.json({ error: "Article non trouvé" }, { status: 404 });

    // Build context safely
    const s = (v) => (typeof v === "string" ? v : typeof v === "object" ? JSON.stringify(v) : String(v || ""));
    const ja = (v) => (Array.isArray(v) ? v : []);

    let anglesStr = "";
    try {
      const angles = a.content_angles;
      if (angles && typeof angles === "object" && !Array.isArray(angles)) {
        const pk = platform === "x" ? "x_twitter" : platform;
        const pa = angles[pk];
        if (pa && typeof pa === "object") anglesStr = Object.entries(pa).map(([k,v]) => k + ": " + v).join(" | ");
      }
    } catch {}

    const nuggets = ja(a.golden_nuggets).map((n, i) => "Pépite " + (i+1) + ": " + s(n?.title) + " — " + s(n?.idea)).join("\n");

    const ctx = [
      "Titre: " + s(a.title),
      "Source: " + s(a.source),
      "Résumé complet: " + s(a.summary_full),
      "Résumé court: " + s(a.summary_paragraph),
      nuggets ? "Pépites:\n" + nuggets : "",
      "Insights: " + ja(a.actionable_insights).map(s).join("\n"),
      "Modèles mentaux: " + ja(a.mental_models).map(s).join(" | "),
      "Contrarian: " + s(a.contrarian_take),
      "Concepts: " + ja(a.key_concepts).map(s).join(", "),
      "Takeaway: " + s(a.one_key_takeaway),
      anglesStr ? "Angles (" + platform + "): " + anglesStr : "",
    ].filter(Boolean).join("\n");

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: PROMPTS[platform],
      messages: [{ role: "user", content: ctx }],
    });

    const gen = msg.content[0]?.text || "";

    try {
      await supabase.from(TABLES[platform]).insert({
        article_id: articleId, raw_text: gen, status: "generated",
        content: { platform, article_title: a.title, generated_at: new Date().toISOString() },
      });
      await supabase.from("articles").update({ exploited: true }).eq("id", articleId);
    } catch {}

    return NextResponse.json({ content: gen });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
