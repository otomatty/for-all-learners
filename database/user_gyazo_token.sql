-- database/user_gyazo_tokens.sql

-- 1. トークン保存用テーブル作成
CREATE TABLE user_gyazo_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. RLS 有効化＆ポリシー設定
ALTER TABLE user_gyazo_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own gyazo tokens"
  ON user_gyazo_tokens
  FOR ALL
  USING ( user_id = auth.uid() )
  WITH CHECK ( user_id = auth.uid() );

-- 3. 検索用インデックス
CREATE INDEX idx_user_gyazo_tokens_user ON user_gyazo_tokens(user_id);