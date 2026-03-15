# ⚡ InsightBase — Bibliothèque d'Intelligence Business

Dashboard personnel qui digère tes articles, extrait les insights actionnables, génère du contenu pour X/LinkedIn/Newsletter, crée des scripts YouTube, et stocke tout dans une knowledge base intelligente.

---

## 🚀 GUIDE DE DÉPLOIEMENT (30 minutes)

### ÉTAPE 1 — Créer les comptes (10 min)

#### Supabase (base de données — gratuit)
1. Va sur https://supabase.com → Sign Up
2. Clique New Project → Nom : insightbase → Région : West EU (Paris)
3. Attends 2 min que le projet se crée
4. Va dans Settings → API et copie :
   - Project URL → NEXT_PUBLIC_SUPABASE_URL
   - anon public key → NEXT_PUBLIC_SUPABASE_ANON_KEY
   - service_role key → SUPABASE_SERVICE_ROLE_KEY

#### Anthropic API (IA — 5€ pour commencer)
1. Va sur https://console.anthropic.com → Sign Up
2. API Keys → Create Key → Nom : insightbase
3. Copie ta clé → ANTHROPIC_API_KEY
4. Settings → Billing → Ajoute 5€

#### Vercel (hébergement — gratuit)
1. Va sur https://vercel.com → Sign Up avec GitHub

---

### ÉTAPE 2 — Créer la base de données (3 min)

1. Dans Supabase → SQL Editor → New Query
2. Copie-colle tout le contenu de lib/schema.sql
3. Clique Run
4. Vérifie dans Table Editor : tu dois voir articles et youtube_scripts

---

### ÉTAPE 3 — Préparer le code (5 min)

```bash
# Clone ton repo GitHub
git clone https://github.com/TON_USERNAME/insightbase.git
cd insightbase

# Copie tous les fichiers du projet dans ce dossier

# Crée le fichier d'environnement
cp .env.local.example .env.local
# Édite .env.local avec tes vraies clés

# Installe et teste
npm install
npm run dev
# → http://localhost:3000
```

---

### ÉTAPE 4 — Déployer sur Vercel (5 min)

```bash
git add .
git commit -m "InsightBase v1"
git push origin main
```

Sur vercel.com :
1. Add New → Project → Sélectionne insightbase
2. Ajoute les Environment Variables (les 4 clés)
3. Deploy → Live en 2 min

---

## 📁 STRUCTURE

```
insightbase/
├── app/
│   ├── api/
│   │   ├── digest/route.js
│   │   ├── generate/route.js
│   │   ├── search/route.js
│   │   └── youtube/route.js
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── lib/
│   ├── prompts.js
│   ├── schema.sql
│   ├── supabase-browser.js
│   └── supabase-server.js
├── .env.local.example
├── .gitignore
├── jsconfig.json
├── next.config.js
├── package.json
├── postcss.config.js
└── tailwind.config.js
```

---

## 💡 COÛTS MENSUELS

- Supabase Free : 0€
- Vercel Hobby : 0€
- Anthropic API : ~5-15€/mois selon usage
- Total : 5-15€/mois
