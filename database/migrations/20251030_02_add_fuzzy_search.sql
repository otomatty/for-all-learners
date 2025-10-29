-- Phase 2-C-2: 検索精度向上 - ファジー検索（タイポ対応）
-- 作成日: 2025-10-30
-- 説明: pg_trgm 拡張を使用した類似度検索の導入

-- pg_trgm 拡張をインストール（トライグラム類似度検索用）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- トライグラムインデックスを作成（パフォーマンス向上）
-- ページタイトル用
CREATE INDEX IF NOT EXISTS idx_pages_title_trgm 
ON pages USING gin (title gin_trgm_ops);

-- ページコンテンツ用（全文検索との併用）
CREATE INDEX IF NOT EXISTS idx_pages_content_trgm 
ON pages USING gin ((content_tiptap::text) gin_trgm_ops);

-- ファジー検索を含む検索候補取得関数
CREATE OR REPLACE FUNCTION public.search_suggestions_fuzzy(p_query text)
  RETURNS TABLE (
    type       text,
    id         uuid,
    suggestion text,
    excerpt    text,
    rank       real,
    similarity real  -- 類似度を追加
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
    0.0::real AS similarity  -- カードには類似度なし
  FROM public.cards c
  WHERE (c.front_content::text ILIKE '%'||p_query||'%'
         OR c.back_content::text ILIKE '%'||p_query||'%')
  GROUP BY c.id
  ORDER BY rank DESC
  LIMIT 5
),
page_exact AS (
  -- 完全一致またはILIKE一致（通常の検索）
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
    ts_rank(
      setweight(to_tsvector('simple', p.title), 'A') ||
      setweight(to_tsvector('simple', COALESCE(p.content_tiptap::text, '')), 'B'),
      plainto_tsquery('simple', p_query)
    ) AS rank,
    1.0::real AS similarity  -- 完全一致は similarity = 1.0
  FROM public.pages p
  WHERE (p.title ILIKE '%'||p_query||'%'
         OR p.content_tiptap::text ILIKE '%'||p_query||'%')
  ORDER BY rank DESC
  LIMIT 5
),
page_fuzzy AS (
  -- 類似度検索（タイポ対応）
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
    0.0::real AS rank,  -- fuzzy には ts_rank を使わない
    similarity(p.title, p_query) AS similarity
  FROM public.pages p
  WHERE similarity(p.title, p_query) > 0.3  -- 類似度閾値: 0.3
    AND p.id NOT IN (SELECT id FROM page_exact)  -- 完全一致と重複しない
  ORDER BY similarity DESC
  LIMIT 3
),
page_cte AS (
  SELECT * FROM page_exact
  UNION ALL
  SELECT * FROM page_fuzzy
)
SELECT * FROM card_cte
UNION ALL
SELECT * FROM page_cte
ORDER BY 
  CASE 
    WHEN similarity > 0.0 THEN similarity  -- fuzzy match
    ELSE rank                               -- exact match
  END DESC;
$$;

-- 関数のコメント
COMMENT ON FUNCTION public.search_suggestions_fuzzy(text) IS 
'ファジー検索を含む検索候補取得関数。pg_trgm を使用してタイポ・誤字に対応した類似度検索を実行。完全一致と類似一致を統合して返す。';

-- インデックスのコメント
COMMENT ON INDEX idx_pages_title_trgm IS 
'ページタイトルのトライグラム類似度検索用インデックス。ファジー検索のパフォーマンスを向上させる。';

COMMENT ON INDEX idx_pages_content_trgm IS 
'ページコンテンツのトライグラム類似度検索用インデックス。全文検索との併用でパフォーマンスを最適化。';
