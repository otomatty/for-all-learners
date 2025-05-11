-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enum Types
----------------------------------------------------------------

-- Inquiry Status Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inquiry_status_enum') THEN
    CREATE TYPE inquiry_status_enum AS ENUM (
      'open',        -- 未対応
      'in_progress', -- 対応中
      'resolved',    -- 対応済み
      'closed'       -- クローズ
    );
  END IF;
END$$;

-- Inquiry Priority Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inquiry_priority_enum') THEN
    CREATE TYPE inquiry_priority_enum AS ENUM (
      'low',
      'medium',
      'high'
    );
  END IF;
END$$;

-- 2. inquiry_categories Table
----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inquiry_categories (
  id serial PRIMARY KEY,
  name_en text NOT NULL UNIQUE,
  name_ja text NOT NULL,
  description_en text,
  description_ja text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Initial data for inquiry_categories (if not exists)
INSERT INTO public.inquiry_categories (name_en, name_ja, sort_order) VALUES
  ('bug_report', '不具合報告', 10),
  ('feature_request', '機能要望', 20),
  ('general_question', '一般的なご質問', 30),
  ('other', 'その他', 99)
ON CONFLICT (name_en) DO NOTHING;

-- 3. inquiries Table
----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inquiries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  name text,
  category_id integer REFERENCES public.inquiry_categories(id) ON DELETE SET NULL,
  subject text,
  body text NOT NULL,
  status inquiry_status_enum DEFAULT 'open'::inquiry_status_enum,
  priority inquiry_priority_enum,
  page_path text,
  user_agent text,
  ip_address inet,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  assigned_admin_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL, -- Assumes admin_users table exists
  CONSTRAINT check_contact_info CHECK (user_id IS NOT NULL OR (email IS NOT NULL AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'))
);

-- Indexes for inquiries table
CREATE INDEX IF NOT EXISTS idx_inquiries_user_id ON public.inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_category_id ON public.inquiries(category_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_assigned_admin_id ON public.inquiries(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_email ON public.inquiries(email);

-- 4. inquiry_attachments Table
----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inquiry_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id uuid NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL UNIQUE, -- Supabase Storage path (e.g., bucket_name/file_path)
  mime_type text NOT NULL,
  size bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Index for inquiry_attachments table
CREATE INDEX IF NOT EXISTS idx_inquiry_attachments_inquiry_id ON public.inquiry_attachments(inquiry_id);

-- 5. Row Level Security (RLS) Policies
----------------------------------------------------------------

-- RLS for inquiry_categories
ALTER TABLE public.inquiry_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All users can select inquiry categories" ON public.inquiry_categories;
CREATE POLICY "All users can select inquiry categories"
  ON public.inquiry_categories
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage inquiry categories" ON public.inquiry_categories;
CREATE POLICY "Admins can manage inquiry categories"
  ON public.inquiry_categories
  FOR ALL
  USING (public.is_admin_user()) -- Assumes is_admin_user() function exists from admin.sql
  WITH CHECK (public.is_admin_user());

-- RLS for inquiries
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can insert their own inquiries" ON public.inquiries;
CREATE POLICY "Authenticated users can insert their own inquiries"
  ON public.inquiries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anonymous users can insert inquiries" ON public.inquiries;
CREATE POLICY "Anonymous users can insert inquiries"
  ON public.inquiries
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL AND email IS NOT NULL AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

DROP POLICY IF EXISTS "Authenticated users can select their own inquiries" ON public.inquiries;
CREATE POLICY "Authenticated users can select their own inquiries"
  ON public.inquiries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all inquiries" ON public.inquiries;
CREATE POLICY "Admins can manage all inquiries"
  ON public.inquiries
  FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- RLS for inquiry_attachments
ALTER TABLE public.inquiry_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert attachments for their inquiries" ON public.inquiry_attachments;
CREATE POLICY "Users can insert attachments for their inquiries"
  ON public.inquiry_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.inquiries i
      WHERE i.id = inquiry_id AND (
        (i.user_id IS NOT NULL AND i.user_id = auth.uid()) OR -- Authenticated user owns the inquiry
        (i.user_id IS NULL AND i.email IS NOT NULL) -- Anonymous user (no direct auth.uid() check for insert, relies on inquiry creation logic)
      )
    )
  );

DROP POLICY IF EXISTS "Authenticated users can select attachments for their own inquiries" ON public.inquiry_attachments;
CREATE POLICY "Authenticated users can select attachments for their own inquiries"
  ON public.inquiry_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.inquiries i
      WHERE i.id = inquiry_id AND i.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage all inquiry_attachments" ON public.inquiry_attachments;
CREATE POLICY "Admins can manage all inquiry_attachments"
  ON public.inquiry_attachments
  FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());