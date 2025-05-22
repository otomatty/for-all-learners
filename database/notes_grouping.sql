-- 1. reserved_slugs テーブル：予約語リスト
CREATE TABLE IF NOT EXISTS public.reserved_slugs (
  slug TEXT PRIMARY KEY,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.reserved_slugs ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_reserved_slugs
  ON public.reserved_slugs
  FOR SELECT
  USING (true);

-- 2. notes テーブル：ノート本体
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  visibility VARCHAR(10) NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('public','unlisted','invite','private')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notes_owner ON public.notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_notes_slug  ON public.notes(slug);

-- slug 検証用トリガー関数を上書き or 作成
CREATE OR REPLACE FUNCTION public.reject_reserved_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.reserved_slugs WHERE slug = NEW.slug) THEN
    RAISE EXCEPTION '"%" は予約語です。別の slug を指定してください。', NEW.slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_notes_slug_check ON public.notes;
CREATE TRIGGER trg_notes_slug_check
  BEFORE INSERT OR UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.reject_reserved_slug();

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_own_notes
  ON public.notes
  FOR SELECT
  USING (auth.uid() = owner_id);
CREATE POLICY insert_notes
  ON public.notes
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY update_own_notes
  ON public.notes
  FOR UPDATE
  USING (auth.uid() = owner_id);
CREATE POLICY delete_own_notes
  ON public.notes
  FOR DELETE
  USING (auth.uid() = owner_id);

-- 3. note_shares テーブル：招待ユーザー管理
CREATE TABLE IF NOT EXISTS public.note_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  permission_level VARCHAR(10) NOT NULL CHECK(permission_level IN ('editor','viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(note_id, shared_with_user_id)
);
CREATE INDEX IF NOT EXISTS idx_note_shares_note_id ON public.note_shares(note_id);
CREATE INDEX IF NOT EXISTS idx_note_shares_user_id ON public.note_shares(shared_with_user_id);

ALTER TABLE public.note_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_note_shares
  ON public.note_shares
  FOR SELECT
  USING (
    auth.uid() = shared_with_user_id
    OR EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = note_id AND n.owner_id = auth.uid()
    )
  );
CREATE POLICY insert_note_shares
  ON public.note_shares
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = note_id AND n.owner_id = auth.uid()
    )
  );
CREATE POLICY update_note_shares
  ON public.note_shares
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = note_id AND n.owner_id = auth.uid()
    )
  );
CREATE POLICY delete_note_shares
  ON public.note_shares
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = note_id AND n.owner_id = auth.uid()
    )
  );

-- 4. note_page_links テーブル：ノート⇔ページ紐付け
CREATE TABLE IF NOT EXISTS public.note_page_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(note_id, page_id)
);
CREATE INDEX IF NOT EXISTS idx_note_page_links_note_id ON public.note_page_links(note_id);
CREATE INDEX IF NOT EXISTS idx_note_page_links_page_id ON public.note_page_links(page_id);

ALTER TABLE public.note_page_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_note_pages
  ON public.note_page_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.notes n
      LEFT JOIN public.note_shares ns ON ns.note_id = n.id
      WHERE n.id = note_id
        AND (
          n.owner_id = auth.uid()
          OR (ns.shared_with_user_id = auth.uid() AND ns.permission_level = 'viewer')
        )
    )
  );
CREATE POLICY insert_note_pages
  ON public.note_page_links
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.notes n
      LEFT JOIN public.note_shares ns ON ns.note_id = n.id
      WHERE n.id = note_id
        AND (
          n.owner_id = auth.uid()
          OR (ns.shared_with_user_id = auth.uid() AND ns.permission_level = 'editor')
        )
    )
  );
CREATE POLICY delete_note_pages
  ON public.note_page_links
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.notes n
      LEFT JOIN public.note_shares ns ON ns.note_id = n.id
      WHERE n.id = note_id
        AND (
          n.owner_id = auth.uid()
          OR (ns.shared_with_user_id = auth.uid() AND ns.permission_level = 'editor')
        )
    )
  );

-- 5. share_links テーブル：トークン共有リンク
CREATE TABLE IF NOT EXISTS public.share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type VARCHAR(10) NOT NULL CHECK(resource_type IN ('note','page','deck')),
  resource_id UUID NOT NULL,
  token TEXT UNIQUE NOT NULL,
  permission_level VARCHAR(10) NOT NULL CHECK(permission_level IN ('viewer','editor','owner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_share_links_resource ON public.share_links(resource_type, resource_id);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_share_links
  ON public.share_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.notes
      WHERE id = resource_id
        AND resource_type = 'note'
        AND owner_id = auth.uid()
    )
  );
CREATE POLICY insert_share_links
  ON public.share_links
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.notes
      WHERE id = resource_id
        AND resource_type = 'note'
        AND owner_id = auth.uid()
    )
  );
CREATE POLICY update_share_links
  ON public.share_links
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.notes
      WHERE id = resource_id
        AND resource_type = 'note'
        AND owner_id = auth.uid()
    )
  );
CREATE POLICY delete_share_links
  ON public.share_links
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.notes
      WHERE id = resource_id
        AND resource_type = 'note'
        AND owner_id = auth.uid()
    )
  );

  BEGIN;

-- 1. カラム追加（participant_count のデフォルトを 1 に）
ALTER TABLE public.notes
  ADD COLUMN page_count         integer NOT NULL DEFAULT 0,
  ADD COLUMN participant_count  integer NOT NULL DEFAULT 1;

-- 2. 既存データをバックフィル（シェア数 + 1 = オーナー含む人数）
UPDATE public.notes
SET page_count = (
  SELECT COUNT(*) FROM public.note_page_links l WHERE l.note_id = notes.id
);
UPDATE public.notes
SET participant_count = (
  SELECT COUNT(*) FROM public.note_shares s WHERE s.note_id = notes.id
) + 1;

-- 3. トリガー関数：note_shares の INSERT/DELETE で自動増減
CREATE OR REPLACE FUNCTION public.trg_update_participant_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.notes SET participant_count = participant_count + 1 WHERE id = NEW.note_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.notes SET participant_count = participant_count - 1 WHERE id = OLD.note_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_note_shares_count ON public.note_shares;
CREATE TRIGGER trg_note_shares_count
  AFTER INSERT OR DELETE ON public.note_shares
  FOR EACH ROW EXECUTE FUNCTION public.trg_update_participant_count();

-- page_count 用トリガーはそのまま使ってOK

COMMIT;