import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export const maxDuration = 60;

const P = `Tu es un expert en synthèse et extraction de valeur de contenu. Transforme n'importe quel document en une analyse structurée, dense et maximalement utile.

ÉTAPE 0 — DÉTECTION DU TYPE

Classe silencieusement le contenu avant tout :

TYPE A — ACTIONNABLE : guides, stratégies, how-to, études de cas → priorité : mécanismes + actions
TYPE B — THÉORIQUE : philosophie, psychologie, essais, sciences → priorité : concepts + implications
TYPE C — MIXTE : mélange théorie et application → priorité : équilibre

RÈGLES ABSOLUES

- Zéro remplissage. Chaque ligne justifie sa présence.
- Jamais de contenu inventé : tout vient du document fourni.
- Chiffres exacts (73%, pas "environ 70%").
- Ne commence jamais par "Cet article parle de…".
- Scores honnêtes : un contenu moyen = scores moyens.
- Sections non applicables : null.

FORMAT DE SORTIE

Retourne UNIQUEMENT un JSON valide (sans markdown, sans backticks, sans texte autour) :

{
"title": "Titre clair et mémorable",
"source": "Source/domaine si détectable",
"content_type": "A | B | C",
"summary_one_line": "L'idée centrale en 1 phrase. Le 'so what?' — pas un résumé fade, une phrase qui capture POURQUOI ce contenu compte.",
"summary_paragraph": "Contexte + problème adressé + proposition centrale. Texte fluide, dense. 100-200 mots selon la richesse du contenu.",
"summary_full": "Substance principale : mécanismes, idées, arguments, systèmes. TYPE A : étapes, données chiffrées, modèles. TYPE B : concepts clés, structure de pensée, ne pas aplatir des idées profondes en formules creuses. 5-12 points de 2-4 lignes chacun, autonomes.",
"golden_nuggets": [{"title": "Titre court de l'insight", "idea": "L'idée non-évidente que la plupart des lecteurs rateraient. 3-4 lignes.", "explicit_vs_implied": "Ce que l'auteur dit VS ce qu'il implique sans le dire."}],
"data_evidence": [{"fact": "Donnée exacte telle qu'elle apparaît dans le document", "what_it_proves": "En quoi ça change la compréhension", "reliability": "Fort | Moyen | Anecdotique"}],
"actionable_insights": ["FAIRE : [Action concrète — QUOI + COMMENT + POURQUOI. 2-3 lignes. TYPE A et C uniquement.]", "TESTER : [Hypothèse à valider + méthode]", "ÉVITER : [Erreur identifiée + pourquoi c'est un piège]"],
"perspective_shifts": ["Ce que ce contenu change dans la façon de voir. Quelles croyances il ébranle. Quelles questions nouvelles il ouvre. TYPE B et C uniquement. 3-4 lignes par shift."],
"contrarian_take": "L'angle contre-intuitif que 90% des lecteurs vont rater. 1-2 phrases.",
"blind_spots": "Ce que le contenu ne dit pas, minimise ou présuppose. Biais de l'auteur, limites, risques réels. 2-3 lignes.",
"key_concepts": ["Concept 1", "Concept 2", "Concept 3"],
"category": "UNE seule parmi : IA, Business, Mindset, Vibecoding, Outils, Tendances, Dev Personnel, Trading, Marketing, Science",
"tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
"novelty_score": 8,
"actionability_score": 7,
"content_potential_score": 9,
"content_angles": {"x_twitter": "Le fait le plus contre-intuitif utilisable comme hook viral", "linkedin": "La leçon professionnelle + prise de position assumée pour décideurs", "newsletter": "L'insight que le contenu implique sans l'énoncer + question ouverte", "youtube": "Le problème nommable en 30 secondes + transformation avant/après"},
"one_key_takeaway": "La vérité centrale. 2-3 phrases qui élèvent la réflexion — pas un résumé des sections. TYPE A : ce qui change dans ta façon d'agir. TYPE B : ce qui change dans ta façon de penser.",
"final_rating": "Publication immédiate | Publication avec reformulation | Usage interne | Ne pas utiliser"
}`;

function trim(t) {
  if (t.length <= 8000) return t;
  return t.substring(0, 6500) + "\n[..." + t.length + " chars]\n" + t.substring(t.length - 1500);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const content = body?.content;
    const inputType = body?.inputType;
    if (!content || typeof content !== "string" || content.trim().length < 10)
      return NextResponse.json({ error: "Contenu vide" }, { status: 400 });

    const prepared = trim(content.trim());
    const start = Date.now();

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4096, system: P, messages: [{ role: "user", content: prepared }] }),
    });

    if (!aiRes.ok) {
      const e = await aiRes.text().catch(() => "");
      return NextResponse.json({ error: "Claude " + aiRes.status + ": " + e.substring(0, 100) }, { status: 500 });
    }

    const aiData = await aiRes.json();
    const raw = aiData?.content?.[0]?.text || "";
    if (!raw || raw.length < 10) return NextResponse.json({ error: "Pas de réponse. Réessaie." }, { status: 500 });

    let parsed;
    try {
      let c = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const a = c.indexOf("{"), b = c.lastIndexOf("}");
      if (a >= 0 && b > a) c = c.substring(a, b + 1);
      parsed = JSON.parse(c);
    } catch { return NextResponse.json({ error: "Erreur parsing. Réessaie." }, { status: 500 }); }

    const duration = Date.now() - start;
    const cat = typeof parsed.category === "string" ? parsed.category : "Business";
    const ss = v => typeof v === "string" ? v : "";
    const sa = v => Array.isArray(v) ? v : [];
    const so = v => (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
    const sn = v => typeof v === "number" ? Math.min(Math.max(Math.round(v), 1), 10) : 5;

    const supabase = createServerClient();
    let catId = null;
    try {
      const { data: ec } = await supabase.from("categories").select("id").eq("name", cat).maybeSingle();
      if (ec) catId = ec.id;
      else { const { data: nc } = await supabase.from("categories").insert({ name: cat, is_default: false }).select().single(); if (nc) catId = nc.id; }
    } catch {}

    const { data: article, error: dbErr } = await supabase.from("articles").insert({
      raw_input: content, input_type: typeof inputType === "string" ? inputType : "text",
      title: ss(parsed.title) || "Sans titre", source: ss(parsed.source) || null,
      category: cat, category_id: catId, content_type: ss(parsed.content_type) || "C",
      summary_one_line: ss(parsed.summary_one_line), summary_paragraph: ss(parsed.summary_paragraph), summary_full: ss(parsed.summary_full),
      content_diagnostic: so(parsed.content_diagnostic), golden_nuggets: sa(parsed.golden_nuggets), data_evidence: sa(parsed.data_evidence),
      actionable_insights: sa(parsed.actionable_insights), perspective_shifts: sa(parsed.perspective_shifts), mental_models: sa(parsed.mental_models),
      contrarian_take: ss(parsed.contrarian_take) || null, blind_spots: ss(parsed.blind_spots) || null,
      key_concepts: sa(parsed.key_concepts), tags: sa(parsed.tags),
      novelty_score: sn(parsed.novelty_score), actionability_score: sn(parsed.actionability_score), content_potential_score: sn(parsed.content_potential_score),
      one_key_takeaway: ss(parsed.one_key_takeaway), content_angles: so(parsed.content_angles), final_rating: ss(parsed.final_rating) || null,
      digest_version: "v5", ai_model_used: "claude-sonnet-4", digest_duration_ms: duration,
    }).select().single();

    if (dbErr) return NextResponse.json({ error: "DB: " + dbErr.message }, { status: 500 });
    return NextResponse.json({ article });
  } catch (e) { return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 }); }
}
