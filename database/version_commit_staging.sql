-- version_commit_staging テーブルのマイグレーション
CREATE TABLE IF NOT EXISTS version_commit_staging (
  id           BIGSERIAL    PRIMARY KEY,
  version      TEXT         NOT NULL,
  commits      JSONB        NOT NULL,
  summary      TEXT         DEFAULT NULL,
  status       TEXT         NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- RLS の有効化
ALTER TABLE version_commit_staging ENABLE ROW LEVEL SECURITY;

-- 管理者ユーザーのみ操作を許可するポリシー
CREATE POLICY "Admins can manage version_commit_staging"
  ON version_commit_staging
  FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user()); 