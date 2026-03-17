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

    const { data: article, error: fetchErr } = await supabase
      .from("articles")
      .select("*")
      .eq("id", articleId)
      .single();

    if (fetchErr || !article) {
      return NextResponse.json({ error: "Article non trouvé" }, { status: 404 });
    }

    // Build context
    const angles = article.content_angles;
    let anglesStr = "N/A";
    if (Array.isArray(angles)) {
      anglesStr = angles.join(" | ");
    } else if (angles && typeof angles === "object") {
      const platformKey = platform === "x" ? "x_twitter" : platform;
      const platformAngles = angles[platformKey];
      if (platformAngles && typeof platformAngles === "object") {
        anglesStr = Object.entries(platformAngles).map(([k, v]) => k + ": " + v).join(" | ");
      }
    }

    const nuggets = Array.isArray(article.golden_nuggets) ? article.golden_nuggets : [];
    const nuggetsStr = nuggets.map((n, i) => "Pépite " + (i+1) + ": " + (n.title||"") + " — " + (n.idea||"")).join("\n");

    const ctx = [
      "Titre: " + (article.title || ""),
      "Source: " + (article.source || "N/A"),
      "Résumé complet: " + (article.summary_full || ""),
      "Résumé court: " + (article.summary_paragraph || ""),
      nuggetsStr ? "Pépites:\n" + nuggetsStr : null,
      "Insights actionnables:\n" + (Array.isArray(article.actionable_insights) ? article.actionable_insights.map((x, i) => (i+1) + ". " + x).join("\n") : ""),
      "Modèles mentaux: " + (Array.isArray(article.mental_models) ? article.mental_models.join(" | ") : ""),
      "Angle contrarian: " + (article.contrarian_take || "N/A"),
      "Concepts clés: " + (Array.isArray(article.key_concepts) ? article.key_concepts.join(", ") : ""),
      "Takeaway: " + (article.one_key_takeaway || ""),
      "Angles contenu (" + platform + "): " + anglesStr,
    ].filter(Boolean).join("\n");

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: PROMPTS[platform],
      messages: [{ role: "user", content: ctx }],
    });

    const generatedContent = msg.content[0]?.text || "";

    const tableName = TABLES[platform];
    await supabase.from(tableName).insert({
      article_id: articleId,
      content: {
        platform: platform,
        generated_at: new Date().toISOString(),
        article_title: article.title,
        article_category: article.category,
      },
      raw_text: generatedContent,
      status: "generated",
    });

    await supabase.from("articles").update({ exploited: true }).eq("id", articleId);

    return NextResponse.json({ content: generatedContent });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
