-- Migration: Add is_default_note flag to notes table
-- Date: 2025-10-28
-- Purpose: Support user-specific default notes for /pages consolidation

-- ============================================================
-- Step 1: Add is_default_note column
-- ============================================================

ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS is_default_note BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.notes.is_default_note IS 
'Indicates if this note is the user''s default note for all pages';

-- ============================================================
-- Step 2: Create indexes for performance
-- ============================================================

-- Ensure only one default note per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_user_default 
ON public.notes(owner_id) 
WHERE is_default_note = TRUE;

-- Optimize default note queries
CREATE INDEX IF NOT EXISTS idx_notes_default 
ON public.notes(owner_id, is_default_note) 
WHERE is_default_note = TRUE;

-- ============================================================
-- Step 3: Create default notes for existing users
-- ============================================================

-- Insert default note for each existing user
INSERT INTO public.notes (
  owner_id, 
  slug, 
  title, 
  description, 
  visibility, 
  is_default_note
)
SELECT 
  a.id,
  'default-' || a.id,
  'すべてのページ',
  'あなたが作成したすべてのページがここに表示されます',
  'private',
  TRUE
FROM public.accounts a
WHERE NOT EXISTS (
  SELECT 1 FROM public.notes n 
  WHERE n.owner_id = a.id 
    AND n.is_default_note = TRUE
);

-- ============================================================
-- Step 4: Link existing pages to default notes
-- ============================================================

-- Link all existing pages to their user's default note
INSERT INTO public.note_page_links (note_id, page_id, created_at)
SELECT 
  n.id AS note_id,
  p.id AS page_id,
  NOW()
FROM public.pages p
INNER JOIN public.notes n 
  ON n.owner_id = p.user_id 
  AND n.is_default_note = TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.note_page_links npl
  WHERE npl.note_id = n.id 
    AND npl.page_id = p.id
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Step 5: Create trigger for new users
-- ============================================================

-- Function to create default note for new users
CREATE OR REPLACE FUNCTION public.create_default_note_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notes (
    owner_id,
    slug,
    title,
    description,
    visibility,
    is_default_note
  ) VALUES (
    NEW.id,
    'default-' || NEW.id,
    'すべてのページ',
    'あなたが作成したすべてのページがここに表示されます',
    'private',
    TRUE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_create_default_note ON public.accounts;

-- Create trigger
CREATE TRIGGER trg_create_default_note
AFTER INSERT ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.create_default_note_for_new_user();

-- ============================================================
-- Step 6: Update RLS policies
-- ============================================================

-- Drop old policies
DROP POLICY IF EXISTS select_own_notes ON public.notes;
DROP POLICY IF EXISTS prevent_delete_default_note ON public.notes;

-- Allow users to see their own notes and public/unlisted notes (but not other users' default notes)
CREATE POLICY select_notes
ON public.notes
FOR SELECT
USING (
  owner_id = auth.uid() 
  OR (
    visibility IN ('public', 'unlisted') 
    AND is_default_note = FALSE
  )
);

-- Prevent deletion of default notes
CREATE POLICY prevent_delete_default_note
ON public.notes
FOR DELETE
USING (
  owner_id = auth.uid() 
  AND is_default_note = FALSE
);

-- Allow update of default notes (title, description only)
DROP POLICY IF EXISTS update_own_default_note ON public.notes;

CREATE POLICY update_own_notes
ON public.notes
FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (
  owner_id = auth.uid()
  -- Prevent changing is_default_note and visibility for default notes
  AND (
    (is_default_note = FALSE) 
    OR (is_default_note = TRUE AND visibility = 'private')
  )
);

-- ============================================================
-- Step 7: Verification queries (run manually to check)
-- ============================================================

-- Check default notes created
-- SELECT owner_id, slug, title, is_default_note 
-- FROM public.notes 
-- WHERE is_default_note = TRUE;

-- Check page links
-- SELECT n.title, COUNT(npl.page_id) as page_count
-- FROM public.notes n
-- LEFT JOIN public.note_page_links npl ON n.id = npl.note_id
-- WHERE n.is_default_note = TRUE
-- GROUP BY n.id, n.title;

-- Verify indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'notes' 
-- AND indexname LIKE '%default%';
