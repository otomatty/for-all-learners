-- 1) 管理者ロール用の ENUM 定義
CREATE TYPE admin_role AS ENUM ('superadmin', 'admin', 'moderator');

-- 2) admin_users テーブル本体
CREATE TABLE admin_users (
  id           UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),   -- 管理者レコード固有ID
  user_id      UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  
  role         admin_role     NOT NULL,                                  -- 権限レベル
  permissions  JSONB          NOT NULL DEFAULT '{}' ,                   -- 追加の細かい権限設定が必要なら
  is_active    BOOLEAN        NOT NULL DEFAULT TRUE,                    -- 無効化フラグ
  last_login   TIMESTAMPTZ    NULL,                                      -- 最終ログイン時間
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_admin_users_role    ON admin_users(role);
-- 1) RLSを有効化して強制
ALTER TABLE public.admin_users
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.admin_users
  FORCE ROW LEVEL SECURITY;

-- 2) superadmin判定用の関数を作成（SECURITY DEFINERで自己参照のポリシー循環を防ぐ）
CREATE OR REPLACE FUNCTION public.is_superadmin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.admin_users
     WHERE user_id   = auth.uid()
       AND role      = 'superadmin'
       AND is_active = true
  );
$$;

-- 3) superadminには全操作を許可
CREATE POLICY "Superadmin full access"
  ON public.admin_users
  FOR ALL
  USING ( is_superadmin() )
  WITH CHECK ( is_superadmin() );

-- 4) 一般管理者（role='admin' 以上）は自分のレコードに対するSELECT/UPDATEのみ
--    （削除・新規作成はsuperadminに任せる）
CREATE POLICY "Select own admin record"
  ON public.admin_users
  FOR SELECT
  USING ( user_id = auth.uid() );

CREATE POLICY "Update own admin record"
  ON public.admin_users
  FOR UPDATE
  USING ( user_id = auth.uid() )
  WITH CHECK ( user_id = auth.uid() );

-- 管理者ユーザー判定関数を追加
CREATE OR REPLACE FUNCTION public.is_admin_user() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.admin_users
     WHERE user_id   = auth.uid()
       AND role      IN ('admin','superadmin')
       AND is_active = TRUE
  );
$$;

-- 管理者が全行SELECT可能なポリシーを追加
CREATE POLICY "Admins can select study_goals"
  ON study_goals FOR SELECT USING (public.is_admin_user());

CREATE POLICY "Admins can select goal_deck_links"
  ON goal_deck_links FOR SELECT USING (public.is_admin_user());

CREATE POLICY "Admins can select deck_study_logs"
  ON deck_study_logs FOR SELECT USING (public.is_admin_user());

CREATE POLICY "Admins can select raw_inputs"
  ON raw_inputs FOR SELECT USING (public.is_admin_user());

CREATE POLICY "Admins can select audio_transcriptions"
  ON audio_transcriptions FOR SELECT USING (public.is_admin_user());

CREATE POLICY "Admins can select action_logs"
  ON action_logs FOR SELECT USING (public.is_admin_user());

CREATE POLICY "Admins can select quiz_settings"
  ON quiz_settings FOR SELECT USING (public.is_admin_user());

CREATE POLICY "Admins can select user_settings"
  ON user_settings FOR SELECT USING (public.is_admin_user());

CREATE POLICY "Admins can select pages"
  ON pages FOR SELECT USING (public.is_admin_user());

CREATE POLICY "Admins can select page_shares"
  ON page_shares FOR SELECT USING (public.is_admin_user());

CREATE POLICY "Admins can select card_page_links"
  ON card_page_links FOR SELECT USING (public.is_admin_user());

-- Supabase Storage の RLS 設定と管理者向け SELECT ポリシー追加
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select storage objects"
  ON storage.objects FOR SELECT
  USING (
    public.is_admin_user()
    AND bucket_id IN ('audio-recordings','avatars','ocr-images')
  );

-- 必要であれば他の操作（INSERT/UPDATE/DELETE）も同様にポリシーを追加できます