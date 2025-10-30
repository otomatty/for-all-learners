-- Phase 2-C-3: Tiptapコンテンツからテキスト抽出
-- 作成日: 2025-10-30
-- 説明: TiptapのJSON形式から平文テキストを抽出する関数を作成

-- TiptapのJSONコンテンツから平文テキストを抽出する関数
-- 再帰的CTEを使用してすべての階層からテキストを抽出（heading, bulletList, listItem等に対応）
CREATE OR REPLACE FUNCTION public.extract_tiptap_text(tiptap_json jsonb)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE AS $$
  WITH RECURSIVE nodes AS (
    SELECT tiptap_json AS node
    UNION ALL
    SELECT jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(n.node->'content') = 'array'
        THEN n.node->'content'
        ELSE '[]'::jsonb
      END
    )
    FROM nodes n
    WHERE jsonb_typeof(n.node) = 'object' AND n.node ? 'content'
  )
  SELECT COALESCE(string_agg(node->>'text', ' '), '')
  FROM nodes
  WHERE jsonb_typeof(node) = 'object' AND node ? 'text' AND node->>'text' IS NOT NULL;
$$;

-- 関数のコメント
COMMENT ON FUNCTION public.extract_tiptap_text(jsonb) IS 
'TiptapエディタのJSON形式から平文テキストを抽出する。再帰的にすべての階層を走査。検索機能で使用。';

-- 既存の検索関数を更新: search_suggestions

CREATE OR REPLACE FUNCTION public.search_suggestions(p_query text)
  RETURNS TABLE (
    type       text,
    id         uuid,
    suggestion text,
    excerpt    text,
    rank       real
  )
  LANGUAGE sql
  STABLE AS $$
WITH card_cte AS (
  SELECT
    'card'::text AS type,
    c.id,
    LEFT(extract_tiptap_text(c.front_content::jsonb), 100) AS suggestion,
    ts_headline(
      'simple',
      extract_tiptap_text(c.front_content::jsonb),
      plainto_tsquery('simple', p_query),
      'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, FragmentDelimiter=" ... "'
    ) AS excerpt,
    ts_rank(
      to_tsvector('simple', 
        COALESCE(extract_tiptap_text(c.front_content::jsonb), '') || ' ' || 
        COALESCE(extract_tiptap_text(c.back_content::jsonb), '')
      ),
      plainto_tsquery('simple', p_query)
    ) AS rank
  FROM public.cards c
  WHERE extract_tiptap_text(c.front_content::jsonb) ILIKE '%'||p_query||'%'
     OR extract_tiptap_text(c.back_content::jsonb) ILIKE '%'||p_query||'%'
  ORDER BY rank DESC
  LIMIT 5
),
page_cte AS (
  SELECT
    'page'::text AS type,
    p.id,
    p.title AS suggestion,
    -- Tiptapコンテンツをテキスト抽出してハイライト
    ts_headline(
      'simple',
      extract_tiptap_text(p.content_tiptap::jsonb),
      plainto_tsquery('simple', p_query),
      'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, FragmentDelimiter=" ... "'
    ) AS excerpt,
    ts_rank(
      setweight(to_tsvector('simple', p.title), 'A') ||
      setweight(to_tsvector('simple', COALESCE(extract_tiptap_text(p.content_tiptap::jsonb), '')), 'B'),
      plainto_tsquery('simple', p_query)
    ) AS rank
  FROM public.pages p
  WHERE (p.title ILIKE '%'||p_query||'%'
         OR extract_tiptap_text(p.content_tiptap::jsonb) ILIKE '%'||p_query||'%')
  ORDER BY rank DESC
  LIMIT 5
)
SELECT * FROM card_cte
UNION ALL
SELECT * FROM page_cte
ORDER BY rank DESC;
$$;

-- 関数のコメント
COMMENT ON FUNCTION public.search_suggestions(text) IS 
'検索候補を取得する関数（関連度スコアリング付き）。Tiptapコンテンツはテキスト抽出して検索。';

-- 既存の検索関数を更新: search_suggestions_fuzzy
CREATE OR REPLACE FUNCTION public.search_suggestions_fuzzy(p_query text)
  RETURNS TABLE (
    type       text,
    id         uuid,
    suggestion text,
    excerpt    text,
    rank       real,
    similarity real
  )
  LANGUAGE sql
  STABLE AS $$
WITH card_cte AS (
  SELECT
    'card'::text AS type,
    c.id,
    LEFT(extract_tiptap_text(c.front_content::jsonb), 100) AS suggestion,
    ts_headline(
      'simple',
      extract_tiptap_text(c.front_content::jsonb),
      plainto_tsquery('simple', p_query),
      'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, FragmentDelimiter=" ... "'
    ) AS excerpt,
    ts_rank(
      to_tsvector('simple', 
        COALESCE(extract_tiptap_text(c.front_content::jsonb), '') || ' ' || 
        COALESCE(extract_tiptap_text(c.back_content::jsonb), '')
      ),
      plainto_tsquery('simple', p_query)
    ) AS rank,
    0.0::real AS similarity
  FROM public.cards c
  WHERE extract_tiptap_text(c.front_content::jsonb) ILIKE '%'||p_query||'%'
     OR extract_tiptap_text(c.back_content::jsonb) ILIKE '%'||p_query||'%'
  ORDER BY rank DESC
  LIMIT 5
),
page_exact AS (
  SELECT
    'page'::text AS type,
    p.id,
    p.title AS suggestion,
    ts_headline(
      'simple',
      extract_tiptap_text(p.content_tiptap::jsonb),
      plainto_tsquery('simple', p_query),
      'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, FragmentDelimiter=" ... "'
    ) AS excerpt,
    ts_rank(
      setweight(to_tsvector('simple', p.title), 'A') ||
      setweight(to_tsvector('simple', COALESCE(extract_tiptap_text(p.content_tiptap::jsonb), '')), 'B'),
      plainto_tsquery('simple', p_query)
    ) AS rank,
    1.0::real AS similarity
  FROM public.pages p
  WHERE (p.title ILIKE '%'||p_query||'%'
         OR extract_tiptap_text(p.content_tiptap::jsonb) ILIKE '%'||p_query||'%')
  ORDER BY rank DESC
  LIMIT 5
),
page_fuzzy AS (
  SELECT
    'page'::text AS type,
    p.id,
    p.title AS suggestion,
    ts_headline(
      'simple',
      extract_tiptap_text(p.content_tiptap::jsonb),
      plainto_tsquery('simple', p_query),
      'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, FragmentDelimiter=" ... "'
    ) AS excerpt,
    0.0::real AS rank,
    similarity(p.title, p_query) AS similarity
  FROM public.pages p
  WHERE similarity(p.title, p_query) > 0.3
    AND NOT EXISTS (SELECT 1 FROM page_exact pe WHERE pe.id = p.id)
  ORDER BY similarity DESC
  LIMIT 3
)
SELECT type, id, suggestion, excerpt, rank, similarity
FROM (
    SELECT type, id, suggestion, excerpt, rank, similarity FROM card_cte
    UNION ALL
    SELECT type, id, suggestion, excerpt, rank, similarity FROM page_exact
    UNION ALL
    SELECT type, id, suggestion, excerpt, rank, similarity FROM page_fuzzy
) all_results
ORDER BY CASE WHEN similarity > 0.0 THEN similarity ELSE rank END DESC;
$$;

-- 関数のコメント
COMMENT ON FUNCTION public.search_suggestions_fuzzy(text) IS 
'ファジー検索を含む検索候補取得関数。pg_trgmを使用してタイポ対応。Tiptapコンテンツはテキスト抽出して検索。';
