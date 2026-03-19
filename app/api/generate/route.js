import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { PROMPT_X, PROMPT_LINKEDIN, PROMPT_NEWSLETTER } from "@/lib/prompts";

export const maxDuration = 60;

const PROMPTS = { x: PROMPT_X, linkedin: PROMPT_LINKEDIN, newsletter: PROMPT_NEWSLETTER };
const TABLES = { x: "content_x", linkedin: "content_linkedin", newsletter: "content_newsletter" };

const ANGLES = {
  x: {
    polemique: "ANGLE POLÉMIQUE : Trouve l'opinion la plus tranchée et controversée de cet article. Crée un tweet/thread qui provoque le débat et force les réponses.",
    data: "ANGLE DATA : Extrais le chiffre ou fait le plus surprenant de cet article. Construis un tweet/thread autour de cette donnée choc.",
    story: "ANGLE STORY : Transforme le contenu en une micro-histoire ou anecdote percutante. Le lecteur doit se reconnaître.",
    actionnable: "ANGLE ACTIONNABLE : Extrais le conseil le plus concret et applicable immédiatement. Le lecteur doit pouvoir agir dans l'heure.",
    contrarian: "ANGLE CONTRARIAN : Prends le contre-pied de ce que tout le monde pense sur ce sujet. Retourne la croyance commune."
  },
  linkedin: {
    storytelling: "ANGLE STORYTELLING : Raconte une histoire professionnelle autour de l'insight principal. Le lecteur doit se reconnaître et commenter.",
    framework: "ANGLE FRAMEWORK : Extrais un framework ou méthode en étapes numérotées. Contenu sauvegardable et partageable.",
    contrarian: "ANGLE CONTRARIAN : Prends une position forte et assumée contre la pensée commune de l'industrie. Provoque le débat.",
    etude_cas: "ANGLE ÉTUDE DE CAS : Présente les résultats et méthodes comme une étude de cas concrète avec données.",
    lecon: "ANGLE LEÇON PERSONNELLE : Transforme l'insight en une leçon apprise à la dure. Vulnérabilité + autorité."
  },
  newsletter: {
    deep_dive: "ANGLE DEEP DIVE : Creuse l'insight principal en profondeur. Le lecteur doit se sentir plus intelligent après la lecture.",
    contrarian: "ANGLE CONTRARIAN : Remets en question les idées reçues du secteur en utilisant les preuves de l'article.",
    actionnable: "ANGLE ACTIONNABLE : Transforme tout le contenu en un plan d'action concret que le lecteur peut exécuter cette semaine.",
    tendance: "ANGLE TENDANCE : Place l'insight dans un contexte plus large — quelle tendance cet article révèle ? Qu'est-ce que ça signifie pour l'avenir ?",
    story: "ANGLE STORY : Ouvre avec une anecdote et tisse le contenu de l'article dans une narrative personnelle et intime."
  }
};

function trim(t) {
  if (t.length <= 8000) return t;
  return t.substring(0, 6500) + "\n[..." + t.length + " chars]\n" + t.substring(t.length - 1500);
}

export async function POST(req) {
  try {
    const { articleId, platform, angle } = await req.json();
    if (!articleId || !platform || !PROMPTS[platform])
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });

    const supabase = createServerClient();
    const { data: a, error: fe } = await supabase.from("articles").select("*").eq("id", articleId).single();
    if (fe || !a) return NextResponse.json({ error: "Article non trouvé" }, { status: 404 });

    const s = v => typeof v === "string" ? v : "";

    // Use raw_input (full article) if available, otherwise fall back to summary
    const rawArticle = s(a.raw_input);
    const articleContent = rawArticle ? trim(rawArticle) : s(a.summary_full);

    // Build angle instruction
    const angleInstruction = (angle && ANGLES[platform]?.[angle]) ? "\n\n" + ANGLES[platform][angle] : "";

    // Build context with full article
    const ctx = "ARTICLE SOURCE À TRANSFORMER EN CONTENU :\n\n" + articleContent + "\n\nINFOS COMPLÉMENTAIRES :\nTitre: " + s(a.title) + "\nCatégorie: " + s(a.category) + "\nTakeaway: " + s(a.one_key_takeaway) + angleInstruction;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4096, system: PROMPTS[platform], messages: [{ role: "user", content: ctx }] }),
    });

    if (!aiRes.ok) {
      const e = await aiRes.text().catch(() => "");
      return NextResponse.json({ error: "Claude " + aiRes.status + ": " + e.substring(0, 100) }, { status: 500 });
    }

    const aiData = await aiRes.json();
    const gen = aiData?.content?.[0]?.text || "";
    if (!gen) return NextResponse.json({ error: "Pas de réponse Claude" }, { status: 500 });

    // Save to platform table
    try {
      await supabase.from(TABLES[platform]).insert({
        article_id: articleId, raw_text: gen, status: "generated",
        content: { platform, angle: angle || "default", article_title: a.title, generated_at: new Date().toISOString() },
      });
      await supabase.from("articles").update({ exploited: true }).eq("id", articleId);
    } catch {}

    return NextResponse.json({ content: gen });
  } catch (e) { return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 }); }
}
