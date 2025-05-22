-- Create or replace RPC to fetch paginated pages for a note
CREATE OR REPLACE FUNCTION public.get_note_pages(
  p_note_id uuid,
  p_limit integer,
  p_offset integer,
  p_sort text
)
RETURNS TABLE(
  pages public.pages[],
  total_count bigint
)
LANGUAGE sql STABLE
AS $$
WITH selected AS (
  -- Select the whole row as composite type 'pages'
  SELECT p AS page
  FROM public.pages p
  INNER JOIN public.note_page_links npl
    ON npl.page_id = p.id
  WHERE npl.note_id = p_note_id
  ORDER BY
    CASE WHEN p_sort = 'created' THEN p.created_at ELSE p.updated_at END DESC
  LIMIT p_limit OFFSET p_offset
)
SELECT
  -- Aggregate composite rows into pages[]
  array_agg(selected.page) AS pages,
  (SELECT count(*) FROM public.note_page_links WHERE note_id = p_note_id) AS total_count
FROM selected;
$$; 