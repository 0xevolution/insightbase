"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";

const supabase = createClient();

// Safe string helper — prevents React error #300 (rendering objects)
const str = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  try { return JSON.stringify(v); } catch { return ""; }
};

const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v) => (typeof v === "number" ? v : 0);

const CATS = ["IA","Business","Mindset","Vibecoding","Outils","Tendances","Dev Personnel","Trading","Marketing","Science"];
const CC = {"IA":"#00d4aa","Business":"#fbbf24","Mindset":"#c084fc","Vibecoding":"#38bdf8","Outils":"#fb923c","Tendances":"#f472b6","Dev Personnel":"#a3e635","Trading":"#6ee7b7","Marketing":"#f87171","Science":"#67e8f9"};

const api = async (path, body) => {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
};

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

export default function Dashboard() {
  const [view, setView] = useState("capture");
  const [articles, setArticles] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [input, setInput] = useState("");
  const [inputType, setInputType] = useState("text");
  const [selArticle, setSelArticle] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchRes, setSearchRes] = useState(null);
  const [searchLoad, setSearchLoad] = useState(false);
  const [genPlat, setGenPlat] = useState(null);
  const [genContent, setGenContent] = useState("");
  const [genLoad, setGenLoad] = useState(false);
  const [filterCat, setFilterCat] = useState("Tous");
  const [kwSearch, setKwSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [ytTopic, setYtTopic] = useState("");
  const [ytSel, setYtSel] = useState([]);
  const [ytScript, setYtScript] = useState("");
  const [ytLoad, setYtLoad] = useState(false);
  const [ytSaved, setYtSaved] = useState(false);
  const [ytSelScript, setYtSelScript] = useState(null);

  const fetchArticles = async () => {
    try {
      const { data } = await supabase.from("articles").select("*").order("created_at", { ascending: false });
      setArticles(data || []);
    } catch { setArticles([]); }
  };
  const fetchScripts = async () => {
    try {
      const { data } = await supabase.from("youtube_scripts").select("*").order("created_at", { ascending: false });
      setScripts(data || []);
    } catch { setScripts([]); }
  };
  useEffect(() => { fetchArticles(); fetchScripts(); }, []);
  useEffect(() => { setShowRaw(false); }, [selArticle]);

  const showToast = m => { setToast(m); setTimeout(() => setToast(null), 3000); };
  const copyTxt = t => { try { navigator.clipboard.writeText(t); showToast("Copié !"); } catch {} };

  const digest = async () => {
    if (!input.trim()) return;
    setLoading(true); setLoadMsg("L'IA analyse en profondeur...");
    try {
      const res = await api("/api/digest", { content: input, inputType: inputType === "texte" ? "text" : inputType });
      if (res.error) { showToast("Erreur : " + str(res.error)); }
      else { await fetchArticles(); setSelArticle(res.article); setInput(""); setView("brief"); showToast("Article digéré !"); }
    } catch (e) { showToast("Erreur : " + e.message); }
    setLoading(false);
  };

  const genCont = async (art, plat, angle) => {
    if (!art || !art.id) return;
    setGenPlat(plat); setGenLoad(true); setGenContent("");
    try {
      const res = await api("/api/generate", { articleId: art.id, platform: plat, angle: angle || null });
      if (res.error) setGenContent("Erreur : " + str(res.error));
      else { setGenContent(str(res.content)); await fetchArticles(); }
    } catch (e) { setGenContent("Erreur : " + e.message); }
    setGenLoad(false);
  };

  const smartSearch = async () => {
    if (!searchQ.trim()) return;
    setSearchLoad(true);
    try {
      const res = await api("/api/search", { query: searchQ });
      setSearchRes({ answer: str(res.answer), articles: arr(res.articles) });
    } catch { setSearchRes({ answer: "Erreur de recherche", articles: [] }); }
    setSearchLoad(false);
  };

  const genYouTube = async () => {
    if (ytSel.length === 0 && !ytTopic.trim()) { showToast("Sélectionne des articles ou entre un sujet"); return; }
    setYtLoad(true); setYtScript("");
    try {
      const res = await api("/api/youtube", { topic: ytTopic, articleIds: ytSel });
      if (res.error) setYtScript("Erreur : " + str(res.error));
      else { setYtScript(str(res.script || res.raw_text || "")); await fetchScripts(); showToast("Script généré !"); }
    } catch (e) { setYtScript("Erreur : " + e.message); }
    setYtLoad(false);
  };

  const deleteArt = async id => {
    try {
      await supabase.from("articles").delete().eq("id", id);
      await fetchArticles();
      if (selArticle && selArticle.id === id) setSelArticle(null);
      showToast("Supprimé");
    } catch {}
  };

  const filtered = articles.filter(a => {
    if (filterCat !== "Tous" && a.category !== filterCat) return false;
    if (kwSearch.trim()) {
      const q = kwSearch.toLowerCase();
      const searchable = [str(a.title), str(a.source), str(a.summary_one_line), str(a.summary_full), str(a.one_key_takeaway), str(a.category), ...arr(a.tags).map(str), ...arr(a.key_concepts).map(str)].join(" ").toLowerCase();
      return q.split(/\s+/).every(w => searchable.includes(w));
    }
    return true;
  });
  const unexpl = articles.filter(a => !a.exploited).length;
  const avgS = articles.length ? Math.round(articles.reduce((s,a) => s+(num(a.novelty_score)+num(a.actionability_score)+num(a.content_potential_score))/3, 0)/articles.length*10)/10 : 0;

  const Badge = ({cat}) => <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold" style={{background:`${CC[cat]||"#888"}18`,color:CC[cat]||"#888"}}>{str(cat)}</span>;
  const SecHead = ({color,children}) => <h4 className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{color}}>{children}</h4>;
  const Card = ({children,className="",...props}) => <div className={`bg-white/[0.025] border border-white/[0.06] rounded-2xl p-5 mb-3 ${className}`} {...props}>{children}</div>;
  const CardH = ({children,className="",...props}) => <div className={`bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 mb-3 cursor-pointer transition-all hover:bg-white/[0.06] hover:border-white/[0.12] ${className}`} {...props}>{children}</div>;
  const Btn = ({variant="primary",children,className="",...props}) => <button className={`px-4 py-2 rounded-xl border-none cursor-pointer text-[13px] font-bold transition-all inline-flex items-center gap-2 ${variant==="primary"?"bg-gradient-to-r from-accent to-accent-dark text-bg":"bg-white/[0.06] text-gray-400 hover:bg-white/[0.1]"} ${className}`} {...props}>{children}</button>;

  const ContentModal = () => genPlat && (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center p-5" onClick={()=>{setGenPlat(null);setGenContent("");}}>
      <div className="bg-[#111118] border border-white/10 rounded-2xl p-7 max-w-[720px] w-full max-h-[85vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-extrabold">{genPlat==="x"?"𝕏 Tweets & Thread":genPlat==="linkedin"?"💼 Posts LinkedIn":"📧 Newsletter"}</h3>
          <button onClick={()=>{setGenPlat(null);setGenContent("");}} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border-none cursor-pointer"><IC.x s={16}/></button>
        </div>
        {genLoad ? (
          <div className="text-center py-10 text-gray-500"><div className="animate-spin inline-block"><IC.load s={24}/></div><p className="mt-3 text-sm">Copywriting en cours...</p></div>
        ) : (
          <div>
            <div className="bg-white/[0.03] rounded-xl p-5 whitespace-pre-wrap text-[13px] leading-7 text-gray-400 max-h-[420px] overflow-y-auto">{str(genContent)}</div>
            <div className="flex gap-2 mt-4">
              <Btn onClick={()=>copyTxt(genContent)}><IC.copy s={14}/> Copier</Btn>
              <Btn variant="ghost" onClick={()=>selArticle && genCont(selArticle,genPlat)}>Régénérer</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ═══ CAPTURE ═══
  const VCapture = () => (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Capturer un article</h1>
      <p className="text-gray-500 text-sm mb-5">Colle du texte, une URL, un lien Twitter, ou glisse un PDF</p>
      <div className="flex gap-2 mb-4">
        {[["text","📝 Texte"],["link","🔗 Lien / Thread"],["pdf","📄 PDF"]].map(([k,l])=>
          <button key={k} onClick={()=>setInputType(k)} className={`px-3.5 py-1.5 rounded-lg border-none cursor-pointer text-xs font-bold transition-all ${inputType===k?"bg-accent text-bg":"bg-white/5 text-gray-500"}`}>{l}</button>
        )}
      </div>

      {inputType === "pdf" && !input && (
        <div
          onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="#00d4aa";}}
          onDragLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";}}
          onDrop={e=>{
            e.preventDefault();
            e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";
            const file = e.dataTransfer.files[0];
            if (file && file.type === "application/pdf") {
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const text = reader.result;
                  const decoded = new TextDecoder("utf-8",{fatal:false}).decode(new Uint8Array(text));
                  let extracted = "";
                  const streams = decoded.match(/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g) || [];
                  for (const s of streams) {
                    const clean = s.replace(/^stream[\r\n]+/,"").replace(/[\r\n]+endstream$/,"").replace(/[^\x20-\x7E\r\n]/g," ").replace(/\s+/g," ").trim();
                    if (clean.length > 20) extracted += clean + "\n\n";
                  }
                  setInput(extracted.trim() || "Extraction automatique limitée. Copie-colle le contenu du PDF manuellement dans la zone texte.");
                  setInputType("pdf");
                  showToast("PDF chargé : " + file.name);
                } catch { showToast("Erreur PDF. Copie-colle le contenu manuellement."); }
              };
              reader.readAsArrayBuffer(file);
            } else { showToast("Seuls les fichiers PDF sont acceptés"); }
          }}
          onClick={()=>{const i=document.createElement("input");i.type="file";i.accept=".pdf";i.onchange=e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=()=>{try{const d=new TextDecoder("utf-8",{fatal:false}).decode(new Uint8Array(r.result));let ex="";const st=d.match(/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g)||[];for(const s of st){const c=s.replace(/^stream[\r\n]+/,"").replace(/[\r\n]+endstream$/,"").replace(/[^\x20-\x7E\r\n]/g," ").replace(/\s+/g," ").trim();if(c.length>20)ex+=c+"\n\n";}setInput(ex.trim()||"Copie-colle le contenu du PDF manuellement.");setInputType("pdf");showToast("PDF chargé : "+f.name);}catch{showToast("Erreur PDF");}};r.readAsArrayBuffer(f);}};i.click();}}
          className="border-2 border-dashed border-white/10 rounded-2xl p-10 mb-4 text-center cursor-pointer transition-all hover:border-white/20"
        >
          <p className="text-3xl mb-3">📄</p>
          <p className="text-sm font-bold text-gray-300">Glisse ton PDF ici</p>
          <p className="text-xs text-gray-600 mt-1">ou clique pour sélectionner un fichier</p>
        </div>
      )}

      <Card>
        <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder={inputType==="link"?"https://x.com/user/status/... ou n'importe quel lien":inputType==="pdf"?"Le contenu du PDF apparaîtra ici (ou colle-le manuellement)...":"Colle le contenu de l'article ici..."} className="w-full min-h-[130px] p-3.5 bg-white/5 border border-white/10 rounded-xl text-gray-200 text-sm outline-none resize-y font-sans" />
        <div className="flex justify-between items-center mt-3.5">
          <span className="text-xs text-gray-600">{input.length} chars{input.trim() && " · ~" + input.trim().split(/\s+/).length + " mots"}</span>
          <Btn onClick={digest} disabled={loading||!input.trim()} className={loading||!input.trim()?"opacity-50":""}>{loading?<><IC.load s={14}/> {str(loadMsg)}</>:<><IC.zap s={14}/> Digérer</>}</Btn>
        </div>
      </Card>
      {articles.length>0 && (
        <div className="mt-6">
          <h3 className="text-[15px] font-bold mb-3">Derniers articles</h3>
          {articles.slice(0,3).map(a=>(
            <CardH key={a.id} onClick={()=>{setSelArticle(a);setView("brief");}}>
              <Badge cat={a.category}/><h4 className="text-sm font-bold mt-1.5 mb-1">{str(a.title)}</h4>
              <p className="text-xs text-gray-500 leading-relaxed">{str(a.summary_one_line)}</p>
            </CardH>
          ))}
        </div>
      )}
    </div>
  );

  // ═══ BRIEF ═══
  const VBrief = () => {
    const da = selArticle || articles[0];
    if (!da) return <div className="text-center py-12 text-gray-600"><p className="text-4xl mb-3">📭</p><p className="font-semibold">Aucun article digéré</p><p className="text-sm mt-2">Va dans Capture pour digérer ton premier article.</p></div>;

    return (
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight mb-1">Brief</h1>
        <p className="text-gray-500 text-sm mb-5">{articles.length} article{articles.length!==1?"s":""} — {unexpl} non exploité{unexpl!==1?"s":""}</p>

        <div className="flex gap-2.5 mb-5">
          <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center"><div className="text-2xl font-extrabold text-accent">{articles.length}</div><div className="text-[11px] text-gray-500 mt-1">Total</div></div>
          <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center"><div className="text-2xl font-extrabold text-yellow-400">{unexpl}</div><div className="text-[11px] text-gray-500 mt-1">Non exploités</div></div>
          <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center"><div className="text-2xl font-extrabold text-purple-400">{avgS}</div><div className="text-[11px] text-gray-500 mt-1">Score moy.</div></div>
        </div>

        <Card>
          <div className="flex justify-between items-start mb-4">
            <div>
              <Badge cat={da.category}/>
              <h2 className="text-lg font-extrabold mt-2 tracking-tight">{str(da.title)}</h2>
              {da.source && <p className="text-[11px] text-gray-600 mt-1">{str(da.source)}</p>}
            </div>
            <div className="flex gap-1.5">
              <button onClick={()=>setShowRaw(!showRaw)} className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-bold text-gray-400 border-none cursor-pointer">{showRaw?"Masquer":"📄 Brut"}</button>
              <button onClick={()=>deleteArt(da.id)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border-none cursor-pointer"><IC.trash s={14} c="#f87171"/></button>
            </div>
          </div>

          {showRaw && <div className="mb-5"><SecHead color="#888">Article brut</SecHead><div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 max-h-[300px] overflow-y-auto"><pre className="text-[12px] leading-6 text-gray-500 whitespace-pre-wrap font-sans">{str(da.raw_input)}</pre></div></div>}

          <div className="mb-5"><SecHead color="#00d4aa">Résumé express</SecHead><p className="text-[15px] leading-relaxed text-gray-300 font-semibold">{str(da.summary_one_line)}</p></div>
          <div className="mb-5"><SecHead color="#38bdf8">Résumé développé</SecHead><p className="text-[13px] leading-7 text-gray-400">{str(da.summary_paragraph)}</p></div>
          <div className="mb-5"><SecHead color="#fbbf24">Analyse complète</SecHead><p className="text-[13px] leading-7 text-gray-400">{str(da.summary_full)}</p></div>

          {arr(da.actionable_insights).length>0 && <div className="mb-5"><SecHead color="#c084fc">⚡ Insights actionnables</SecHead><div className="flex flex-col gap-1.5">{arr(da.actionable_insights).map((ins,i)=>{const s=str(ins);const c=s.startsWith("FAIRE")?"#00d4aa":s.startsWith("TESTER")?"#fbbf24":s.startsWith("ÉVITER")?"#f87171":"#c084fc";return <div key={i} className="px-3 py-2 rounded-r-lg text-xs leading-relaxed text-gray-300" style={{background:c+"08",borderLeft:`3px solid ${c}`}}>{s}</div>})}</div></div>}

          {arr(da.golden_nuggets).length>0 && <div className="mb-5"><SecHead color="#fbbf24">💡 Pépites</SecHead>{arr(da.golden_nuggets).map((n,i)=><div key={i} className="px-3 py-2 bg-yellow-400/[0.06] rounded-lg mb-1.5"><p className="text-xs font-bold text-yellow-400 mb-1">{str(n&&n.title)}</p><p className="text-xs text-gray-400 leading-relaxed">{str(n&&n.idea)}</p>{n&&n.why_powerful&&<p className="text-[10px] text-gray-500 mt-1">↳ {str(n.why_powerful)}</p>}</div>)}</div>}

          {arr(da.mental_models).length>0 && <div className="mb-5"><SecHead color="#fb923c">🧠 Modèles mentaux</SecHead>{arr(da.mental_models).map((m,i)=><div key={i} className="px-3 py-2 bg-orange-500/[0.06] rounded-lg mb-1 text-xs text-gray-300 leading-relaxed">{str(m)}</div>)}</div>}

          {da.contrarian_take && <div className="mb-5"><SecHead color="#f472b6">🔄 Angle contrarian</SecHead><div className="px-4 py-3 bg-pink-400/[0.06] border-l-[3px] border-pink-400 rounded-r-lg"><p className="text-[13px] font-semibold text-pink-400 leading-relaxed">{str(da.contrarian_take)}</p></div></div>}

          {da.blind_spots && <div className="mb-5"><SecHead color="#888">⚠️ Angles morts</SecHead><p className="text-xs text-gray-500 leading-relaxed">{str(da.blind_spots)}</p></div>}

          {da.one_key_takeaway && <div className="mb-5"><SecHead color="#38bdf8">💎 Takeaway</SecHead><div className="px-4 py-3.5 bg-gradient-to-r from-sky-400/[0.08] to-accent/[0.05] border-l-[3px] border-sky-400 rounded-r-xl"><p className="text-sm font-bold text-sky-400 leading-relaxed">{str(da.one_key_takeaway)}</p></div></div>}

          <div className="mb-5"><SecHead color="#888">Scores</SecHead><div className="flex gap-4">{[{l:"Nouveauté",s:num(da.novelty_score),c:"#00d4aa"},{l:"Actionnabilité",s:num(da.actionability_score),c:"#fbbf24"},{l:"Potentiel",s:num(da.content_potential_score),c:"#c084fc"}].map((x,i)=><div key={i} className="flex-1"><div className="flex justify-between mb-1"><span className="text-[10px] text-gray-500">{x.l}</span><span className="text-[10px] font-extrabold" style={{color:x.c}}>{x.s}/10</span></div><div className="h-1 bg-white/5 rounded-sm"><div className="h-1 rounded-sm transition-all duration-500" style={{width:`${x.s*10}%`,background:x.c}}/></div></div>)}</div></div>

          {arr(da.tags).length>0 && <div className="mb-5 flex flex-wrap gap-1">{arr(da.tags).map((t,i)=><span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/[0.06] text-gray-500">#{str(t)}</span>)}</div>}

          <div className="border-t border-white/[0.06] pt-4">
            <SecHead color="#888">Générer du contenu</SecHead>

            <div className="mb-4">
              <p className="text-xs font-bold text-gray-400 mb-2">𝕏 Twitter</p>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={()=>genCont(da,"x","polemique")} className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-[11px] text-gray-400 border-none cursor-pointer hover:bg-white/[0.1] hover:text-gray-200 transition-all">🎯 Polémique</button>
                <button onClick={()=>genCont(da,"x","data")} className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-[11px] text-gray-400 border-none cursor-pointer hover:bg-white/[0.1] hover:text-gray-200 transition-all">📊 Data/Chiffres</button>
                <button onClick={()=>genCont(da,"x","story")} className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-[11px] text-gray-400 border-none cursor-pointer hover:bg-white/[0.1] hover:text-gray-200 transition-all">📖 Story</button>
                <button onClick={()=>genCont(da,"x","actionnable")} className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-[11px] text-gray-400 border-none cursor-pointer hover:bg-white/[0.1] hover:text-gray-200 transition-all">⚡ Actionnable</button>
                <button onClick={()=>genCont(da,"x","contrarian")} className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-[11px] text-gray-400 border-none cursor-pointer hover:bg-white/[0.1] hover:text-gray-200 transition-all">🔄 Contrarian</button>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-bold text-gray-400 mb-2">💼 LinkedIn</p>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={()=>genCont(da,"linkedin","storytelling")} className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-[11px] text-gray-400 border-none cursor-pointer hover:bg-white/[0.1] hover:text-gray-200 transition-all">📖 Storytelling</button>
                <button onClick={()=>genCont(da,"linkedin","framework")} className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-[11px] text-gray-400 border-none cursor-pointer hover:bg-white/[0.1] hover:text-gray-200 transition-all">📊 Framework</button>
                <button onClick={()=>genCont(da,"linkedin","contrarian")} className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-[11px] text-gray-400 border-none cursor-pointer hover:bg-white/[0.1] hover:text-gray-200 transition-all">🔄 Contrarian</button>
                <button onClick={()=>genCont(da,"linkedin","etude_cas")} className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-[11px] text-gray-400 border-none cursor-pointer hover:bg-white/[0.1] hover:text-gray-200 transition-all">🔍 Étude de cas</button>
                <button onClick={()=>genCont(da,"linkedin","lecon")} className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-[11px] text-gray-400 border-none cursor-pointer hover:bg-white/[0.1] hover:text-gray-200 transition-all">🧠 Leçon perso</button>
              </div>
            </div>

            <div className="mb-2">
              <p className="text-xs font-bold text-gray-400 mb-2">📧 Newsletter</p>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={()=>genCont(da,"newsletter","deep_dive")} className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-[11px] text-gray-400 border-none cursor-pointer hover:bg-white/[0.1] hover:text-gray-200 transition-all">🔍 Deep Dive</button>
                <button onClick={()=>genCont(da,"newsletter","contrarian")} className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-[11px] text-gray-400 border-none cursor-pointer hover:bg-white/[0.1] hover:text-gray-200 transition-all">🔄 Contrarian</button>
                <button onClick={()=>genCont(da,"newsletter","actionnable")} className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-[11px] text-gray-400 border-none cursor-pointer hover:bg-white/[0.1] hover:text-gray-200 transition-all">⚡ Actionnable</button>
                <button onClick={()=>genCont(da,"newsletter","tendance")} className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-[11px] text-gray-400 border-none cursor-pointer hover:bg-white/[0.1] hover:text-gray-200 transition-all">📈 Tendance</button>
                <button onClick={()=>genCont(da,"newsletter","story")} className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-[11px] text-gray-400 border-none cursor-pointer hover:bg-white/[0.1] hover:text-gray-200 transition-all">📖 Story</button>
              </div>
            </div>
          </div>
        </Card>
        <ContentModal/>
      </div>
    );
  };

  // ═══ KNOWLEDGE ═══
  const VKnow = () => (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Base de connaissances</h1>
      <p className="text-gray-500 text-sm mb-5">{articles.length} article{articles.length!==1?"s":""} — {filtered.length} affiché{filtered.length!==1?"s":""}</p>
      <div className="mb-4 relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"><IC.search s={16}/></div>
        <input value={kwSearch} onChange={e=>setKwSearch(e.target.value)} placeholder="Recherche par mots-clés..." className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-200 text-sm outline-none font-sans"/>
        {kwSearch && <button onClick={()=>setKwSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 border-none bg-transparent cursor-pointer"><IC.x s={14}/></button>}
      </div>
      <div className="flex gap-1.5 flex-wrap mb-4">
        {["Tous",...CATS].map(c=><button key={c} onClick={()=>setFilterCat(c)} className="px-3 py-1 rounded-lg border-none cursor-pointer text-[11px] font-bold transition-all" style={{background:filterCat===c?`${CC[c]||"#00d4aa"}22`:"rgba(255,255,255,0.04)",color:filterCat===c?(CC[c]||"#00d4aa"):"#777"}}>{c}</button>)}
      </div>
      {filtered.length>0?filtered.map(a=>(
        <CardH key={a.id} onClick={()=>{setSelArticle(a);setView("brief");}}>
          <div className="flex justify-between">
            <div className="flex-1">
              <Badge cat={a.category}/>
              <h4 className="text-sm font-bold mt-1 mb-1">{str(a.title)}</h4>
              <p className="text-xs text-gray-500 leading-relaxed mb-2">{str(a.summary_one_line)}</p>
              <div className="flex flex-wrap gap-1">{arr(a.tags).slice(0,4).map((t,i)=><span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/[0.06] text-gray-500">#{str(t)}</span>)}</div>
            </div>
            <div className="text-right ml-4">
              <span className="text-[10px] text-gray-600">{a.created_at ? new Date(a.created_at).toLocaleDateString("fr-FR") : ""}</span>
              <div className="mt-2"><span className="text-lg font-extrabold text-accent">{Math.round((num(a.novelty_score)+num(a.actionability_score)+num(a.content_potential_score))/3*10)/10}</span><span className="text-[10px] text-gray-600">/10</span></div>
            </div>
          </div>
        </CardH>
      )):<div className="text-center py-10 text-gray-600">{kwSearch?"Aucun résultat":"Aucun article"}</div>}

      <Card className="mt-6">
        <SecHead color="#00d4aa">🔍 Recherche IA profonde</SecHead>
        <div className="flex gap-2">
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&smartSearch()} placeholder="Pose une question à ta base..." className="flex-1 px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-200 text-sm outline-none font-sans"/>
          <Btn onClick={smartSearch} disabled={searchLoad}>{searchLoad?<IC.load s={14}/>:<IC.search s={14}/>}</Btn>
        </div>
        {searchRes && <div className="mt-4 bg-accent/5 rounded-xl p-4"><p className="text-[13px] leading-7 text-gray-300 whitespace-pre-wrap">{str(searchRes.answer)}</p></div>}
      </Card>
    </div>
  );

  // ═══ CONTENT LAB ═══
  const VContent = () => (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Content Lab</h1>
      <p className="text-gray-500 text-sm mb-5">Génère du contenu à partir de tes insights</p>
      {articles.filter(a=>!a.exploited).length>0 && <Card className="!border-yellow-400/20 mb-4"><h4 className="text-[13px] font-bold text-yellow-400 mb-2">⚡ {articles.filter(a=>!a.exploited).length} insight{articles.filter(a=>!a.exploited).length>1?"s":""} non exploité{articles.filter(a=>!a.exploited).length>1?"s":""}</h4>{articles.filter(a=>!a.exploited).slice(0,5).map(a=><div key={a.id} className="flex justify-between items-center py-2 border-b border-white/[0.03]"><div className="flex-1"><Badge cat={a.category}/><span className="text-xs font-semibold ml-2">{str(a.title)}</span></div><div className="flex gap-1.5">{["x","linkedin","newsletter"].map(p=><button key={p} onClick={()=>{setSelArticle(a);genCont(a,p);}} className="px-2 py-1 rounded-md bg-white/5 text-[10px] text-gray-400 hover:bg-white/10 border-none cursor-pointer">{p==="x"?"𝕏":p==="linkedin"?"💼":"📧"}</button>)}</div></div>)}</Card>}
      {articles.filter(a=>a.exploited).map(a=><Card key={a.id}><Badge cat={a.category}/><span className="text-[13px] font-bold ml-2">{str(a.title)}</span><div className="flex gap-1.5 mt-3">{["x","linkedin","newsletter"].map(p=><button key={p} onClick={()=>{setSelArticle(a);genCont(a,p);}} className="flex-1 py-2 rounded-lg bg-white/5 text-[11px] text-gray-500 border-none cursor-pointer hover:bg-white/10">Générer {p==="x"?"𝕏":p==="linkedin"?"💼":"📧"}</button>)}</div></Card>)}
      <ContentModal/>
    </div>
  );

  // ═══ YOUTUBE ═══
  const VYouTube = () => {
    const toggle = id => setYtSel(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
    return (
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight mb-1">🎬 YouTube Scripts</h1>
        <p className="text-gray-500 text-sm mb-5">Scripts prêts à lire devant la caméra</p>
        <div className="flex gap-2 mb-5">
          <button onClick={()=>setYtSaved(false)} className={`px-3.5 py-1.5 rounded-lg border-none cursor-pointer text-xs font-bold ${!ytSaved?"bg-accent text-bg":"bg-white/5 text-gray-500"}`}>✍️ Créer</button>
          <button onClick={()=>setYtSaved(true)} className={`px-3.5 py-1.5 rounded-lg border-none cursor-pointer text-xs font-bold ${ytSaved?"bg-accent text-bg":"bg-white/5 text-gray-500"}`}>📚 Sauvegardés ({scripts.length})</button>
        </div>
        {!ytSaved ? (
          <div>
            <Card><SecHead color="#f87171">Sujet (optionnel)</SecHead><input value={ytTopic} onChange={e=>setYtTopic(e.target.value)} placeholder="Ex: Comment l'IA change le business en 2026" className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-200 text-sm outline-none font-sans"/></Card>
            <Card><SecHead color="#38bdf8">Articles sources ({ytSel.length})</SecHead><div className="max-h-[250px] overflow-y-auto">{articles.map(a=>{const sel=ytSel.includes(a.id);return <div key={a.id} onClick={()=>toggle(a.id)} className={`flex items-center gap-2.5 px-2.5 py-2 mb-1 rounded-lg cursor-pointer transition-all ${sel?"bg-accent/[0.08] border border-accent/30":"bg-white/[0.02] border border-white/[0.04]"}`}><div className={`w-4 h-4 rounded flex items-center justify-center border-2 flex-shrink-0 ${sel?"border-accent bg-accent":"border-gray-600"}`}>{sel&&<span className="text-bg text-[10px] font-extrabold">✓</span>}</div><span className={`text-xs font-semibold truncate ${sel?"text-gray-200":"text-gray-400"}`}>{str(a.title)}</span></div>})}</div></Card>
            <div className="flex justify-center my-5"><Btn onClick={genYouTube} disabled={ytLoad||(ytSel.length===0&&!ytTopic.trim())} className={ytLoad||(ytSel.length===0&&!ytTopic.trim())?"opacity-50":""}>{ytLoad?<><IC.load s={16}/> Écriture...</>:<><IC.play s={16}/> Générer</>}</Btn></div>
            {ytScript && <Card className="!border-red-400/20"><h3 className="text-base font-extrabold text-red-400 mb-3">🎬 Script</h3><div className="bg-white/[0.02] rounded-xl p-5 whitespace-pre-wrap text-[13px] leading-[1.8] text-gray-400 max-h-[500px] overflow-y-auto">{str(ytScript)}</div><Btn onClick={()=>copyTxt(ytScript)} className="mt-3"><IC.copy s={14}/> Copier</Btn></Card>}
          </div>
        ) : (
          <div>{scripts.length>0?scripts.map(s=><Card key={s.id}><h4 className="text-sm font-bold">{str(s.topic)}</h4><span className="text-[10px] text-gray-600">{s.created_at?new Date(s.created_at).toLocaleDateString("fr-FR"):""}</span><div className="flex gap-1.5 mt-2"><Btn onClick={()=>copyTxt(str(s.raw_text||s.script||""))} className="!text-[11px]"><IC.copy s={12}/>Copier</Btn><Btn variant="ghost" onClick={()=>setYtSelScript(ytSelScript===s.id?null:s.id)} className="!text-[11px]">{ytSelScript===s.id?"Fermer":"Voir"}</Btn></div>{ytSelScript===s.id&&<div className="bg-white/[0.02] rounded-xl p-4 whitespace-pre-wrap text-[13px] leading-[1.8] text-gray-400 max-h-[500px] overflow-y-auto mt-2">{str(s.raw_text||s.script||"")}</div>}</Card>):<div className="text-center py-12 text-gray-600">Aucun script</div>}</div>
        )}
      </div>
    );
  };

  // ═══ CONNEXIONS ═══
  const VConn = () => {
    const cg = {};
    articles.forEach(a => { const c = str(a.category)||"Autre"; if(!cg[c]) cg[c]=[]; cg[c].push(a); });
    return (
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight mb-1">Connexions</h1>
        <p className="text-gray-500 text-sm mb-5">Clusters de connaissances</p>
        {Object.keys(cg).length>0?Object.entries(cg).map(([cat,arts])=><div key={cat} className="mb-5"><div className="flex items-center gap-2 mb-3"><div className="w-2.5 h-2.5 rounded-full" style={{background:CC[cat]||"#888"}}/><h3 className="text-[15px] font-extrabold" style={{color:CC[cat]||"#888"}}>{cat}</h3><span className="text-[11px] text-gray-600">({arts.length})</span></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">{arts.map(a=><CardH key={a.id} className="!p-3.5" onClick={()=>{setSelArticle(a);setView("brief");}}><h4 className="text-xs font-bold mb-1">{str(a.title)}</h4><p className="text-[11px] text-gray-500 leading-snug mb-2">{str(a.summary_one_line)}</p></CardH>)}</div></div>):<div className="text-center py-12 text-gray-600">Digère des articles pour voir les clusters</div>}
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
      {toast && <div className="fixed bottom-5 right-5 bg-accent text-bg px-5 py-2.5 rounded-xl font-bold text-[13px] z-[100]">{str(toast)}</div>}
    </div>
  );
}
