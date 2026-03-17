import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { PROMPT_X, PROMPT_LINKEDIN, PROMPT_NEWSLETTER } from "@/lib/prompts";

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

    // Fetch article
    const { data: article, error: fetchErr } = await supabase
      .from("articles")
      .select("*")
      .eq("id", articleId)
      .single();

    if (fetchErr || !article) {
      return NextResponse.json({ error: "Article non trouvé" }, { status: 404 });
    }

    // Build context — handle both V1 and V3 content_angles
    const angles = article.content_angles;
    let anglesStr = "N/A";
    if (Array.isArray(angles)) {
      anglesStr = angles.join(" | ");
    } else if (angles && typeof angles === "object") {
      const platformKey = platform === "x" ? "x_twitter" : platform;
      const platformAngles = angles[platformKey];
      if (platformAngles && typeof platformAngles === "object") {
        anglesStr = Object.entries(platformAngles).map(([k, v]) => `${k}: ${v}`).join(" | ");
      } else {
        anglesStr = Object.entries(angles).map(([k, v]) =>
          typeof v === "object" ? Object.values(v).join(" / ") : v
        ).join(" | ");
      }
    }

    // Build golden nuggets string
    const nuggets = article.golden_nuggets;
    let nuggetsStr = "";
    if (Array.isArray(nuggets) && nuggets.length > 0) {
      nuggetsStr = nuggets.map((n, i) =>
        `Pépite ${i + 1}: ${n.title || ""} — ${n.idea || ""} (${n.why_powerful || ""})`
      ).join("\n");
    }

    const ctx = [
      `Titre: ${article.title}`,
      `Source: ${article.source || "N/A"}`,
      `Résumé complet: ${article.summary_full}`,
      `Résumé court: ${article.summary_paragraph || ""}`,
      nuggetsStr ? `Pépites clés:\n${nuggetsStr}` : null,
      `Insights actionnables:\n${(article.actionable_insights || []).map((x, i) => `${i + 1}. ${x}`).join("\n")}`,
      `Modèles mentaux: ${(article.mental_models || []).join(" | ")}`,
      `Angle contrarian: ${article.contrarian_take || "N/A"}`,
      `Angles morts: ${article.blind_spots || "N/A"}`,
      `Concepts clés: ${(article.key_concepts || []).join(", ")}`,
      `Takeaway: ${article.one_key_takeaway}`,
      `Angles contenu (${platform}): ${anglesStr}`,
    ].filter(Boolean).join("\n");

    // Generate content
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: PROMPTS[platform],
      messages: [{ role: "user", content: ctx }],
    });

    const generatedContent = msg.content[0]?.text || "";

    // Save to dedicated platform table as JSON
    const tableName = TABLES[platform];
    await supabase.from(tableName).insert({
      article_id: articleId,
      content: {
        platform: platform,
        generated_at: new Date().toISOString(),
        article_title: article.title,
        article_category: article.category,
        raw_output: generatedContent,
      },
      raw_text: generatedContent,
      status: "generated",
    });

    // Also mark article as exploited
    await supabase
      .from("articles")
      .update({ exploited: true })
      .eq("id", articleId);

    return NextResponse.json({ content: generatedContent });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
