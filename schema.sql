-- schema.sql
-- Fresh schema for ITパスポート学習支援アプリ Ver.4 with independent pages and page linking

-- ユーザーテーブル（Supabase Authと連携） を accountsテーブルにリネーム
DROP TABLE IF EXISTS users;
CREATE TABLE accounts (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
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
  content_tiptap JSONB NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
  next_review_at TIMESTAMP WITH TIME ZONE
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