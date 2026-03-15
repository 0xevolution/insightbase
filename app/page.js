"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";

const supabase = createClient();

// ─── CONSTANTS ──────────────────────────────────────────────────
const CATS = ["IA","Business","Mindset","Vibecoding","Outils","Tendances","Dev Personnel","Trading","Marketing"];
const CC = {"IA":"#00d4aa","Business":"#fbbf24","Mindset":"#c084fc","Vibecoding":"#38bdf8","Outils":"#fb923c","Tendances":"#f472b6","Dev Personnel":"#a3e635","Trading":"#6ee7b7","Marketing":"#f87171"};

// ─── API HELPERS ────────────────────────────────────────────────
const api = async (path, body) => {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
};

// ─── ICONS ──────────────────────────────────────────────────────
const I = ({d,s=20,c="currentColor"}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
const IC = {
  plus:p=><I {...p} d="M12 5v14M5 12h14"/>,
  clip:p=><I {...p} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>,
  book:p=><I {...p} d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 004 17V5a2 2 0 012-2h14v14H6.5A2.5 2.5 0 004 19.5z"/>,
  pen:p=><I {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>,
  globe:p=><I {...p} d="M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20"/>,
  play:p=><I {...p} d="M5 3l14 9-14 9V3z"/>,
  search:p=><I {...p} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>,
  copy:p=><I {...p} d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2zM16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2"/>,
  zap:p=><I {...p} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>,
  chat:p=><I {...p} d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>,
  load:p=><I {...p} d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>,
  trash:p=><I {...p} d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>,
  x:p=><I {...p} d="M18 6L6 18M6 6l12 12"/>,
  film:p=><I {...p} d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5M2 2h20v20H2z"/>,
};

// ─── MAIN ───────────────────────────────────────────────────────
export default function Dashboard() {
  const [view, setView] = useState("capture");
  const [articles, setArticles] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [input, setInput] = useState("");
  const [inputType, setInputType] = useState("url");
  const [selArticle, setSelArticle] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchRes, setSearchRes] = useState(null);
  const [searchLoad, setSearchLoad] = useState(false);
  const [genPlat, setGenPlat] = useState(null);
  const [genContent, setGenContent] = useState("");
  const [genLoad, setGenLoad] = useState(false);
  const [filterCat, setFilterCat] = useState("Tous");
  const [toast, setToast] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [ytTopic, setYtTopic] = useState("");
  const [ytSel, setYtSel] = useState([]);
  const [ytScript, setYtScript] = useState("");
  const [ytLoad, setYtLoad] = useState(false);
  const [ytSaved, setYtSaved] = useState(false);
  const [ytSelScript, setYtSelScript] = useState(null);

  // ── LOAD DATA ──
  const fetchArticles = async () => {
    const { data } = await supabase.from("articles").select("*").order("created_at", { ascending: false });
    setArticles(data || []);
  };
  const fetchScripts = async () => {
    const { data } = await supabase.from("youtube_scripts").select("*").order("created_at", { ascending: false });
    setScripts(data || []);
  };
  useEffect(() => { fetchArticles(); fetchScripts(); }, []);
  useEffect(() => { setShowRaw(false); }, [selArticle]);

  const showToast = m => { setToast(m); setTimeout(() => setToast(null), 3000); };
  const copyTxt = t => { navigator.clipboard.writeText(t); showToast("Copié !"); };

  // ── DIGEST ──
  const digest = async () => {
    if (!input.trim()) return;
    setLoading(true); setLoadMsg("L'IA analyse en profondeur...");
    try {
      const res = await api("/api/digest", { content: input, inputType });
      if (res.error) { showToast("Erreur : " + res.error); }
      else { await fetchArticles(); setSelArticle(res.article); setInput(""); setView("brief"); showToast("Article digéré !"); }
    } catch (e) { showToast("Erreur : " + e.message); }
    setLoading(false);
  };

  // ── GENERATE ──
  const genCont = async (art, plat) => {
    setGenPlat(plat); setGenLoad(true); setGenContent("");
    try {
      const res = await api("/api/generate", { articleId: art.id, platform: plat });
      if (res.error) setGenContent("Erreur : " + res.error);
      else { setGenContent(res.content); await fetchArticles(); }
    } catch (e) { setGenContent("Erreur : " + e.message); }
    setGenLoad(false);
  };

  // ── SEARCH ──
  const smartSearch = async () => {
    if (!searchQ.trim()) return;
    setSearchLoad(true);
    try {
      const res = await api("/api/search", { query: searchQ });
      setSearchRes(res);
    } catch (e) { setSearchRes({ answer: "Erreur", articles: [] }); }
    setSearchLoad(false);
  };

  // ── YOUTUBE ──
  const genYouTube = async () => {
    if (ytSel.length === 0 && !ytTopic.trim()) { showToast("Sélectionne des articles ou entre un sujet"); return; }
    setYtLoad(true); setYtScript("");
    try {
      const res = await api("/api/youtube", { topic: ytTopic, articleIds: ytSel });
      if (res.error) setYtScript("Erreur : " + res.error);
      else { setYtScript(res.script); await fetchScripts(); showToast("Script généré et sauvegardé !"); }
    } catch (e) { setYtScript("Erreur : " + e.message); }
    setYtLoad(false);
  };

  // ── DELETE ──
  const deleteArt = async id => {
    await supabase.from("articles").delete().eq("id", id);
    await fetchArticles();
    if (selArticle?.id === id) setSelArticle(null);
    showToast("Supprimé");
  };

  // ── COMPUTED ──
  const filtered = filterCat === "Tous" ? articles : articles.filter(a => a.category === filterCat);
  const unexpl = articles.filter(a => !a.exploited).length;
  const avgS = articles.length ? Math.round(articles.reduce((s,a) => s+((a.novelty_score||0)+(a.actionability_score||0)+(a.content_potential_score||0))/3, 0)/articles.length*10)/10 : 0;

  // ── HELPER COMPONENTS ──
  const Badge = ({cat}) => <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold" style={{background:`${CC[cat]||"#888"}18`,color:CC[cat]||"#888"}}>{cat}</span>;
  const SecHead = ({color,children}) => <h4 className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{color}}>{children}</h4>;
  const Card = ({children,className="",...props}) => <div className={`bg-white/[0.025] border border-white/[0.06] rounded-2xl p-5 mb-3 ${className}`} {...props}>{children}</div>;
  const CardH = ({children,className="",...props}) => <div className={`bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 mb-3 cursor-pointer transition-all hover:bg-white/[0.06] hover:border-white/[0.12] ${className}`} {...props}>{children}</div>;
  const Btn = ({variant="primary",children,className="",...props}) => {
    const base = "px-4 py-2 rounded-xl border-none cursor-pointer text-[13px] font-bold transition-all inline-flex items-center gap-2";
    const v = variant==="primary" ? "bg-gradient-to-r from-accent to-accent-dark text-bg" : "bg-white/[0.06] text-gray-400 hover:bg-white/[0.1]";
    return <button className={`${base} ${v} ${className}`} {...props}>{children}</button>;
  };

  // ── CONTENT MODAL ──
  const ContentModal = () => genPlat && (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center p-5" onClick={() => {setGenPlat(null);setGenContent("");}}>
      <div className="bg-[#111118] border border-white/10 rounded-2xl p-7 max-w-[720px] w-full max-h-[85vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-extrabold">{genPlat==="x"?"𝕏 Tweets & Thread":genPlat==="linkedin"?"💼 Posts LinkedIn":"📧 Newsletter"}</h3>
          <button onClick={()=>{setGenPlat(null);setGenContent("");}} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10"><IC.x s={16}/></button>
        </div>
        {genLoad ? (
          <div className="text-center py-10 text-gray-500"><div className="animate-spin inline-block"><IC.load s={24}/></div><p className="mt-3 text-sm">Copywriting expert en cours...</p></div>
        ) : (
          <div>
            <div className="bg-white/[0.03] rounded-xl p-5 whitespace-pre-wrap text-[13px] leading-7 text-gray-400 max-h-[420px] overflow-y-auto">{genContent}</div>
            <div className="flex gap-2 mt-4">
              <Btn onClick={()=>copyTxt(genContent)}><IC.copy s={14}/> Copier</Btn>
              <Btn variant="ghost" onClick={()=>genCont(selArticle,genPlat)}>Régénérer</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  // VIEWS
  // ══════════════════════════════════════════════════════════════

  const VCapture = () => (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Capturer un article</h1>
      <p className="text-gray-500 text-sm mb-5">Colle une URL, du texte brut ou le contenu d'un PDF</p>
      <div className="flex gap-2 mb-4">
        {[["url","🔗 URL"],["texte","📝 Texte"],["pdf","📄 PDF"]].map(([k,l])=>
          <button key={k} onClick={()=>setInputType(k)} className={`px-3.5 py-1.5 rounded-lg border-none cursor-pointer text-xs font-bold transition-all ${inputType===k?"bg-accent text-bg":"bg-white/5 text-gray-500"}`}>{l}</button>
        )}
      </div>
      <Card>
        <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder={inputType==="url"?"https://...":"Colle le contenu ici..."} className="w-full min-h-[130px] p-3.5 bg-white/5 border border-white/10 rounded-xl text-gray-200 text-sm outline-none resize-y font-sans" />
        <div className="flex justify-between items-center mt-3.5">
          <span className="text-xs text-gray-600">{input.length} chars</span>
          <Btn onClick={digest} disabled={loading||!input.trim()} className={loading||!input.trim()?"opacity-50":""}>{loading?<><IC.load s={14}/> {loadMsg}</>:<><IC.zap s={14}/> Digérer</>}</Btn>
        </div>
      </Card>
      {articles.length>0 && (
        <div className="mt-6">
          <h3 className="text-[15px] font-bold mb-3">Derniers articles</h3>
          {articles.slice(0,3).map(a=>(
            <CardH key={a.id} onClick={()=>{setSelArticle(a);setView("brief");}}>
              <Badge cat={a.category}/>
              <h4 className="text-sm font-bold mt-1.5 mb-1">{a.title}</h4>
              <p className="text-xs text-gray-500 leading-relaxed">{a.summary_one_line}</p>
            </CardH>
          ))}
        </div>
      )}
    </div>
  );

  const VBrief = () => {
    const da = selArticle || articles[0];
    const todayArts = articles.filter(a => new Date(a.created_at).toDateString() === new Date().toDateString());
    return (
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight mb-1">Brief du jour</h1>
        <p className="text-gray-500 text-sm mb-5">{new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})} — {todayArts.length} article{todayArts.length!==1?"s":""} aujourd'hui</p>
        <div className="flex gap-2.5 mb-5">
          <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center"><div className="text-2xl font-extrabold text-accent">{articles.length}</div><div className="text-[11px] text-gray-500 mt-1">Total</div></div>
          <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center"><div className="text-2xl font-extrabold text-yellow-400">{unexpl}</div><div className="text-[11px] text-gray-500 mt-1">Non exploités</div></div>
          <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center"><div className="text-2xl font-extrabold text-purple-400">{avgS}</div><div className="text-[11px] text-gray-500 mt-1">Score moy.</div></div>
        </div>
        {da ? (
          <Card>
            <div className="flex justify-between items-start mb-4">
              <div><Badge cat={da.category}/><h2 className="text-lg font-extrabold mt-2 tracking-tight">{da.title}</h2>{da.source&&<p className="text-[11px] text-gray-600 mt-1">{da.source}</p>}</div>
              <div className="flex gap-1.5">
                <button onClick={()=>setShowRaw(!showRaw)} className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-bold text-gray-400 border-none cursor-pointer">{showRaw ? "Masquer brut" : "📄 Article brut"}</button>
                <button onClick={()=>deleteArt(da.id)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10"><IC.trash s={14} c="#f87171"/></button>
              </div>
            </div>

            {showRaw && da.raw_input && (
              <div className="mb-5">
                <div className="flex justify-between items-center mb-2">
                  <SecHead color="#888">Article brut original</SecHead>
                  <button onClick={()=>copyTxt(da.raw_input)} className="px-2 py-1 rounded-md bg-white/5 text-[10px] text-gray-400 border-none cursor-pointer hover:bg-white/10 flex items-center gap-1"><IC.copy s={11}/> Copier</button>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 max-h-[400px] overflow-y-auto">
                  <pre className="text-[12px] leading-6 text-gray-500 whitespace-pre-wrap font-sans">{da.raw_input}</pre>
                </div>
              </div>
            )}

            <div className="mb-5"><SecHead color="#00d4aa">Résumé express</SecHead><p className="text-[15px] leading-relaxed text-gray-300 font-semibold">{da.summary_one_line}</p></div>
            <div className="mb-5"><SecHead color="#38bdf8">Résumé développé</SecHead><p className="text-[13px] leading-7 text-gray-400">{da.summary_paragraph}</p></div>
            <div className="mb-5"><SecHead color="#fbbf24">Analyse complète</SecHead><p className="text-[13px] leading-7 text-gray-400">{da.summary_full}</p></div>

            <div className="mb-5">
              <SecHead color="#c084fc">⚡ Insights actionnables</SecHead>
              <div className="flex flex-col gap-1.5">
                {(da.actionable_insights||[]).map((ins,i) => {
                  const c = ins.startsWith("FAIRE")?"#00d4aa":ins.startsWith("TESTER")?"#fbbf24":ins.startsWith("ÉVITER")?"#f87171":"#c084fc";
                  return <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-r-lg" style={{background:`${c}08`,borderLeft:`3px solid ${c}`}}><span className="text-xs leading-relaxed text-gray-300">{ins}</span></div>;
                })}
              </div>
            </div>

            {(da.mental_models||[]).length>0 && <div className="mb-5"><SecHead color="#fb923c">🧠 Modèles mentaux</SecHead>{da.mental_models.map((m,i)=><div key={i} className="px-3 py-2 bg-orange-500/[0.06] rounded-lg mb-1 text-xs text-gray-300 leading-relaxed">{m}</div>)}</div>}

            {da.contrarian_take && <div className="mb-5"><SecHead color="#f472b6">🔄 Angle contrarian</SecHead><div className="px-4 py-3 bg-pink-400/[0.06] border-l-[3px] border-pink-400 rounded-r-lg"><p className="text-[13px] font-semibold text-pink-400 leading-relaxed">{da.contrarian_take}</p></div></div>}

            <div className="mb-5"><SecHead color="#38bdf8">💎 Takeaway principal</SecHead><div className="px-4 py-3.5 bg-gradient-to-r from-sky-400/[0.08] to-accent/[0.05] border-l-[3px] border-sky-400 rounded-r-xl"><p className="text-sm font-bold text-sky-400 leading-relaxed">{da.one_key_takeaway}</p></div></div>

            {(da.content_angles||[]).length>0 && <div className="mb-5"><SecHead color="#a3e635">🎯 Angles de contenu</SecHead>{da.content_angles.map((a,i)=><div key={i} className="px-2.5 py-1.5 bg-lime-400/[0.06] rounded-md mb-1 text-[11px] text-gray-400 leading-relaxed">{a}</div>)}</div>}

            <div className="mb-5"><SecHead color="#888">Scores</SecHead><div className="flex gap-4">{[{l:"Nouveauté",s:da.novelty_score,c:"#00d4aa"},{l:"Actionnabilité",s:da.actionability_score,c:"#fbbf24"},{l:"Potentiel contenu",s:da.content_potential_score,c:"#c084fc"}].map((x,i)=><div key={i} className="flex-1"><div className="flex justify-between mb-1"><span className="text-[10px] text-gray-500">{x.l}</span><span className="text-[10px] font-extrabold" style={{color:x.c}}>{x.s}/10</span></div><div className="h-1 bg-white/5 rounded-sm"><div className="h-1 rounded-sm transition-all duration-500" style={{width:`${(x.s||0)*10}%`,background:x.c}}/></div></div>)}</div></div>

            <div className="mb-5 flex flex-wrap gap-1">{(da.tags||[]).map((t,i)=><span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/[0.06] text-gray-500">#{t}</span>)}</div>

            <div className="border-t border-white/[0.06] pt-4">
              <SecHead color="#888">Générer du contenu</SecHead>
              <div className="flex gap-2 flex-wrap">
                <Btn variant="ghost" onClick={()=>genCont(da,"x")}>𝕏 Tweet & Thread</Btn>
                <Btn variant="ghost" onClick={()=>genCont(da,"linkedin")}>💼 LinkedIn</Btn>
                <Btn variant="ghost" onClick={()=>genCont(da,"newsletter")}>📧 Newsletter</Btn>
              </div>
            </div>
          </Card>
        ) : <div className="text-center py-12 text-gray-600"><p className="text-4xl mb-3">📭</p><p className="font-semibold">Aucun article</p></div>}
        {todayArts.length>1 && <div className="mt-4"><h3 className="text-[13px] font-bold text-gray-500 mb-3">Autres du jour</h3>{todayArts.filter(a=>a.id!==da?.id).map(a=><CardH key={a.id} onClick={()=>setSelArticle(a)}><Badge cat={a.category}/><h4 className="text-[13px] font-bold mt-1">{a.title}</h4></CardH>)}</div>}
        <ContentModal/>
      </div>
    );
  };

  const VKnow = () => (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Base de connaissances</h1>
      <p className="text-gray-500 text-sm mb-5">{articles.length} article{articles.length!==1?"s":""}</p>
      <Card className="mb-5">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-accent uppercase tracking-widest mb-3"><IC.chat s={14} c="#00d4aa"/> Recherche intelligente</div>
        <div className="flex gap-2">
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&smartSearch()} placeholder="Ex: 'Quels frameworks de scaling j'ai capturés ?'" className="flex-1 px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-200 text-sm outline-none font-sans"/>
          <Btn onClick={smartSearch} disabled={searchLoad}>{searchLoad?<IC.load s={14}/>:<IC.search s={14}/>}</Btn>
        </div>
        {searchRes && (
          <div className="mt-4">
            <div className="bg-accent/5 rounded-xl p-4"><p className="text-[13px] leading-7 text-gray-300 whitespace-pre-wrap">{searchRes.answer}</p></div>
            {searchRes.articles?.length>0 && <div className="mt-3"><p className="text-[11px] text-gray-500 mb-2">Articles liés :</p>{searchRes.articles.map(a=><CardH key={a.id} className="!p-3 !mb-1.5" onClick={()=>{setSelArticle(a);setView("brief");}}><Badge cat={a.category}/><span className="text-xs font-semibold ml-2">{a.title}</span></CardH>)}</div>}
          </div>
        )}
      </Card>
      <div className="flex gap-1.5 flex-wrap mb-4">
        {["Tous",...CATS].map(c=><button key={c} onClick={()=>setFilterCat(c)} className={`px-3 py-1 rounded-lg border-none cursor-pointer text-[11px] font-bold transition-all ${filterCat===c?`text-[${CC[c]||"#00d4aa"}]`:"text-gray-500"}`} style={{background:filterCat===c?`${CC[c]||"#00d4aa"}22`:"rgba(255,255,255,0.04)",color:filterCat===c?(CC[c]||"#00d4aa"):"#777"}}>{c} {c!=="Tous"&&`(${articles.filter(a=>a.category===c).length})`}</button>)}
      </div>
      {filtered.length>0?filtered.map(a=>(
        <CardH key={a.id} onClick={()=>{setSelArticle(a);setView("brief");}}>
          <div className="flex justify-between"><div className="flex-1"><div className="flex items-center gap-2 mb-1.5"><Badge cat={a.category}/>{!a.exploited&&<span className="text-[9px] text-yellow-400 font-bold">● Non exploité</span>}</div><h4 className="text-sm font-bold mb-1">{a.title}</h4><p className="text-xs text-gray-500 leading-relaxed mb-2">{a.summary_one_line}</p><div className="flex flex-wrap gap-1">{(a.tags||[]).slice(0,4).map((t,i)=><span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/[0.06] text-gray-500">#{t}</span>)}</div></div>
          <div className="text-right ml-4"><span className="text-[10px] text-gray-600">{new Date(a.created_at).toLocaleDateString("fr-FR")}</span><div className="mt-2"><span className="text-lg font-extrabold text-accent">{Math.round(((a.novelty_score||0)+(a.actionability_score||0)+(a.content_potential_score||0))/3*10)/10}</span><span className="text-[10px] text-gray-600">/10</span></div></div></div>
        </CardH>
      )):<div className="text-center py-10 text-gray-600">Aucun article</div>}
    </div>
  );

  const VContent = () => {
    const expl = articles.filter(a=>a.exploited), unex = articles.filter(a=>!a.exploited);
    return (
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight mb-1">Content Lab</h1>
        <p className="text-gray-500 text-sm mb-5">Transforme tes insights en contenu expert</p>
        {unex.length>0 && <Card className="!border-yellow-400/20"><h4 className="text-[13px] font-bold text-yellow-400 mb-2">⚡ {unex.length} insight{unex.length>1?"s":""} non exploité{unex.length>1?"s":""}</h4>{unex.slice(0,5).map(a=><div key={a.id} className="flex justify-between items-center py-2 border-b border-white/[0.03]"><div><Badge cat={a.category}/><span className="text-xs font-semibold ml-2">{a.title}</span></div><div className="flex gap-1.5">{["x","linkedin","newsletter"].map(p=><button key={p} onClick={()=>{setSelArticle(a);genCont(a,p);}} className="px-2 py-1 rounded-md bg-white/5 text-[10px] text-gray-400 hover:bg-white/10 border-none cursor-pointer">{p==="x"?"𝕏":p==="linkedin"?"💼":"📧"}</button>)}</div></div>)}</Card>}
        {expl.map(a=><Card key={a.id}><div className="flex justify-between mb-3"><div><Badge cat={a.category}/><span className="text-[13px] font-bold ml-2">{a.title}</span></div><span className="text-[10px] text-gray-600">{new Date(a.created_at).toLocaleDateString("fr-FR")}</span></div><div className="flex gap-1.5 flex-wrap">{["x","linkedin","newsletter"].map(p=><div key={p} className="flex-1 min-w-[140px]">{a[`content_${p}`]?<div className="bg-white/[0.03] rounded-lg p-2.5"><div className="flex justify-between mb-1.5"><span className="text-[11px] font-bold text-gray-500">{p==="x"?"𝕏":p==="linkedin"?"💼":"📧"}</span><button onClick={()=>copyTxt(a[`content_${p}`])} className="p-1 rounded bg-white/5 border-none cursor-pointer"><IC.copy s={11}/></button></div><p className="text-[11px] text-gray-500 leading-snug max-h-[60px] overflow-hidden">{a[`content_${p}`].substring(0,120)}...</p></div>:<button onClick={()=>{setSelArticle(a);genCont(a,p);}} className="w-full py-2 rounded-lg bg-white/5 text-[11px] text-gray-500 border-none cursor-pointer hover:bg-white/10">Générer {p==="x"?"𝕏":p==="linkedin"?"💼":"📧"}</button>}</div>)}</div></Card>)}
        <ContentModal/>
      </div>
    );
  };

  const VYouTube = () => {
    const toggle = id => setYtSel(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);
    const cg = {}; articles.forEach(a => { if(!cg[a.category]) cg[a.category]=[]; cg[a.category].push(a); });
    return (
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight mb-1">🎬 YouTube Scripts</h1>
        <p className="text-gray-500 text-sm mb-5">Scripts complets prêts à lire devant la caméra</p>
        <div className="flex gap-2 mb-5">
          <button onClick={()=>setYtSaved(false)} className={`px-3.5 py-1.5 rounded-lg border-none cursor-pointer text-xs font-bold ${!ytSaved?"bg-accent text-bg":"bg-white/5 text-gray-500"}`}>✍️ Créer</button>
          <button onClick={()=>setYtSaved(true)} className={`px-3.5 py-1.5 rounded-lg border-none cursor-pointer text-xs font-bold ${ytSaved?"bg-accent text-bg":"bg-white/5 text-gray-500"}`}>📚 Sauvegardés ({scripts.length})</button>
        </div>
        {!ytSaved ? (
          <div>
            <Card><SecHead color="#f87171">Sujet de la vidéo (optionnel)</SecHead><input value={ytTopic} onChange={e=>setYtTopic(e.target.value)} placeholder="Ex: 'Comment l'IA va remplacer 80% des tâches business en 2026'" className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-200 text-sm outline-none font-sans"/><p className="text-[11px] text-gray-600 mt-1.5">Laisse vide pour un sujet auto basé sur les articles</p></Card>
            <Card>
              <div className="flex justify-between items-center mb-3"><SecHead color="#38bdf8">Articles sources ({ytSel.length} sélectionné{ytSel.length>1?"s":""})</SecHead>{ytSel.length>0&&<button onClick={()=>setYtSel([])} className="px-2 py-1 rounded-md bg-white/5 text-[10px] text-gray-400 border-none cursor-pointer">Désélectionner</button>}</div>
              {articles.length>0 ? <div className="max-h-[300px] overflow-y-auto">{Object.entries(cg).map(([cat,arts])=><div key={cat} className="mb-3"><div className="flex items-center gap-1.5 mb-1.5"><div className="w-2 h-2 rounded-full" style={{background:CC[cat]||"#888"}}/><span className="text-[11px] font-bold" style={{color:CC[cat]||"#888"}}>{cat}</span></div>{arts.map(a=>{const sel=ytSel.includes(a.id);return <div key={a.id} onClick={()=>toggle(a.id)} className={`flex items-center gap-2.5 px-2.5 py-2 mb-1 rounded-lg cursor-pointer transition-all ${sel?"bg-accent/[0.08] border border-accent/30":"bg-white/[0.02] border border-white/[0.04]"}`}><div className={`w-4 h-4 rounded flex items-center justify-center border-2 flex-shrink-0 ${sel?"border-accent bg-accent":"border-gray-600"}`}>{sel&&<span className="text-bg text-[10px] font-extrabold">✓</span>}</div><div className="flex-1 min-w-0"><h5 className={`text-xs font-semibold truncate ${sel?"text-gray-200":"text-gray-400"}`}>{a.title}</h5></div></div>})}</div>)}</div> : <p className="text-xs text-gray-600">Aucun article.</p>}
            </Card>
            <div className="flex justify-center my-5">
              <Btn onClick={genYouTube} disabled={ytLoad||(ytSel.length===0&&!ytTopic.trim())} className={`!px-8 !py-3.5 !text-[15px] ${ytLoad||(ytSel.length===0&&!ytTopic.trim())?"opacity-50":""}`}>{ytLoad?<><IC.load s={18}/> Écriture en cours...</>:<><IC.play s={18}/> Générer le script</>}</Btn>
            </div>
            {ytScript && <Card className="!border-red-400/20"><div className="flex justify-between items-center mb-4"><h3 className="text-base font-extrabold text-red-400">🎬 Script généré</h3><Btn onClick={()=>copyTxt(ytScript)}><IC.copy s={14}/> Copier</Btn></div><div className="bg-white/[0.02] rounded-xl p-5 whitespace-pre-wrap text-[13px] leading-[1.8] text-gray-400 max-h-[600px] overflow-y-auto">{ytScript}</div></Card>}
          </div>
        ) : (
          <div>
            {scripts.length>0?scripts.map(s=><Card key={s.id}><div className="flex justify-between items-center mb-2.5"><div><h4 className="text-sm font-bold">{s.topic}</h4><span className="text-[10px] text-gray-600">{new Date(s.created_at).toLocaleDateString("fr-FR")} — {(s.article_ids||[]).length} source{(s.article_ids||[]).length>1?"s":""}</span></div><div className="flex gap-1.5"><Btn onClick={()=>copyTxt(s.script)} className="!px-2.5 !py-1.5 !text-[11px]"><IC.copy s={12}/>Copier</Btn><Btn variant="ghost" onClick={()=>setYtSelScript(ytSelScript===s.id?null:s.id)} className="!px-2.5 !py-1.5 !text-[11px]">{ytSelScript===s.id?"Fermer":"Voir"}</Btn></div></div>{ytSelScript===s.id&&<div className="bg-white/[0.02] rounded-xl p-4 whitespace-pre-wrap text-[13px] leading-[1.8] text-gray-400 max-h-[500px] overflow-y-auto mt-2">{s.script}</div>}</Card>):<div className="text-center py-12 text-gray-600"><p className="text-4xl mb-3">🎬</p><p className="font-semibold">Aucun script</p></div>}
          </div>
        )}
      </div>
    );
  };

  const VConn = () => {
    const cg = {}; articles.forEach(a => { if(!cg[a.category]) cg[a.category]=[]; cg[a.category].push(a); });
    return (
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight mb-1">Connexions</h1>
        <p className="text-gray-500 text-sm mb-5">Clusters de connaissances</p>
        {Object.keys(cg).length>0?Object.entries(cg).map(([cat,arts])=><div key={cat} className="mb-5"><div className="flex items-center gap-2 mb-3"><div className="w-2.5 h-2.5 rounded-full" style={{background:CC[cat]||"#888"}}/><h3 className="text-[15px] font-extrabold" style={{color:CC[cat]||"#888"}}>{cat}</h3><span className="text-[11px] text-gray-600">({arts.length})</span></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">{arts.map(a=><CardH key={a.id} className="!p-3.5" onClick={()=>{setSelArticle(a);setView("brief");}}><h4 className="text-xs font-bold mb-1">{a.title}</h4><p className="text-[11px] text-gray-500 leading-snug mb-2">{a.summary_one_line}</p><div className="flex flex-wrap gap-1">{(a.tags||[]).slice(0,3).map((t,i)=><span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white/[0.06] text-gray-500">#{t}</span>)}</div></CardH>)}</div></div>):<div className="text-center py-12 text-gray-600"><p className="text-4xl mb-3">🕸️</p><p>Digère des articles</p></div>}
      </div>
    );
  };

  const views = {capture:VCapture,brief:VBrief,knowledge:VKnow,content:VContent,youtube:VYouTube,connections:VConn};
  const navs = [{k:"capture",l:"Capture",i:IC.plus},{k:"brief",l:"Brief",i:IC.clip},{k:"knowledge",l:"Knowledge",i:IC.book},{k:"content",l:"Content Lab",i:IC.pen},{k:"youtube",l:"YouTube",i:IC.film},{k:"connections",l:"Connexions",i:IC.globe}];

  return (
    <div className="min-h-screen bg-bg text-gray-200">
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-bg/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-2.5"><span className="text-xl">⚡</span><span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-accent to-sky-400 bg-clip-text text-transparent">InsightBase</span></div>
        <nav className="flex gap-0.5 bg-white/[0.04] rounded-xl p-1 flex-wrap">
          {navs.map(({k,l,i:Ico})=><button key={k} onClick={()=>setView(k)} className={`px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold flex items-center gap-1.5 transition-all ${view===k?"bg-accent/15 text-accent":"text-gray-500 hover:text-gray-300"}`}><Ico s={14}/> {l}</button>)}
        </nav>
      </header>
      <main className="max-w-[1200px] mx-auto p-5">{views[view]?.()}</main>
      {toast && <div className="fixed bottom-5 right-5 bg-accent text-bg px-5 py-2.5 rounded-xl font-bold text-[13px] z-[100] animate-fade-in">{toast}</div>}
    </div>
  );
}
