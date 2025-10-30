# 検索機能 Phase 2-C 実装計画 (検索精度向上)

**実装日**: 2025年10月30日
**対象フェーズ**: Phase 2-C (関連度スコアリング・ファジー検索)
**関連Issue**: [#43](https://github.com/otomatty/for-all-learners/issues/43)
**前フェーズ**: Phase 2-B-1 (キーボードショートカット) - 完了

---

## 📋 概要

Phase 2-Cでは、検索精度を向上させるための以下の機能を実装します：

1. **関連度スコアリング (ts_rank)**
   - PostgreSQL の ts_rank() を使用した関連度計算
   - 検索結果のランキング精度向上
   - より関連性の高い結果を優先表示

2. **ファジー検索 (pg_trgm)**
   - タイポ・誤字に対応
   - 類似度検索の導入
   - ユーザビリティの大幅向上

3. **検索結果プレビューの改善**
   - より多くのコンテキスト表示
   - ハイライト位置の最適化
   - 関連性の高い部分を優先表示

---

## 🎯 Phase 2-C-1: 関連度スコアリング (ts_rank)

### 目的

- PostgreSQL の全文検索機能（ts_rank）を活用
- 検索クエリとの関連度に基づいた結果の並び替え
- 検索精度の向上

### 実装内容

#### 1. データベース拡張機能の確認

```sql
-- 既存の拡張機能を確認
SELECT * FROM pg_extension WHERE extname = 'pg_trgm';

-- pg_trgm がなければインストール（ファジー検索用）
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

#### 2. 検索候補取得関数の改善

**変更ファイル**: `database/migrations/20251030_01_improve_search_suggestions.sql`

```sql
-- 改善版 search_suggestions 関数
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
        (SELECT string_agg(node->>'text', ' ')
         FROM jsonb_array_elements(c.front_content::jsonb->'content') AS para,
              jsonb_array_elements(para->'content') AS node
         WHERE node->>'text' IS NOT NULL) || ' ' ||
        (SELECT string_agg(node->>'text', ' ')
         FROM jsonb_array_elements(c.back_content::jsonb->'content') AS para,
              jsonb_array_elements(para->'content') AS node
         WHERE node->>'text' IS NOT NULL)
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
      setweight(to_tsvector('simple', p.content_tiptap::text), 'B'),
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
```

**主な変更点**:
- ✅ `rank` カラムを追加（関連度スコア）
- ✅ `ts_rank()` で各結果の関連度を計算
- ✅ ページのタイトルマッチに高い重みを設定（`setweight 'A'`）
- ✅ 関連度順にソート

---

## 🎯 Phase 2-C-2: ファジー検索 (pg_trgm)

### 目的

- タイポ・誤字に強い検索
- 類似度検索の導入
- ユーザー体験の向上

### 実装内容

#### 1. pg_trgm 拡張のインストール

```sql
-- pg_trgm 拡張をインストール
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- トライグラム インデックスを作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_pages_title_trgm 
ON pages USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pages_content_trgm 
ON pages USING gin ((content_tiptap::text) gin_trgm_ops);
```

#### 2. ファジー検索を含む関数の作成

**変更ファイル**: `database/migrations/20251030_02_add_fuzzy_search.sql`

```sql
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
        (SELECT string_agg(node->>'text', ' ')
         FROM jsonb_array_elements(c.front_content::jsonb->'content') AS para,
              jsonb_array_elements(para->'content') AS node
         WHERE node->>'text' IS NOT NULL)
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
  -- 完全一致またはILIKE一致
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
      setweight(to_tsvector('simple', p.content_tiptap::text), 'B'),
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
```

**主な機能**:
- ✅ `similarity()` 関数で類似度を計算
- ✅ 類似度 0.3 以上の結果を含める（調整可能）
- ✅ 完全一致と類似一致を統合
- ✅ 重複排除

---

## 🎯 Phase 2-C-3: 検索ページへの統合

### 実装内容

#### 1. 検索ページの更新

**変更ファイル**: `app/(protected)/search/page.tsx`

```typescript
// ファジー検索を使用するかどうかのフラグ
const useFuzzySearch = true;

const supabase = createAdminClient();

// ファジー検索 or 通常検索
const rpcFunction = useFuzzySearch ? 'search_suggestions_fuzzy' : 'search_suggestions';

const { data: rpcData, error: rpcError } = await supabase.rpc(
  rpcFunction,
  { p_query: query }
);

// 型定義を拡張
interface SuggestionRow {
  type: "card" | "page";
  id: string;
  suggestion: string;
  excerpt: string;
  rank?: number;        // 関連度スコア
  similarity?: number;  // 類似度スコア
}
```

#### 2. ソートロジックの改善

```typescript
// ソート適用（関連度を考慮）
const sortedRows = (() => {
  const rows = [...filteredRows];
  
  if (sortBy === "relevance") {
    // 関連度でソート（rank or similarity）
    rows.sort((a, b) => {
      const aScore = a.similarity ?? a.rank ?? 0;
      const bScore = b.similarity ?? b.rank ?? 0;
      return bScore - aScore;
    });
  } else if (sortBy === "updated" || sortBy === "created") {
    // 既存の日付ソート
    // ...
  }
  
  return rows;
})();
```

---

## 📁 ファイル構成

### Phase 2-C-1: 関連度スコアリング

```
database/
  └── migrations/
      └── 20251030_01_improve_search_suggestions.sql  # 関数更新
```

### Phase 2-C-2: ファジー検索

```
database/
  └── migrations/
      └── 20251030_02_add_fuzzy_search.sql            # pg_trgm + fuzzy関数
```

### Phase 2-C-3: 検索ページ統合

```
app/
  └── (protected)/
      └── search/
          └── page.tsx                                # ファジー検索統合
```

---

## 📊 実装優先順位

### 🔴 優先度: 高（Phase 2-C-1）

1. **関連度スコアリング**
   - search_suggestions 関数の更新
   - ts_rank() の導入
   - 実装時間: 1-2時間

### 🟡 優先度: 中（Phase 2-C-2）

2. **ファジー検索**
   - pg_trgm 拡張のインストール
   - search_suggestions_fuzzy 関数の作成
   - インデックス作成
   - 実装時間: 2-3時間

### 🟢 優先度: 低（Phase 2-C-3）

3. **検索ページ統合**
   - ファジー検索の有効化
   - ソートロジックの改善
   - 実装時間: 1時間

---

## ✅ 実装チェックリスト

### Phase 2-C-1: 関連度スコアリング

- [ ] `20251030_01_improve_search_suggestions.sql` 作成
- [ ] `search_suggestions` 関数を更新
- [ ] `rank` カラムを追加
- [ ] `ts_rank()` で関連度計算
- [ ] ページタイトルに高い重みを設定
- [ ] マイグレーション実行
- [ ] 動作確認

### Phase 2-C-2: ファジー検索

- [ ] `20251030_02_add_fuzzy_search.sql` 作成
- [ ] `pg_trgm` 拡張をインストール
- [ ] トライグラムインデックス作成
- [ ] `search_suggestions_fuzzy` 関数作成
- [ ] 類似度閾値を調整（0.3）
- [ ] マイグレーション実行
- [ ] 動作確認

### Phase 2-C-3: 検索ページ統合

- [ ] `app/(protected)/search/page.tsx` 更新
- [ ] 型定義を拡張（rank, similarity）
- [ ] ファジー検索を有効化
- [ ] ソートロジック改善
- [ ] 動作確認

---

## 🧪 テストシナリオ

### 関連度スコアリング

1. **基本動作**
   - [ ] タイトルマッチが上位に表示される
   - [ ] 複数単語マッチが単一単語より上位
   - [ ] 関連度順にソートされる

2. **ソート機能**
   - [ ] "relevance" でランク順にソート
   - [ ] "updated" で更新日順にソート
   - [ ] "created" で作成日順にソート

### ファジー検索

3. **タイポ対応**
   - [ ] "Raect" で "React" が検索される
   - [ ] "Typescrip" で "TypeScript" が検索される
   - [ ] "Postgre" で "PostgreSQL" が検索される

4. **類似度検索**
   - [ ] 類似度 0.3 以上の結果が表示される
   - [ ] 完全一致が類似一致より優先される
   - [ ] 重複結果が排除される

5. **パフォーマンス**
   - [ ] 検索速度が許容範囲内（< 500ms）
   - [ ] インデックスが効いている
   - [ ] 大量データでも動作する

---

## 📈 期待される効果

### 関連度スコアリング

- ✅ **検索精度向上**: より関連性の高い結果が上位に
- ✅ **ユーザー満足度**: 目的の情報を早く発見
- ✅ **タイトルマッチ優遇**: ページタイトルの一致を重視

### ファジー検索

- ✅ **タイポ対応**: 誤字・脱字でも検索可能
- ✅ **ユーザビリティ向上**: ストレスの少ない検索体験
- ✅ **検索成功率向上**: 検索失敗が減少

### 総合効果

- ✅ **検索体験の大幅改善**: ユーザーフレンドリーな検索
- ✅ **学習効率向上**: 情報アクセスの高速化
- ✅ **離脱率低減**: 検索失敗による離脱を防止

---

## 🔄 実装順序

### ステップ1: 関連度スコアリング（優先）

1. マイグレーションファイル作成
2. search_suggestions 関数更新
3. データベース適用
4. 動作確認

### ステップ2: ファジー検索

1. マイグレーションファイル作成
2. pg_trgm インストール
3. インデックス作成
4. search_suggestions_fuzzy 関数作成
5. データベース適用
6. 動作確認

### ステップ3: 検索ページ統合

1. 型定義拡張
2. ファジー検索有効化
3. ソートロジック改善
4. 総合テスト

---

## 🐛 想定される問題と対策

### 問題1: pg_trgm がインストールできない

**原因**: データベースの権限不足

**対策**:
```sql
-- Supabase の場合、管理画面から実行
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 問題2: パフォーマンス低下

**原因**: インデックスが効いていない

**対策**:
```sql
-- EXPLAIN ANALYZE で確認
EXPLAIN ANALYZE SELECT * FROM search_suggestions_fuzzy('test');

-- インデックス再作成
REINDEX INDEX idx_pages_title_trgm;
```

### 問題3: 類似度閾値の調整

**原因**: 閾値が高すぎる/低すぎる

**対策**:
```sql
-- 閾値を調整（0.2 ~ 0.4 が適切）
WHERE similarity(p.title, p_query) > 0.3
```

---

## 📚 参考資料

### PostgreSQL 公式ドキュメント

- [Full Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [ts_rank()](https://www.postgresql.org/docs/current/textsearch-controls.html#TEXTSEARCH-RANKING)
- [pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html)

### 技術記事

- [PostgreSQL Full Text Search の基礎](https://qiita.com/tags/postgresql)
- [pg_trgm による類似度検索](https://zenn.dev/topics/postgresql)

---

**作成者**: AI (GitHub Copilot)
**作成日**: 2025-10-30
**ステータス**: Draft
