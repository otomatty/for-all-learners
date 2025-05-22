-- Migration: change notes.owner_id foreign key to reference auth.users
BEGIN;
-- Drop existing FK to accounts(id)
ALTER TABLE public.notes
  DROP CONSTRAINT IF EXISTS notes_owner_id_fkey;
-- Add new FK to auth.users(id)
ALTER TABLE public.notes
  ADD CONSTRAINT notes_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
COMMIT; 