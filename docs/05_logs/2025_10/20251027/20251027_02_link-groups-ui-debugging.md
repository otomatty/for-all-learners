# リンクグループUI表示問題のデバッグ

**日付**: 2025-10-27
**ステータス**: デバッグ中

---

## 問題概要

リンクグループUIが実装されているが、ページ下部に表示されていない。

## 実装状況

### ✅ 実装済み

1. **データ取得層**
   - `app/_actions/linkGroups.ts` の `getLinkGroupsForPage()` 実装済み
   - `linkCount > 1` のグループのみを取得する仕様

2. **UIコンポーネント**
   - `LinkGroupsSection` (`app/(protected)/pages/[id]/_components/link-groups-section.tsx`)
   - `TargetPageCard` (`target-page-card.tsx`)
   - `GroupedPageCard` (`grouped-page-card.tsx`)
   - `CreatePageCard` (`create-page-card.tsx`)

3. **統合**
   - `page.tsx` (116行目): `getLinkGroupsForPage()` 呼び出し済み
   - `edit-page-form.tsx` (308行目): `LinkGroupsSection` 配置済み

### 🔍 表示されない可能性のある原因

#### 原因1: データが空配列
```typescript
// LinkGroupsSection.tsx の22行目
if (linkGroups.length === 0) return null;
```

- `linkCount > 1` のリンクが存在しない場合、空配列が返される
- 早期リターンで何も表示されない

#### 原因2: データベースにデータがない
- `link_groups` テーブルにデータがない
- `link_occurrences` テーブルにデータがない
- リンクグループの自動生成が動作していない

#### 原因3: リンク抽出の問題
- ページコンテンツからリンクが正しく抽出されていない
- `extractLinksFromContent()` の問題

## デバッグ手順

### ステップ1: データの確認

```bash
# 開発サーバーを起動
bun dev
```

ブラウザのDevToolsでコンソールを開き、以下を確認：

1. ページを開く
2. `edit-page-form.tsx` に以下のデバッグログを追加：

```typescript
console.log('[DEBUG] linkGroups:', linkGroups);
console.log('[DEBUG] linkGroups length:', linkGroups.length);
```

### ステップ2: データベースの確認

Supabase Dashboardで以下のクエリを実行：

```sql
-- link_groups テーブルのデータ確認
SELECT * FROM link_groups 
WHERE link_count > 1
LIMIT 10;

-- link_occurrences テーブルのデータ確認
SELECT * FROM link_occurrences
LIMIT 10;

-- 特定ページのリンクグループ確認
SELECT 
  lg.id,
  lg.key,
  lg.raw_text,
  lg.link_count,
  lg.page_id
FROM link_groups lg
WHERE lg.id IN (
  SELECT DISTINCT link_group_id 
  FROM link_occurrences 
  WHERE source_page_id = 'YOUR_PAGE_ID_HERE'
)
AND lg.link_count > 1;
```

### ステップ3: リンク抽出の確認

`page.tsx` に以下のデバッグログを追加：

```typescript
const links = extractLinksFromContent(page.content_tiptap);
console.log('[DEBUG] Extracted links:', links);
```

## 対処法

### 対処法1: テストデータの作成

データベースにテストデータがない場合、手動で作成：

```sql
-- サンプルリンクグループを作成
INSERT INTO link_groups (key, raw_text, page_id, link_count)
VALUES 
  ('react-hooks', 'React Hooks', NULL, 3),
  ('typescript', 'TypeScript', 'existing-page-id', 2);

-- サンプルリンクオカレンスを作成
INSERT INTO link_occurrences (link_group_id, source_page_id, position)
VALUES 
  ('link-group-id-1', 'page-id-1', 10),
  ('link-group-id-1', 'page-id-2', 20),
  ('link-group-id-1', 'page-id-3', 30);
```

### 対処法2: リンク自動生成の実装確認

`lib/tiptap-extensions/unified-link-mark/` のリンク自動生成機能が動作しているか確認。

### 対処法3: デバッグログの追加

一時的にデバッグログを追加して、データフローを追跡：

```typescript
// edit-page-form.tsx
useEffect(() => {
  console.log('[LinkGroups Debug] Received linkGroups:', linkGroups);
  console.log('[LinkGroups Debug] Length:', linkGroups.length);
  console.log('[LinkGroups Debug] First group:', linkGroups[0]);
}, [linkGroups]);
```

## 次のステップ

1. ✅ デバッグログを追加して原因を特定
2. ⏳ データベースにテストデータを追加
3. ⏳ リンク自動生成の動作確認
4. ⏳ UIの表示確認

---

**最終更新**: 2025-10-27
