-- ═══════════════════════════════════════════════════════════
-- INSIGHTBASE — SCHÉMA DE BASE DE DONNÉES
-- ═══════════════════════════════════════════════════════════
-- Exécute ce script dans : Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- Table principale : articles digérés
CREATE TABLE articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contenu source
  raw_input TEXT,
  input_type TEXT DEFAULT 'url' CHECK (input_type IN ('url', 'texte', 'pdf')),
  
  -- Digestion IA
  title TEXT NOT NULL,
  source TEXT,
  summary_one_line TEXT,
  summary_paragraph TEXT,
  summary_full TEXT,
  actionable_insights JSONB DEFAULT '[]',
  mental_models JSONB DEFAULT '[]',
  contrarian_take TEXT,
  key_concepts JSONB DEFAULT '[]',
  content_angles JSONB DEFAULT '[]',
  one_key_takeaway TEXT,
  
  -- Classification
  category TEXT NOT NULL,
  tags JSONB DEFAULT '[]',
  custom_tags JSONB DEFAULT '[]',
  
  -- Scores
  novelty_score INTEGER DEFAULT 5 CHECK (novelty_score BETWEEN 1 AND 10),
  actionability_score INTEGER DEFAULT 5 CHECK (actionability_score BETWEEN 1 AND 10),
  content_potential_score INTEGER DEFAULT 5 CHECK (content_potential_score BETWEEN 1 AND 10),
  
  -- Contenu généré
  content_x TEXT,
  content_linkedin TEXT,
  content_newsletter TEXT,
  exploited BOOLEAN DEFAULT FALSE
);

-- Table : scripts YouTube
CREATE TABLE youtube_scripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  topic TEXT,
  script TEXT NOT NULL,
  article_ids JSONB DEFAULT '[]'
);

-- Index pour la recherche rapide
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_created ON articles(created_at DESC);
CREATE INDEX idx_articles_exploited ON articles(exploited);
CREATE INDEX idx_articles_tags ON articles USING GIN(tags);

-- Index pour recherche full-text
ALTER TABLE articles ADD COLUMN fts tsvector 
  GENERATED ALWAYS AS (
    to_tsvector('french', coalesce(title, '') || ' ' || coalesce(summary_full, '') || ' ' || coalesce(one_key_takeaway, '') || ' ' || coalesce(contrarian_take, ''))
  ) STORED;
CREATE INDEX idx_articles_fts ON articles USING GIN(fts);

-- Fonction de mise à jour automatique du updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (optionnel mais recommandé)
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_scripts ENABLE ROW LEVEL SECURITY;

-- Politique : tout autoriser via service_role (API routes côté serveur)
CREATE POLICY "Allow all via service role" ON articles FOR ALL USING (true);
CREATE POLICY "Allow all via service role" ON youtube_scripts FOR ALL USING (true);

-- ═══════════════════════════════════════════════════════════
-- FAIT ! Ta base est prête.
-- ═══════════════════════════════════════════════════════════
