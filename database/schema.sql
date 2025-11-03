-- schema.sql
-- Fresh schema for ITパスポート学習支援アプリ Ver.4 with independent pages and page linking

-- ユーザーテーブル（Supabase Authと連携） を accountsテーブルにリネーム
CREATE TABLE accounts (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  user_slug TEXT UNIQUE,
  avatar_url TEXT,
  gender VARCHAR(10) CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  birthdate DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- デッキテーブル
CREATE TABLE decks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES accounts(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_public BOOLEAN DEFAULT FALSE
);

-- カードテーブル
CREATE TABLE public.cards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES decks(id),
  user_id uuid NOT NULL REFERENCES accounts(id),
  front_content jsonb NOT NULL DEFAULT '{"type": "doc", "content": []}'::jsonb,
  back_content jsonb NOT NULL DEFAULT '{"type": "doc", "content": []}'::jsonb,
  source_audio_url text NULL,
  source_ocr_image_url text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  ease_factor double precision NOT NULL DEFAULT 2.5,
  repetition_count integer NOT NULL DEFAULT 0,
  review_interval integer NOT NULL DEFAULT 0,
  next_review_at timestamp with time zone NULL,
  stability double precision NOT NULL DEFAULT 0.0,
  difficulty double precision NOT NULL DEFAULT 1.0,
  last_reviewed_at timestamp with time zone NULL,
  CONSTRAINT cards_pkey PRIMARY KEY (id),
  CONSTRAINT cards_deck_id_fkey FOREIGN KEY (deck_id) REFERENCES decks (id),
  CONSTRAINT cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES accounts (id)
);
CREATE INDEX IF NOT EXISTS idx_cards_front_content_gin ON public.cards USING gin (front_content jsonb_path_ops) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_cards_back_content_gin ON public.cards USING gin (back_content jsonb_path_ops) TABLESPACE pg_default;

-- 問題バリエーションテーブル
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) NOT NULL,
  user_id UUID REFERENCES accounts(id) NOT NULL,
  type VARCHAR(20) NOT NULL,
  question_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ページテーブル
CREATE TABLE pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES accounts(id) NOT NULL,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  content_tiptap JSONB NOT NULL,
  scrapbox_page_id TEXT,
  scrapbox_page_list_synced_at TIMESTAMPTZ,
  scrapbox_page_content_synced_at TIMESTAMPTZ,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint to support ON CONFLICT on (user_id, scrapbox_page_id)
ALTER TABLE pages
  ADD CONSTRAINT pages_user_scrapbox_unique UNIQUE (user_id, scrapbox_page_id);

-- トリガー関数: アプリケーション更新時のみ updated_at を NOW() に更新 (Cosense同期時はスキップ)
CREATE OR REPLACE FUNCTION auto_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- すべてのUPDATE操作でupdated_atを現在時刻に更新
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- pages テーブル用トリガーを追加
CREATE TRIGGER trg_pages_updated_at
BEFORE UPDATE ON pages
FOR EACH ROW
EXECUTE FUNCTION auto_update_timestamp();

-- カードとページのリンク管理テーブル
CREATE TABLE card_page_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) NOT NULL,
  page_id UUID REFERENCES pages(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 学習記録テーブル
CREATE TABLE learning_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES accounts(id) NOT NULL,
  card_id UUID REFERENCES cards(id) NOT NULL,
  question_id UUID REFERENCES questions(id),
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_correct BOOLEAN NOT NULL,
  user_answer TEXT,
  practice_mode VARCHAR(20) NOT NULL,
  review_interval INTEGER,
  next_review_at TIMESTAMP WITH TIME ZONE,
  quality smallint NOT NULL DEFAULT 0,
  response_time integer NOT NULL DEFAULT 0,
  effort_time integer NOT NULL DEFAULT 0,
  attempt_count integer NOT NULL DEFAULT 1
);

-- デッキ共有テーブル
CREATE TABLE deck_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id UUID REFERENCES decks(id) NOT NULL,
  shared_with_user_id UUID REFERENCES accounts(id) NOT NULL,
  permission_level VARCHAR(10) NOT NULL CHECK (permission_level IN ('view','edit')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(deck_id, shared_with_user_id)
);

-- ページ共有テーブル
CREATE TABLE page_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID REFERENCES pages(id) NOT NULL,
  shared_with_user_id UUID REFERENCES accounts(id) NOT NULL,
  permission_level VARCHAR(10) NOT NULL CHECK (permission_level IN ('view','edit')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(page_id, shared_with_user_id)
);

-- 共有リンク管理テーブル
CREATE TABLE share_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('deck','page')),
  resource_id UUID NOT NULL,
  token TEXT UNIQUE NOT NULL,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('owner','editor','viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- 学習目標テーブル
CREATE TABLE study_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES accounts(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deadline TIMESTAMP WITH TIME ZONE,
  progress_rate INTEGER NOT NULL DEFAULT 0 CHECK (progress_rate BETWEEN 0 AND 100),
  status VARCHAR(20) NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 目標とデッキのリンクテーブル
CREATE TABLE goal_deck_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES study_goals(id) NOT NULL,
  deck_id UUID REFERENCES decks(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(goal_id, deck_id)
);

-- study_goals RLS ポリシー設定
ALTER TABLE study_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own study_goals" ON study_goals
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- goal_deck_links RLS ポリシー設定
ALTER TABLE goal_deck_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own goal_deck_links" ON goal_deck_links
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM study_goals WHERE id = goal_deck_links.goal_id AND user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM decks WHERE id = goal_deck_links.deck_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_goals WHERE id = goal_deck_links.goal_id AND user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM decks WHERE id = goal_deck_links.deck_id AND user_id = auth.uid()
    )
  );

-- RLSポリシー設定 (省略、実装時に同様に設定する)

-- ① デッキ学習ログテーブル作成
CREATE TABLE deck_study_logs (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES accounts(id),
  deck_id    UUID        NOT NULL REFERENCES decks(id),
  studied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ② RLS（行レベルセキュリティ）設定
ALTER TABLE deck_study_logs ENABLE ROW LEVEL SECURITY;

-- ユーザー自身のログだけ操作を許可
CREATE POLICY "Users can manage own deck_study_logs"
  ON deck_study_logs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ③ パフォーマンス向上のためのインデックス
CREATE INDEX idx_deck_study_logs_deck    ON deck_study_logs(deck_id);
CREATE INDEX idx_deck_study_logs_user    ON deck_study_logs(user_id);
CREATE INDEX idx_deck_study_logs_studied ON deck_study_logs(studied_at);
-- デッキごとに最新順で取得するケースを想定
CREATE INDEX idx_deck_study_logs_deck_date 
  ON deck_study_logs(deck_id, studied_at DESC);

-- 生入力データ管理テーブル
CREATE TABLE raw_inputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES accounts(id),
  type TEXT NOT NULL CHECK (type IN ('audio','ocr')),
  source_url TEXT NOT NULL,
  text_content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_raw_inputs_user ON raw_inputs(user_id);

-- raw_inputs RLS ポリシー設定
ALTER TABLE raw_inputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own raw_inputs" ON raw_inputs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 音声文字起こしテーブル
CREATE TABLE audio_transcriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES accounts(id),
  deck_id UUID NOT NULL REFERENCES decks(id),
  file_path TEXT NOT NULL,
  signed_url TEXT,
  transcript TEXT NOT NULL,
  title TEXT,  -- AI自動生成タイトル
  duration_sec INTEGER,
  model_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス設定
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_user ON audio_transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_transcriptions_deck ON audio_transcriptions(deck_id);

-- RLSポリシー設定
ALTER TABLE audio_transcriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own audio_transcriptions" ON audio_transcriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- アクションログテーブル (学習時間計測)
CREATE TABLE action_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES accounts(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('audio','ocr','learn','memo')),
  duration INTEGER NOT NULL, -- 秒単位で計測
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_action_logs_user ON action_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_action_type ON action_logs(action_type);

-- action_logs RLS ポリシー設定
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own action_logs" ON action_logs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ### クイズ設定テーブル（ユーザー定義の問題形式設定）
CREATE TABLE quiz_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES accounts(id),
  name TEXT NOT NULL,
  question_types TEXT[] NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 10,
  difficulty VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (difficulty IN ('easy','normal','hard')),
  time_limit_sec INTEGER,
  shuffle_order BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- RLSポリシー設定
ALTER TABLE quiz_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own quiz_settings" ON quiz_settings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- インデックス設定
CREATE INDEX idx_quiz_settings_user ON quiz_settings(user_id);

-- ユーザー設定テーブル (テーマなど個人設定)
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES accounts(id),
  theme VARCHAR(50) NOT NULL DEFAULT 'ocean', -- 'ocean','forest','sunset','night-sky','desert'
  mode VARCHAR(10) NOT NULL DEFAULT 'light' CHECK (mode IN ('light','dark')),
  locale TEXT NOT NULL DEFAULT 'en', -- 言語設定
  timezone TEXT NOT NULL DEFAULT 'UTC', -- タイムゾーン設定
  notifications JSONB NOT NULL DEFAULT '{}'::jsonb, -- 通知設定(JSON形式)
  items_per_page INTEGER NOT NULL DEFAULT 20, -- ページあたりの表示件数
  play_help_video_audio BOOLEAN NOT NULL DEFAULT FALSE, -- ヘルプ動画の音声を再生するかどうか
  cosense_sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  notion_sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  gyazo_sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  quizlet_sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_user_settings_user ON user_settings(user_id);

-- RLSポリシー設定: ユーザーが自身の設定のみ操作可能にする
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own user_settings" ON user_settings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- accounts テーブルに対する RLS 設定とポリシー追加
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select accounts"
  ON accounts FOR SELECT USING (public.is_admin_user());

-- decks テーブルに対する RLS 設定とポリシー追加
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select decks"
  ON decks FOR SELECT USING (public.is_admin_user());

-- cards テーブルに対する RLS 設定とポリシー追加
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select cards"
  ON public.cards FOR SELECT USING (public.is_admin_user());

-- questions テーブルに対する RLS 設定とポリシー追加
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select questions"
  ON questions FOR SELECT USING (public.is_admin_user());

-- Cosense (Scrapbox) 同期用テーブル
CREATE TABLE cosense_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_cosense_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  cosense_project_id UUID NOT NULL REFERENCES cosense_projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cosense_project_id),
  -- Scrapbox プロジェクトのページ数
  page_count INTEGER NOT NULL DEFAULT 0,
  -- 認証不要・アクセス可能か
  accessible BOOLEAN NOT NULL DEFAULT TRUE,
  -- 手動入力されたScrapboxセッションクッキー
  scrapbox_session_cookie TEXT,
);

-- インデックス: user と scrapbox_page_id の組み合わせで高速 upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_user_scrapbox
  ON public.pages(user_id, scrapbox_page_id)
  WHERE scrapbox_page_id IS NOT NULL;

-- RPC 関数: 配列で渡された scrapbox_page_id と user_id で pages テーブルの updated_at を取得
CREATE OR REPLACE FUNCTION get_pages_by_ids(
  ids TEXT[],
  uid UUID
)
RETURNS TABLE(
  scrapbox_page_id TEXT,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.scrapbox_page_id, p.updated_at
    FROM pages p
   WHERE p.user_id = uid
     AND p.scrapbox_page_id = ANY(ids);
END;
$$ LANGUAGE plpgsql STABLE;

-- Gyazo integration tables
CREATE TABLE gyazo_albums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_gyazo_albums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  gyazo_album_id UUID NOT NULL REFERENCES gyazo_albums(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, gyazo_album_id)
);

-- Quizlet integration tables
CREATE TABLE quizlet_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_quizlet_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  quizlet_set_id UUID NOT NULL REFERENCES quizlet_sets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, quizlet_set_id)
);

-- RPC wrapper functions for pgcrypto
CREATE OR REPLACE FUNCTION encrypt_user_llm_api_key(
  data TEXT,
  key TEXT
)
RETURNS TEXT LANGUAGE SQL STABLE AS $$
  SELECT ENCODE(pgp_sym_encrypt(data, key), 'base64');
$$;

CREATE OR REPLACE FUNCTION decrypt_user_llm_api_key(
  encrypted_base64 TEXT,
  key TEXT
)
RETURNS TEXT LANGUAGE SQL STABLE AS $$
  SELECT CONVERT_FROM(
    -- ensure decryption result is bytea
    pgp_sym_decrypt(
      DECODE(encrypted_base64, 'base64')::bytea,
      key
    )::bytea,
    'UTF8'
  );
$$;

-- 検索候補取得関数
CREATE FUNCTION public.search_suggestions(p_query text)
  RETURNS TABLE (
    type       text,
    id         uuid,
    suggestion text,
    excerpt    text
  )
  LANGUAGE sql
  STABLE AS $$
WITH card_cte AS (
  SELECT
    'card'::text AS type,
    c.id,
    -- 元の抜粋（先頭100文字）をタイトル代わりに
    LEFT(
      (
        SELECT string_agg(node->>'text', ' ')
        FROM jsonb_array_elements(c.front_content::jsonb->'content') AS para,
             jsonb_array_elements(para->'content')            AS node
        WHERE node->>'text' IS NOT NULL
      ),
      100
    ) AS suggestion,
    -- ハイライト付き抜粋
    ts_headline(
      'simple',
      (
        SELECT string_agg(node->>'text', ' ')
        FROM jsonb_array_elements(c.front_content::jsonb->'content') AS para,
             jsonb_array_elements(para->'content')            AS node
        WHERE node->>'text' IS NOT NULL
      ),
      plainto_tsquery('simple', p_query),
      'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, FragmentDelimiter=" ... "'
    ) AS excerpt
  FROM public.cards c
  WHERE (c.front_content::text ILIKE '%'||p_query||'%'
         OR c.back_content::text ILIKE '%'||p_query||'%')
  GROUP BY c.id
  LIMIT 5
),
page_cte AS (
  SELECT
    'page'::text AS type,
    p.id,
    p.title AS suggestion,
    ts_headline(
      'simple',
      p.content_tiptap::text,
      plainto_tsquery('simple', p_query),
      'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, FragmentDelimiter=" ... "'
    ) AS excerpt
  FROM public.pages p
  WHERE (p.title ILIKE '%'||p_query||'%'
         OR p.content_tiptap::text ILIKE '%'||p_query||'%')
  LIMIT 5
)
SELECT * FROM card_cte
UNION ALL
SELECT * FROM page_cte;
$$;