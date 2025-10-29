-- Phase 2-C-3: Tiptapコンテンツからテキスト抽出
-- 作成日: 2025-10-30
-- 説明: TiptapのJSON形式から平文テキストを抽出する関数を作成

-- TiptapのJSONコンテンツから平文テキストを抽出する関数
CREATE OR REPLACE FUNCTION public.extract_tiptap_text(tiptap_json jsonb)
  RETURNS text
  LANGUAGE plpgsql
  IMMUTABLE AS $$
DECLARE
  result text := '';
  paragraph jsonb;
  node jsonb;
  text_content text;
BEGIN
  -- nullチェック
  IF tiptap_json IS NULL THEN
    RETURN '';
  END IF;

  -- contentノードを走査
  FOR paragraph IN SELECT * FROM jsonb_array_elements(tiptap_json->'content')
  LOOP
    -- 各段落のcontentノードからテキストを抽出
    FOR node IN SELECT * FROM jsonb_array_elements(paragraph->'content')
    LOOP
      text_content := node->>'text';
      IF text_content IS NOT NULL AND text_content != '' THEN
        -- スペースで区切って結合
        IF result != '' THEN
          result := result || ' ';
        END IF;
        result := result || text_content;
      END IF;
    END LOOP;
  END LOOP;

  RETURN result;
END;
$$;

-- 関数のコメント
COMMENT ON FUNCTION public.extract_tiptap_text(jsonb) IS 
'TiptapエディタのJSON形式から平文テキストを抽出する。検索機能で使用。';

-- 既存関数を削除
DROP FUNCTION IF EXISTS public.search_suggestions(text);
DROP FUNCTION IF EXISTS public.search_suggestions_fuzzy(text);

-- 既存の検索関数を更新: search_suggestions
DROP FUNCTION IF EXISTS public.search_suggestions(text);

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
    LEFT(
      (
        SELECT string_agg(node->>'text', ' ')
        FROM jsonb_array_elements(c.front_content::jsonb->'content') AS para,
             jsonb_array_elements(para->'content')            AS node
        WHERE node->>'text' IS NOT NULL
      ),
      100
    ) AS suggestion,
    ts_headline(
      'simple',
      (
        SELECT string_agg(node->>'text', ' ')
        FROM jsonb_array_elements(c.front_content::jsonb->'content') AS para,
             jsonb_array_elements(para->'content')            AS node
        WHERE node->>'text' IS NOT NULL
      ),
      plainto_tsquery('simple', p_query),
      'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, FragmentDelimiter=" ... "'
    ) AS excerpt,
    ts_rank(
      to_tsvector('simple', 
        COALESCE(
          (SELECT string_agg(node->>'text', ' ')
           FROM jsonb_array_elements(c.front_content::jsonb->'content') AS para,
                jsonb_array_elements(para->'content') AS node
           WHERE node->>'text' IS NOT NULL),
          ''
        )
      ),
      plainto_tsquery('simple', p_query)
    ) AS rank
  FROM public.cards c
  WHERE (c.front_content::text ILIKE '%'||p_query||'%'
         OR c.back_content::text ILIKE '%'||p_query||'%')
  GROUP BY c.id
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
    LEFT(
      (
        SELECT string_agg(node->>'text', ' ')
        FROM jsonb_array_elements(c.front_content::jsonb->'content') AS para,
             jsonb_array_elements(para->'content')            AS node
        WHERE node->>'text' IS NOT NULL
      ),
      100
    ) AS suggestion,
    ts_headline(
      'simple',
      (
        SELECT string_agg(node->>'text', ' ')
        FROM jsonb_array_elements(c.front_content::jsonb->'content') AS para,
             jsonb_array_elements(para->'content')            AS node
        WHERE node->>'text' IS NOT NULL
      ),
      plainto_tsquery('simple', p_query),
      'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, FragmentDelimiter=" ... "'
    ) AS excerpt,
    ts_rank(
      to_tsvector('simple', 
        COALESCE(
          (SELECT string_agg(node->>'text', ' ')
           FROM jsonb_array_elements(c.front_content::jsonb->'content') AS para,
                jsonb_array_elements(para->'content') AS node
           WHERE node->>'text' IS NOT NULL),
          ''
        )
      ),
      plainto_tsquery('simple', p_query)
    ) AS rank,
    0.0::real AS similarity
  FROM public.cards c
  WHERE (c.front_content::text ILIKE '%'||p_query||'%'
         OR c.back_content::text ILIKE '%'||p_query||'%')
  GROUP BY c.id
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
    AND p.id NOT IN (SELECT id FROM page_exact)
  ORDER BY similarity DESC
  LIMIT 3
)
SELECT type, id, suggestion, excerpt, rank, similarity
FROM (
  SELECT 
    type, id, suggestion, excerpt, rank, similarity,
    CASE WHEN similarity > 0.0 THEN similarity ELSE rank END AS sort_score
  FROM (
    SELECT type, id, suggestion, excerpt, rank, similarity FROM card_cte
    UNION ALL
    SELECT type, id, suggestion, excerpt, rank, similarity FROM page_exact
    UNION ALL
    SELECT type, id, suggestion, excerpt, rank, similarity FROM page_fuzzy
  ) all_results
) sorted_results
ORDER BY sort_score DESC;
$$;

-- 関数のコメント
COMMENT ON FUNCTION public.search_suggestions_fuzzy(text) IS 
'ファジー検索を含む検索候補取得関数。pg_trgmを使用してタイポ対応。Tiptapコンテンツはテキスト抽出して検索。';
