-- migrations/update_schema.sql
-- Migration Script: Update schema to support independent pages and page sharing

BEGIN;

-- 1. Remove notes and note_shares
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_note_id_fkey;
ALTER TABLE pages DROP COLUMN IF EXISTS note_id CASCADE;
DROP TABLE IF EXISTS note_shares CASCADE;
DROP TABLE IF EXISTS notes CASCADE;

-- 2. Add visibility flag to pages
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE NOT NULL;

-- 3. Update share_links to include 'page'
-- Remove stale note share_links
DELETE FROM share_links WHERE resource_type = 'note';
-- Replace check constraint on resource_type
ALTER TABLE share_links DROP CONSTRAINT IF EXISTS share_links_resource_type_check;
ALTER TABLE share_links
  ADD CONSTRAINT share_links_resource_type_check
  CHECK (resource_type IN ('deck','page'));

-- 4. Create card_page_links table
CREATE TABLE IF NOT EXISTS card_page_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) NOT NULL,
  page_id UUID REFERENCES pages(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create page_shares table
CREATE TABLE IF NOT EXISTS page_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID REFERENCES pages(id) NOT NULL,
  shared_with_user_id UUID REFERENCES accounts(id) NOT NULL,
  permission_level VARCHAR(10) NOT NULL CHECK (permission_level IN ('view','edit')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(page_id, shared_with_user_id)
);

-- 6. Rebuild RLS policies on pages
-- Drop old policies
DROP POLICY IF EXISTS "ユーザーは自分のページを参照可能" ON pages;
DROP POLICY IF EXISTS "ユーザーは共有されたノートのページを参照可能" ON pages;
DROP POLICY IF EXISTS "ユーザーは自分のページを作成可能" ON pages;
DROP POLICY IF EXISTS "ユーザーは自分のページを更新可能" ON pages;
DROP POLICY IF EXISTS "ユーザーは自分のページを削除可能" ON pages;

-- Enable RLS and new policies
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ユーザーは自分のページを参照可能" ON pages
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ユーザーは共有されたページを参照可能" ON pages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM page_shares
      WHERE page_shares.page_id = pages.id
        AND page_shares.shared_with_user_id = auth.uid()
    )
  );
CREATE POLICY "ユーザーは自分のページを作成可能" ON pages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ユーザーは自分のページを更新可能" ON pages
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ユーザーは編集権限のある共有ページを更新可能" ON pages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM page_shares
      WHERE page_shares.page_id = pages.id
        AND page_shares.shared_with_user_id = auth.uid()
        AND page_shares.permission_level = 'edit'
    )
  );
CREATE POLICY "ユーザーは自分のページを削除可能" ON pages
  FOR DELETE USING (auth.uid() = user_id);

-- 7. RLS policies for page_shares
ALTER TABLE page_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ユーザーは自身に共有されたページへのリンクを参照可能" ON page_shares
  FOR SELECT USING (auth.uid() = shared_with_user_id);
CREATE POLICY "ユーザーはページ共有を作成可能" ON page_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pages
      WHERE pages.id = page_shares.page_id
        AND pages.user_id = auth.uid()
    )
  );
CREATE POLICY "ユーザーはページ共有を削除可能" ON page_shares
  FOR DELETE USING (
    page_shares.shared_with_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM pages
      WHERE pages.id = page_shares.page_id
        AND pages.user_id = auth.uid()
    )
  );

-- 8. RLS policies for card_page_links
ALTER TABLE card_page_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ユーザーは自身のカードに紐づくリンクを参照可能" ON card_page_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cards
      WHERE cards.id = card_page_links.card_id
        AND (
          auth.uid() = cards.user_id
          OR EXISTS (
            SELECT 1 FROM deck_shares
            WHERE deck_shares.deck_id = cards.deck_id
              AND deck_shares.shared_with_user_id = auth.uid()
          )
        )
    )
  );
CREATE POLICY "ユーザーは自身のカードにリンクを作成可能" ON card_page_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cards
      WHERE cards.id = card_page_links.card_id
        AND auth.uid() = cards.user_id
    )
  );
CREATE POLICY "ユーザーは自身のカードに紐づくリンクを削除可能" ON card_page_links
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cards
      WHERE cards.id = card_page_links.card_id
        AND auth.uid() = cards.user_id
    )
  );

COMMIT; 