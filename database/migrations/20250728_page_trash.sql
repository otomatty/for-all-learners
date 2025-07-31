-- ゴミ箱テーブルの作成
CREATE TABLE page_trash (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  original_note_id UUID REFERENCES notes(id) ON DELETE SET NULL,
  page_title TEXT NOT NULL,
  page_content TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  auto_delete_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- インデックスの作成
CREATE INDEX idx_page_trash_user_deleted ON page_trash(user_id, deleted_at DESC);
CREATE INDEX idx_page_trash_auto_delete ON page_trash(auto_delete_at) WHERE auto_delete_at IS NOT NULL;
CREATE INDEX idx_page_trash_page_id ON page_trash(page_id);

-- RLSポリシーの設定
ALTER TABLE page_trash ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のゴミ箱のみアクセス可能
CREATE POLICY "Users can access their own trash" ON page_trash
  USING (user_id = auth.uid());

-- 管理者は全てのゴミ箱にアクセス可能
CREATE POLICY "Admins can access all trash" ON page_trash
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );