-- Phase 2-C-1: 検索精度向上 - 関連度スコアリング
-- 作成日: 2025-10-30
-- 説明: search_suggestions 関数に ts_rank による関連度スコアを追加

-- 既存の search_suggestions 関数を改善版に置き換え
CREATE OR REPLACE FUNCTION public.search_suggestions(p_query text)
  RETURNS TABLE (
    type       text,
    id         uuid,
    suggestion text,
    excerpt    text,
    rank       real  -- 関連度スコアを追加
  )
  LANGUAGE sql
  STABLE AS $$
WITH card_cte AS (
  SELECT
    'card'::text AS type,
    c.id,
    -- 元の抜粋（先頭100文字）をタイトル代わりに
    LEFT(
      (
        SELECT string_agg(node->>'text', ' ')
        FROM jsonb_array_elements(c.front_content::jsonb->'content') AS para,
             jsonb_array_elements(para->'content')            AS node
        WHERE node->>'text' IS NOT NULL
      ),
      100
    ) AS suggestion,
    -- ハイライト付き抜粋
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
    -- 関連度スコア（front_content + back_content の全文検索）
    ts_rank(
      to_tsvector('simple', 
        COALESCE(
          (SELECT string_agg(node->>'text', ' ')
           FROM jsonb_array_elements(c.front_content::jsonb->'content') AS para,
                jsonb_array_elements(para->'content') AS node
           WHERE node->>'text' IS NOT NULL),
          ''
        ) || ' ' ||
        COALESCE(
          (SELECT string_agg(node->>'text', ' ')
           FROM jsonb_array_elements(c.back_content::jsonb->'content') AS para,
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
    ts_headline(
      'simple',
      p.content_tiptap::text,
      plainto_tsquery('simple', p_query),
      'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, FragmentDelimiter=" ... "'
    ) AS excerpt,
    -- 関連度スコア（タイトル優遇: タイトルマッチは重みを高く）
    ts_rank(
      setweight(to_tsvector('simple', p.title), 'A') ||
      setweight(to_tsvector('simple', COALESCE(p.content_tiptap::text, '')), 'B'),
      plainto_tsquery('simple', p_query)
    ) AS rank
  FROM public.pages p
  WHERE (p.title ILIKE '%'||p_query||'%'
         OR p.content_tiptap::text ILIKE '%'||p_query||'%')
  ORDER BY rank DESC
  LIMIT 5
)
SELECT * FROM card_cte
UNION ALL
SELECT * FROM page_cte
ORDER BY rank DESC;
$$;

-- 実行確認用のコメント
COMMENT ON FUNCTION public.search_suggestions(text) IS 
'検索候補を関連度スコア付きで取得する関数。ts_rank()を使用して検索クエリとの関連度を計算し、ページタイトルマッチには高い重みを設定している。';
