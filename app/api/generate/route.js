import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase-server";
import { PROMPT_X, PROMPT_LINKEDIN, PROMPT_NEWSLETTER } from "@/lib/prompts";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPTS = { x: PROMPT_X, linkedin: PROMPT_LINKEDIN, newsletter: PROMPT_NEWSLETTER };
const FIELDS = { x: "content_x", linkedin: "content_linkedin", newsletter: "content_newsletter" };

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

    // Build context
    const ctx = [
      `Titre: ${article.title}`,
      `Source: ${article.source || "N/A"}`,
      `Résumé complet: ${article.summary_full}`,
      `Insights actionnables:\n${(article.actionable_insights || []).map((x, i) => `${i + 1}. ${x}`).join("\n")}`,
      `Modèles mentaux: ${(article.mental_models || []).join(" | ")}`,
      `Angle contrarian: ${article.contrarian_take || "N/A"}`,
      `Concepts clés: ${(article.key_concepts || []).join(", ")}`,
      `Takeaway: ${article.one_key_takeaway}`,
      `Angles contenu: ${(article.content_angles || []).join(" | ")}`,
    ].join("\n");

    // Generate
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: PROMPTS[platform],
      messages: [{ role: "user", content: ctx }],
    });

    const generatedContent = msg.content[0]?.text || "";

    // Save to DB
    await supabase
      .from("articles")
      .update({ [FIELDS[platform]]: generatedContent, exploited: true })
      .eq("id", articleId);

    return NextResponse.json({ content: generatedContent });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
