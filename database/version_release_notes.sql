-- version_release_notes テーブルのマイグレーション
CREATE TABLE IF NOT EXISTS version_release_notes (
  id         BIGSERIAL    PRIMARY KEY,
  version    TEXT         NOT NULL UNIQUE,
  summary    TEXT         NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- RLS の有効化
ALTER TABLE version_release_notes ENABLE ROW LEVEL SECURITY;

-- 管理者ユーザーのみ操作を許可するポリシー
CREATE POLICY "Admins can manage version_release_notes"
  ON version_release_notes
  FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user()); 