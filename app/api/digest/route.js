export const runtime = "edge";

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

// Import prompt inline to avoid module issues in Edge
const DIGEST_PROMPT = `Tu es un expert en synthèse, analyse critique et extraction de valeur de contenu. Ton rôle : transformer n'importe quel article, PDF, thread, livre ou document en une synthèse puissante, structurée et maximalement utile.

ÉTAPE 0 — DÉTECTION AUTOMATIQUE DU TYPE DE CONTENU
Analyse le contenu et classe-le : TYPE A (actionnable), TYPE B (théorique), TYPE C (mixte). Cette classification calibre ta réponse.

RÈGLES : Zéro remplissage. Français clair et direct. Ne résume pas : ANALYSE et EXTRAIS. Les chiffres et exemples du document doivent apparaître. Ne génère JAMAIS de contenu inventé.

Retourne UNIQUEMENT un JSON valide (sans markdown, sans backticks) :

{
  "title": "Titre clair et mémorable",
  "source": "Source si détectable",
  "content_type": "A | B | C",
  "summary_one_line": "L'idée centrale en 1 phrase. Le so what essentiel.",
  "summary_paragraph": "Contexte et problème adressé en 150-250 mots. Texte fluide.",
  "summary_full": "Substance principale. 6-12 points développés, 2-4 lignes chacun.",
  "golden_nuggets": [{"title": "Titre insight", "idea": "Développement 3-5 lignes", "why_powerful": "Pourquoi important", "explicit_vs_implied": "Dit vs impliqué"}],
  "data_evidence": [{"fact": "Donnée exacte", "what_it_proves": "Implication", "reliability": "Fort|Moyen|Anecdotique"}],
  "actionable_insights": ["FAIRE : Action concrète + comment + pourquoi", "TESTER : Hypothèse + méthode", "ÉVITER : Erreur + piège"],
  "perspective_shifts": ["Shift mental si TYPE B ou C"],
  "mental_models": ["NOM : Application ici"],
  "contrarian_take": "Angle contre-intuitif en 2 phrases max",
  "blind_spots": "Ce que le contenu ne dit pas. Limites et biais.",
  "key_concepts": ["Concept 1", "Concept 2", "Concept 3"],
  "category": "UNE parmi : IA, Business, Mindset, Vibecoding, Outils, Tendances, Dev Personnel, Trading, Marketing, Science",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "novelty_score": 7,
  "actionability_score": 7,
  "content_potential_score": 7,
  "one_key_takeaway": "La vérité centrale à retenir. 2-3 phrases.",
  "content_angles": {"x_twitter": {"opinion_tranchee": "", "fait_contre_intuitif": "", "tension_narrative": ""}, "linkedin": {"lecon_pro": "", "moment_rupture": "", "prise_position": ""}, "newsletter": {"insight_profond": "", "pont_realite": "", "question_ouverte": ""}, "youtube": {"hook_video": "", "preuve_credibilite": "", "transformation": ""}},
  "final_rating": "Publication immédiate | Publication avec reformulation | Usage interne | Ne pas utiliser"
}

Scores HONNÊTES. Zéro remplissage. Chaque ligne justifie sa présence.`;

function prepareContent(content) {
  const max = 15000;
  if (content.length <= max) return content;
  return content.substring(0, 12000) + "\n\n[..." + content.length + " chars total...]\n\n" + content.substring(content.length - 3000);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const content = body?.content;
    const inputType = body?.inputType;

    if (!content || typeof content !== "string" || !content.trim()) {
      return new Response(JSON.stringify({ error: "Contenu vide" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const prepared = prepareContent(content.trim());
    const startTime = Date.now();

    // Call Claude via fetch (Edge compatible)
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: DIGEST_PROMPT,
        messages: [{ role: "user", content: prepared }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(JSON.stringify({ error: "Claude API error: " + aiRes.status + " " + errText.substring(0, 200) }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const aiData = await aiRes.json();
    const rawText = aiData?.content?.[0]?.text || "";
    if (!rawText) {
      return new Response(JSON.stringify({ error: "Claude n'a pas répondu" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    // Parse JSON
    let parsed;
    try {
      let cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const s = cleaned.indexOf("{");
      const e = cleaned.lastIndexOf("}");
      if (s !== -1 && e > s) cleaned = cleaned.substring(s, e + 1);
      parsed = JSON.parse(cleaned);
    } catch {
      return new Response(JSON.stringify({ error: "Erreur parsing. Réessaie." }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const duration = Date.now() - startTime;
    const catName = (typeof parsed.category === "string" && parsed.category) || "Business";
    const ss = (v) => (typeof v === "string" ? v : "");
    const sa = (v) => (Array.isArray(v) ? v : []);
    const so = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
    const sn = (v) => (typeof v === "number" ? Math.min(Math.max(v, 1), 10) : 5);

    // Save to Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Find or create category
    let catId = null;
    try {
      const { data: cat } = await supabase.from("categories").select("id").eq("name", catName).maybeSingle();
      if (cat) catId = cat.id;
      else {
        const { data: nc } = await supabase.from("categories").insert({ name: catName, is_default: false }).select().single();
        if (nc) catId = nc.id;
      }
    } catch {}

    const { data: article, error: dbErr } = await supabase.from("articles").insert({
      raw_input: content,
      input_type: (typeof inputType === "string") ? inputType : "text",
      title: ss(parsed.title) || "Sans titre",
      source: ss(parsed.source) || null,
      category: catName,
      category_id: catId,
      content_type: ss(parsed.content_type) || "C",
      summary_one_line: ss(parsed.summary_one_line),
      summary_paragraph: ss(parsed.summary_paragraph),
      summary_full: ss(parsed.summary_full),
      content_diagnostic: so(parsed.content_diagnostic),
      golden_nuggets: sa(parsed.golden_nuggets),
      data_evidence: sa(parsed.data_evidence),
      actionable_insights: sa(parsed.actionable_insights),
      perspective_shifts: sa(parsed.perspective_shifts),
      mental_models: sa(parsed.mental_models),
      contrarian_take: ss(parsed.contrarian_take) || null,
      blind_spots: ss(parsed.blind_spots) || null,
      key_concepts: sa(parsed.key_concepts),
      tags: sa(parsed.tags),
      novelty_score: sn(parsed.novelty_score),
      actionability_score: sn(parsed.actionability_score),
      content_potential_score: sn(parsed.content_potential_score),
      one_key_takeaway: ss(parsed.one_key_takeaway),
      content_angles: so(parsed.content_angles),
      final_rating: ss(parsed.final_rating) || null,
      digest_version: "v4",
      ai_model_used: "claude-sonnet-4",
      digest_duration_ms: duration,
    }).select().single();

    if (dbErr) {
      return new Response(JSON.stringify({ error: "DB: " + dbErr.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ article }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "Erreur serveur" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
