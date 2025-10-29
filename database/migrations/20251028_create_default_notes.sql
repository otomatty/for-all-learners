-- Migration: Create default "all-pages" note for each user
-- Date: 2025-10-28
-- Purpose: Prepare for /pages to /notes consolidation

-- Step 1: Create default note for all existing users
INSERT INTO public.notes (owner_id, slug, title, description, visibility)
SELECT 
  a.id as owner_id,
  'all-pages' as slug,
  'すべてのページ' as title,
  'ユーザーが作成したすべてのページを含むデフォルトノート' as description,
  'private' as visibility
FROM public.accounts a
WHERE NOT EXISTS (
  SELECT 1 FROM public.notes n 
  WHERE n.owner_id = a.id AND n.slug = 'all-pages'
)
ON CONFLICT (slug) DO NOTHING;

-- Step 2: Link all existing pages to their user's default note
INSERT INTO public.note_page_links (note_id, page_id)
SELECT 
  n.id as note_id,
  p.id as page_id
FROM public.pages p
INNER JOIN public.notes n ON n.owner_id = p.user_id AND n.slug = 'all-pages'
WHERE NOT EXISTS (
  SELECT 1 FROM public.note_page_links npl 
  WHERE npl.page_id = p.id AND npl.note_id = n.id
)
ON CONFLICT (note_id, page_id) DO NOTHING;

-- Step 3: Create function to auto-create default note for new users
CREATE OR REPLACE FUNCTION public.create_default_note_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notes (owner_id, slug, title, description, visibility)
  VALUES (
    NEW.id,
    'all-pages',
    'すべてのページ',
    'ユーザーが作成したすべてのページを含むデフォルトノート',
    'private'
  )
  ON CONFLICT (slug) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger to auto-create default note on user creation
DROP TRIGGER IF EXISTS trg_create_default_note ON public.accounts;
CREATE TRIGGER trg_create_default_note
  AFTER INSERT ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_note_for_user();

-- Step 5: Verify migration
DO $$
DECLARE
  users_count INTEGER;
  notes_count INTEGER;
  links_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO users_count FROM public.accounts;
  SELECT COUNT(*) INTO notes_count FROM public.notes WHERE slug = 'all-pages';
  SELECT COUNT(*) INTO links_count FROM public.note_page_links;
  
  RAISE NOTICE 'Migration completed:';
  RAISE NOTICE '  Total users: %', users_count;
  RAISE NOTICE '  Default notes created: %', notes_count;
  RAISE NOTICE '  Total page links: %', links_count;
END $$;
