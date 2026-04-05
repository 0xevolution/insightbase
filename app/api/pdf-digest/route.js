import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export const maxDuration = 60;

const P_PDF = `Analyse et synthétise le contenu de ce document.
Objectif : Extraire 100% de la valeur cognitive réelle en supprimant agressivement tout remplissage (anecdotes décoratives, répétitions, digressions, dramatisation).
Mission : Synthèse plus courte mais intellectuellement équivalente. Conserver : toutes idées importantes, principes fondamentaux, concepts clés, modèles mentaux, méthodes actionnables, stratégies, distinctions, nuances utiles.
Structure : Par sections logiques. Fusionner les redondances. Reformuler pour maximiser clarté.
Contraintes : Aucune idée clé perdue. Densité informationnelle maximale. Chaque phrase justifie sa présence.
Le résultat doit permettre de ne jamais lire le document original tout en obtenant l'intégralité des apprentissages.

Retourne UNIQUEMENT un JSON valide (sans markdown, sans backticks) :
{"title":"Titre du document","source":"Source ou null","content_type":"A|B|C","summary_one_line":"Idée centrale 1 phrase","summary_paragraph":"Contexte + problème. 100-200 mots.","summary_full":"SYNTHÈSE COMPLÈTE par sections logiques. TOUTES les idées, principes, concepts, méthodes. Minimum 10 points de 3-5 lignes.","golden_nuggets":[{"title":"Titre","idea":"3-5 lignes insight profond","explicit_vs_implied":"Dit vs impliqué"}],"data_evidence":[{"fact":"Donnée","what_it_proves":"Implication","reliability":"Fort|Moyen|Anecdotique"}],"actionable_insights":["FAIRE: Action détaillée","TESTER: Hypothèse","ÉVITER: Erreur"],"perspective_shifts":["Shift mental profond"],"contrarian_take":"Angle contre-intuitif","blind_spots":"Limites et biais","key_concepts":["C1","C2","C3","C4","C5"],"category":"IA|Business|Mindset|Vibecoding|Outils|Tendances|Dev Personnel|Trading|Marketing|Science","tags":["t1","t2","t3","t4","t5"],"novelty_score":7,"actionability_score":7,"content_potential_score":7,"content_angles":{"x_twitter":"Hook viral","linkedin":"Leçon pro","newsletter":"Insight profond","youtube":"Problème + transformation"},"one_key_takeaway":"Vérité centrale","final_rating":"Publication immédiate|Publication avec reformulation|Usage interne|Ne pas utiliser"}`;

function trim(t) {
  if (t.length <= 8000) return t;
  return t.substring(0, 6500) + "\n[..." + t.length + " chars]\n" + t.substring(t.length - 1500);
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Aucun fichier PDF reçu" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract text from PDF
    let fullText = "";
    try {
      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
      const data = await pdfParse(buffer);
      fullText = data?.text?.trim() || "";
    } catch (e) {
      return NextResponse.json({ error: "Impossible de lire ce PDF: " + (e.message || "") }, { status: 400 });
    }

    if (!fullText || fullText.length < 20) {
      return NextResponse.json({ error: "PDF vide ou illisible (scan/image). Copie-colle le contenu manuellement en mode Texte." }, { status: 400 });
    }

    // Digest with Claude
    const prepared = trim(fullText);
    const start = Date.now();

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4096, system: P_PDF, messages: [{ role: "user", content: prepared }] }),
    });

    if (!aiRes.ok) {
      const e = await aiRes.text().catch(() => "");
      return NextResponse.json({ error: "Claude " + aiRes.status + ": " + e.substring(0, 100) }, { status: 500 });
    }

    const aiData = await aiRes.json();
    const raw = aiData?.content?.[0]?.text || "";
    if (!raw || raw.length < 10) return NextResponse.json({ error: "Pas de réponse Claude. Réessaie." }, { status: 500 });

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
      raw_input: fullText, input_type: "pdf",
      title: ss(parsed.title) || "Sans titre", source: ss(parsed.source) || file.name || null,
      category: cat, category_id: catId, content_type: ss(parsed.content_type) || "C",
      summary_one_line: ss(parsed.summary_one_line), summary_paragraph: ss(parsed.summary_paragraph), summary_full: ss(parsed.summary_full),
      content_diagnostic: so(parsed.content_diagnostic), golden_nuggets: sa(parsed.golden_nuggets), data_evidence: sa(parsed.data_evidence),
      actionable_insights: sa(parsed.actionable_insights), perspective_shifts: sa(parsed.perspective_shifts), mental_models: sa(parsed.mental_models),
      contrarian_take: ss(parsed.contrarian_take) || null, blind_spots: ss(parsed.blind_spots) || null,
      key_concepts: sa(parsed.key_concepts), tags: sa(parsed.tags),
      novelty_score: sn(parsed.novelty_score), actionability_score: sn(parsed.actionability_score), content_potential_score: sn(parsed.content_potential_score),
      one_key_takeaway: ss(parsed.one_key_takeaway), content_angles: so(parsed.content_angles), final_rating: ss(parsed.final_rating) || null,
      digest_version: "v6-pdf", ai_model_used: "claude-sonnet-4", digest_duration_ms: duration,
    }).select().single();

    if (dbErr) return NextResponse.json({ error: "DB: " + dbErr.message }, { status: 500 });
    return NextResponse.json({ article });
  } catch (e) { return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 }); }
}
