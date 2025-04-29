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
CREATE TABLE cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id UUID REFERENCES decks(id) NOT NULL,
  user_id UUID REFERENCES accounts(id) NOT NULL,
  front_content TEXT NOT NULL,
  back_content TEXT NOT NULL,
  source_audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- RLSポリシー設定 (省略、実装時に同様に設定する)
