import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export const maxDuration = 60;

const PROMPT = `Expert en synthèse et extraction de valeur. Analyse le contenu et retourne UNIQUEMENT un JSON valide, sans backticks, sans markdown.

Détecte le type : A (actionnable), B (théorique), C (mixte).

{
  "title": "Titre clair",
  "source": "Source si détectable ou null",
  "content_type": "A|B|C",
  "summary_one_line": "Idée centrale en 1 phrase percutante",
  "summary_paragraph": "Contexte et problème en 100-200 mots fluides",
  "summary_full": "Substance principale, 5-10 points de 2-3 lignes",
  "golden_nuggets": [{"title":"Titre","idea":"2-3 lignes","why_powerful":"Pourquoi important","explicit_vs_implied":"Dit vs impliqué"}],
  "data_evidence": [{"fact":"Donnée","what_it_proves":"Implication","reliability":"Fort|Moyen|Anecdotique"}],
  "actionable_insights": ["FAIRE: Action concrète","TESTER: Hypothèse","ÉVITER: Erreur"],
  "perspective_shifts": ["Shift mental si B ou C"],
  "mental_models": ["NOM: Application"],
  "contrarian_take": "Angle contre-intuitif 2 phrases",
  "blind_spots": "Limites du contenu",
  "key_concepts": ["Concept1","Concept2","Concept3"],
  "category": "IA|Business|Mindset|Vibecoding|Outils|Tendances|Dev Personnel|Trading|Marketing|Science",
  "tags": ["tag1","tag2","tag3","tag4","tag5"],
  "novelty_score": 7,
  "actionability_score": 7,
  "content_potential_score": 7,
  "one_key_takeaway": "Vérité centrale 2 phrases",
  "content_angles": {"x_twitter":{"opinion_tranchee":"","fait_contre_intuitif":"","tension_narrative":""},"linkedin":{"lecon_pro":"","moment_rupture":"","prise_position":""},"newsletter":{"insight_profond":"","pont_realite":"","question_ouverte":""},"youtube":{"hook_video":"","preuve_credibilite":"","transformation":""}},
  "final_rating": "Publication immédiate|Publication avec reformulation|Usage interne|Ne pas utiliser"
}

Zéro remplissage. Chiffres exacts. Scores honnêtes. Réponds UNIQUEMENT avec le JSON.`;

function trim(text) {
  if (text.length <= 8000) return text;
  return text.substring(0, 6500) + "\n[..." + text.length + " chars total]\n" + text.substring(text.length - 1500);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const content = body?.content;
    const inputType = body?.inputType;

    if (!content || typeof content !== "string" || content.trim().length < 10) {
      return NextResponse.json({ error: "Contenu vide ou trop court" }, { status: 400 });
    }

    const prepared = trim(content.trim());
    const start = Date.now();

    // Call Claude via direct fetch (faster than SDK)
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        system: PROMPT,
        messages: [{ role: "user", content: prepared }],
      }),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.text().catch(() => "");
      return NextResponse.json({ error: "Claude API " + aiRes.status + ": " + errBody.substring(0, 100) }, { status: 500 });
    }

    const aiData = await aiRes.json();
    const raw = aiData?.content?.[0]?.text || "";

    if (!raw || raw.length < 10) {
      return NextResponse.json({ error: "Claude n'a pas répondu correctement" }, { status: 500 });
    }

    // Parse JSON — robust extraction
    let parsed;
    try {
      let c = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const openBrace = c.indexOf("{");
      const closeBrace = c.lastIndexOf("}");
      if (openBrace >= 0 && closeBrace > openBrace) {
        c = c.substring(openBrace, closeBrace + 1);
      }
      parsed = JSON.parse(c);
    } catch {
      return NextResponse.json({ error: "Erreur parsing JSON. Réessaie." }, { status: 500 });
    }

    const duration = Date.now() - start;
    const cat = typeof parsed.category === "string" ? parsed.category : "Business";
    const ss = v => typeof v === "string" ? v : "";
    const sa = v => Array.isArray(v) ? v : [];
    const so = v => (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
    const sn = v => typeof v === "number" ? Math.min(Math.max(Math.round(v), 1), 10) : 5;

    // Supabase
    const supabase = createServerClient();

    // Category
    let catId = null;
    try {
      const { data: ec } = await supabase.from("categories").select("id").eq("name", cat).maybeSingle();
      if (ec) catId = ec.id;
      else {
        const { data: nc } = await supabase.from("categories").insert({ name: cat, is_default: false }).select().single();
        if (nc) catId = nc.id;
      }
    } catch {}

    // Insert article
    const { data: article, error: dbErr } = await supabase.from("articles").insert({
      raw_input: content,
      input_type: typeof inputType === "string" ? inputType : "text",
      title: ss(parsed.title) || "Sans titre",
      source: ss(parsed.source) || null,
      category: cat,
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
      return NextResponse.json({ error: "DB: " + dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ article });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
  }
}
