-- =============================================================================
-- BLACK FIGHTERS V5 «الأطلس» + V4 REBIRTH — PRODUCTION POSTGRES + PGVECTOR SCHEMA
-- Implements V4 Sections 10.2 & 22.5 + V5 Parts 2, 3, 5:
-- 1. Hierarchical Big-Document Pipeline (up to 500 pages)
-- 2. Hybrid Search (pgvector HNSW + PostgreSQL Full-Text GIN)
-- 3. Adaptive Learner Model (FSRS v4.5 + BKT + Leech Detection)
-- 4. Double-Entry Credit Ledger (reserve / commit / release + v_ledger_drift)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ─── 1. Lectures (Source Uploads up to 500 Pages) ────────────────────────────
CREATE TABLE IF NOT EXISTS lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  course_id TEXT,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'pptx', 'docx', 'youtube', 'audio', 'image', 'text')),
  page_count INT NOT NULL DEFAULT 1 CHECK (page_count >= 1 AND page_count <= 500),
  file_hash_sha256 TEXT NOT NULL,
  storage_path TEXT,
  language_mode TEXT NOT NULL DEFAULT 'foundational_bilingual',
  depth_mode TEXT NOT NULL DEFAULT 'deep' CHECK (depth_mode IN ('deep', 'balanced', 'fast')),
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('uploading', 'processing', 'ready', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lectures_user_created ON lectures(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lectures_hash_mode ON lectures(file_hash_sha256, language_mode, depth_mode);

-- ─── 2. Summary Documents (Atlas V5 Plates + Verifier Report) ────────────────
CREATE TABLE IF NOT EXISTS summary_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  template_id TEXT NOT NULL DEFAULT 'foundational_bilingual',
  depth_mode TEXT NOT NULL DEFAULT 'deep',
  coverage_ratio NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  faithfulness_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  glossary_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  sections_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  verifier_report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_summary_documents_lecture ON summary_documents(lecture_id);

-- ─── 3. Chunks (Page-Linked RAG + Hybrid Search pgvector HNSW + FTS) ─────────
CREATE TABLE IF NOT EXISTS chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  section_index INT NOT NULL DEFAULT 0,
  page_from INT NOT NULL,
  page_to INT NOT NULL,
  heading TEXT,
  content TEXT NOT NULL,
  normalized_content TEXT NOT NULL,
  embedding vector(1536),
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(heading, '') || ' ' || content)) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chunks_lecture_pages ON chunks(lecture_id, page_from, page_to);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw ON chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS idx_chunks_tsv_gin ON chunks USING gin (tsv);

-- ─── 4. Concepts & Adaptive Learner Model (FSRS v4.5 + BKT + Leech) ──────────
CREATE TABLE IF NOT EXISTS concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  term_en TEXT NOT NULL,
  term_ar TEXT NOT NULL,
  prerequisite_ar TEXT,
  source_page INT,
  weight NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS concept_mastery (
  user_id TEXT NOT NULL,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  p_know NUMERIC(5,4) NOT NULL DEFAULT 0.2500 CHECK (p_know >= 0 AND p_know <= 1),
  stability NUMERIC(8,3) NOT NULL DEFAULT 1.000,
  difficulty NUMERIC(5,3) NOT NULL DEFAULT 5.000 CHECK (difficulty >= 1 AND difficulty <= 10),
  retrievability NUMERIC(5,4) NOT NULL DEFAULT 1.0000,
  reps INT NOT NULL DEFAULT 0,
  lapses INT NOT NULL DEFAULT 0,
  is_leech BOOLEAN GENERATED ALWAYS AS (lapses >= 4) STORED,
  last_reviewed_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, concept_id)
);

CREATE INDEX IF NOT EXISTS idx_concept_mastery_user_due ON concept_mastery(user_id, due_at ASC);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_leech ON concept_mastery(user_id, is_leech) WHERE is_leech = TRUE;

-- ─── 5. FSRS v4.5 Flashcards & Declassify Items ──────────────────────────────
CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  lecture_id UUID REFERENCES lectures(id) ON DELETE SET NULL,
  concept_id UUID REFERENCES concepts(id) ON DELETE SET NULL,
  card_type TEXT NOT NULL DEFAULT 'declassify' CHECK (card_type IN ('declassify', 'basic', 'cloze', 'image_occlusion', 'clinical_vignette')),
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  source_page INT,
  stability NUMERIC(8,3) NOT NULL DEFAULT 1.000,
  difficulty NUMERIC(5,3) NOT NULL DEFAULT 5.000,
  reps INT NOT NULL DEFAULT 0,
  lapses INT NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new', 'learning', 'review', 'relearning')),
  due_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cards_user_due ON cards(user_id, due_at ASC);

-- ─── 6. Async Job Pipeline State Machine ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('summary_v5', 'quiz_generation', 'pdf_export', 'audio_transcribe')),
  state TEXT NOT NULL DEFAULT 'queued' CHECK (
    state IN ('queued', 'extracting', 'outlining', 'summarizing', 'verifying', 'building_quiz', 'completed', 'failed', 'cancelled')
  ),
  progress_pct INT NOT NULL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  idempotency_key TEXT UNIQUE,
  reserved_credits INT NOT NULL DEFAULT 0,
  error_code TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 7. Double-Entry Credit Ledger (V4 Section 22.5) ─────────────────────────
CREATE TABLE IF NOT EXISTS credit_accounts (
  user_id TEXT PRIMARY KEY,
  available INT NOT NULL DEFAULT 0 CHECK (available >= 0),
  reserved  INT NOT NULL DEFAULT 0 CHECK (reserved  >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES credit_accounts(user_id),
  job_id UUID,
  idempotency_key TEXT UNIQUE NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('grant', 'reserve', 'commit', 'release', 'refund', 'purchase')),
  delta_available INT NOT NULL,
  delta_reserved  INT NOT NULL,
  balance_after_available INT NOT NULL,
  balance_after_reserved  INT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_created ON credit_ledger(user_id, created_at DESC);

-- Atomic Reserve Function
CREATE OR REPLACE FUNCTION reserve_credits(
  p_user TEXT, p_job UUID, p_amount INT, p_idem TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE v_avail INT; v_res INT;
BEGIN
  IF EXISTS (SELECT 1 FROM credit_ledger WHERE idempotency_key = p_idem) THEN
    RETURN TRUE;
  END IF;
  SELECT available, reserved INTO v_avail, v_res
    FROM credit_accounts WHERE user_id = p_user FOR UPDATE;
  IF v_avail IS NULL OR v_avail < p_amount THEN
    RETURN FALSE;
  END IF;
  UPDATE credit_accounts
     SET available = available - p_amount,
         reserved  = reserved  + p_amount,
         updated_at = now()
   WHERE user_id = p_user
   RETURNING available, reserved INTO v_avail, v_res;
  INSERT INTO credit_ledger(user_id, job_id, idempotency_key, entry_type,
    delta_available, delta_reserved, balance_after_available, balance_after_reserved, reason)
  VALUES (p_user, p_job, p_idem, 'reserve', -p_amount, +p_amount, v_avail, v_res, 'job_start');
  RETURN TRUE;
END $$;

-- Atomic Release Function (Full Refund on Upstream Failure)
CREATE OR REPLACE FUNCTION release_credits(
  p_user TEXT, p_job UUID, p_amount INT, p_idem TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE v_avail INT; v_res INT;
BEGIN
  IF EXISTS (SELECT 1 FROM credit_ledger WHERE idempotency_key = p_idem) THEN
    RETURN TRUE;
  END IF;
  SELECT available, reserved INTO v_avail, v_res
    FROM credit_accounts WHERE user_id = p_user FOR UPDATE;
  IF v_res IS NULL OR v_res < p_amount THEN
    RETURN FALSE;
  END IF;
  UPDATE credit_accounts
     SET available = available + p_amount,
         reserved  = reserved  - p_amount,
         updated_at = now()
   WHERE user_id = p_user
   RETURNING available, reserved INTO v_avail, v_res;
  INSERT INTO credit_ledger(user_id, job_id, idempotency_key, entry_type,
    delta_available, delta_reserved, balance_after_available, balance_after_reserved, reason)
  VALUES (p_user, p_job, p_idem, 'release', +p_amount, -p_amount, v_avail, v_res, 'job_failed_refund');
  RETURN TRUE;
END $$;

-- Atomic Commit Function (Finalize Reserved Credits on Verified Completion)
CREATE OR REPLACE FUNCTION commit_credits(
  p_user TEXT, p_job UUID, p_amount INT, p_idem TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE v_avail INT; v_res INT;
BEGIN
  IF EXISTS (SELECT 1 FROM credit_ledger WHERE idempotency_key = p_idem) THEN
    RETURN TRUE;
  END IF;
  SELECT available, reserved INTO v_avail, v_res
    FROM credit_accounts WHERE user_id = p_user FOR UPDATE;
  IF v_res IS NULL OR v_res < p_amount THEN
    RETURN FALSE;
  END IF;
  UPDATE credit_accounts
     SET reserved  = reserved - p_amount,
         updated_at = now()
   WHERE user_id = p_user
   RETURNING available, reserved INTO v_avail, v_res;
  INSERT INTO credit_ledger(user_id, job_id, idempotency_key, entry_type,
    delta_available, delta_reserved, balance_after_available, balance_after_reserved, reason)
  VALUES (p_user, p_job, p_idem, 'commit', 0, -p_amount, v_avail, v_res, 'job_completed');
  RETURN TRUE;
END $$;

-- Nightly Drift Audit View (Must Always Return 0 Rows)
CREATE OR REPLACE VIEW v_ledger_drift AS
SELECT a.user_id,
       a.available,
       COALESCE(SUM(l.delta_available), 0) AS ledger_available,
       a.reserved,
       COALESCE(SUM(l.delta_reserved), 0)  AS ledger_reserved
  FROM credit_accounts a
  LEFT JOIN credit_ledger l USING (user_id)
 GROUP BY a.user_id, a.available, a.reserved
HAVING a.available <> COALESCE(SUM(l.delta_available), 0)
    OR a.reserved  <> COALESCE(SUM(l.delta_reserved), 0);
