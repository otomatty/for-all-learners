-- リンクグループのデバッグ用SQL
-- 2025-10-27

-- 1. 現在のlink_groupsの状態を確認
SELECT 
  id,
  key,
  raw_text,
  link_count,
  page_id,
  created_at
FROM link_groups
ORDER BY created_at DESC
LIMIT 20;

-- 2. link_occurrencesの状態を確認
SELECT 
  lo.id,
  lo.link_group_id,
  lo.source_page_id,
  lg.key,
  lg.raw_text,
  lg.link_count,
  p.title as source_page_title
FROM link_occurrences lo
JOIN link_groups lg ON lg.id = lo.link_group_id
LEFT JOIN pages p ON p.id = lo.source_page_id
ORDER BY lo.created_at DESC
LIMIT 20;

-- 3. 特定のリンク（例: 'テスト駆動開発'）の詳細
SELECT 
  lg.id,
  lg.key,
  lg.raw_text,
  lg.link_count,
  lg.page_id,
  COUNT(DISTINCT lo.source_page_id) as distinct_page_count
FROM link_groups lg
LEFT JOIN link_occurrences lo ON lo.link_group_id = lg.id
WHERE lg.raw_text LIKE '%テスト駆動開発%'
GROUP BY lg.id, lg.key, lg.raw_text, lg.link_count, lg.page_id;

-- 4. linkCount > 1 のグループを確認（UIに表示されるはず）
SELECT 
  lg.id,
  lg.key,
  lg.raw_text,
  lg.link_count,
  lg.page_id,
  array_agg(DISTINCT lo.source_page_id) as source_pages
FROM link_groups lg
LEFT JOIN link_occurrences lo ON lo.link_group_id = lg.id
WHERE lg.link_count > 1
GROUP BY lg.id, lg.key, lg.raw_text, lg.link_count, lg.page_id;

-- 5. トリガーが正しく動作しているか確認
-- (link_count が正しく計算されているか)
SELECT 
  lg.id,
  lg.key,
  lg.raw_text,
  lg.link_count as stored_count,
  COUNT(DISTINCT lo.source_page_id) as actual_count,
  CASE 
    WHEN lg.link_count = COUNT(DISTINCT lo.source_page_id) THEN '✅ OK'
    ELSE '❌ MISMATCH'
  END as status
FROM link_groups lg
LEFT JOIN link_occurrences lo ON lo.link_group_id = lg.id
GROUP BY lg.id, lg.key, lg.raw_text, lg.link_count
HAVING lg.link_count != COUNT(DISTINCT lo.source_page_id);
