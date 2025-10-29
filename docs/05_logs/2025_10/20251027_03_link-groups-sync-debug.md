# リンクグループ同期デバッグ手順

**日付**: 2025-10-27
**問題**: リンクを作成しても `linkGroups` が空配列

---

## 検証手順

### ステップ1: データベースを直接確認

Supabase Dashboardで以下のSQLを実行：

```sql
-- 1. link_groups テーブルのデータ確認
SELECT * FROM link_groups 
ORDER BY created_at DESC 
LIMIT 20;

-- 2. link_occurrences テーブルのデータ確認
SELECT * FROM link_occurrences 
ORDER BY created_at DESC 
LIMIT 20;

-- 3. 特定ページのリンクグループ確認（YOUR_PAGE_ID を実際のIDに置き換え）
SELECT 
  lg.id,
  lg.key,
  lg.raw_text,
  lg.link_count,
  lg.page_id,
  lo.source_page_id,
  lo.created_at
FROM link_groups lg
LEFT JOIN link_occurrences lo ON lo.link_group_id = lg.id
WHERE lo.source_page_id = 'YOUR_PAGE_ID'
ORDER BY lg.link_count DESC;
```

**期待される結果**:
- リンクを含むページを保存後、`link_groups` にデータが存在
- `link_occurrences` に対応するレコードが存在
- `link_count` が正しく計算されている

---

### ステップ2: 自動保存のログ確認

ターミナルで開発サーバーのログを確認：

```bash
bun dev
```

エディターでリンクを追加して2秒待機後、以下のログが出力されるか確認：

```
Syncing link groups for page { pageId: '...', linkCount: X }
Link groups synced { pageId: '...', linkCount: X }
```

**もしログが出ない場合**:
- 自動保存が動作していない
- `updatePage` が呼び出されていない

---

### ステップ3: リンク抽出のテスト

以下のスクリプトを一時的に追加してテスト：

```typescript
// app/(protected)/pages/[id]/_components/edit-page-form.tsx
// usePageEditorLogic の直後に追加

useEffect(() => {
  if (!editor) return;
  
  const checkLinks = () => {
    const json = editor.getJSON();
    console.log('📝 Editor content:', json);
    
    // リンク抽出をテスト
    const links = extractLinksFromContent(json);
    console.log('🔗 Extracted links:', links);
  };
  
  editor.on('update', checkLinks);
  return () => editor.off('update', checkLinks);
}, [editor]);
```

**期待される出力**:
```
📝 Editor content: { type: 'doc', content: [...] }
🔗 Extracted links: [
  { key: 'react-hooks', text: 'React Hooks', pageId: null, ... }
]
```

---

### ステップ4: データベーストリガーの確認

Supabase Dashboardで以下を実行：

```sql
-- トリガーの存在確認
SELECT * FROM information_schema.triggers 
WHERE trigger_name LIKE '%link%';

-- トリガー関数の確認
SELECT * FROM information_schema.routines 
WHERE routine_name LIKE '%link%';
```

**必要なトリガー**:
- `update_link_count_on_insert` - link_occurrences 挿入時に link_count を更新
- `update_link_count_on_delete` - link_occurrences 削除時に link_count を更新

**もしトリガーが存在しない場合**:
```sql
-- トリガーを手動で作成（database/schema.sql を参照）
```

---

## 考えられる問題と対処法

### 問題1: 自動保存が動作していない

**症状**:
- リンクを追加しても2秒待ってもログが出ない
- `isDirty` フラグが立たない

**対処法**:
1. ブラウザのコンソールでエラーを確認
2. `useAutoSave` フックが正しく動作しているか確認
3. `savePage` 関数が呼び出されているか確認

---

### 問題2: リンク抽出が失敗している

**症状**:
- ログに `linkCount: 0` と表示される
- エディターにはリンクが表示されている

**対処法**:
1. `extractLinksFromContent` 関数を確認
2. TipTap の JSON 構造が期待通りか確認
3. UnifiedLinkMark の attributes が正しいか確認

---

### 問題3: データベーストリガーが動作していない

**症状**:
- `link_groups` にデータは挿入される
- しかし `link_count` が 0 または更新されない

**対処法**:
1. トリガーが存在するか確認（上記SQL）
2. トリガー関数にエラーがないか確認
3. 必要であればマイグレーションを再実行

```bash
# マイグレーションの再実行
# Supabase Dashboard の SQL Editor で schema.sql を実行
```

---

### 問題4: link_count が 1 のまま

**症状**:
- 複数のページで同じリンクを使用している
- しかし `link_count` が 1 のまま

**原因**:
- 各ページで別々の `link_group` が作成されている
- `key` の正規化が正しく動作していない

**対処法**:
1. `normalizeLinkKey` 関数を確認
2. 同じテキストのリンクが同じ `key` になっているか確認

```sql
-- 重複する key がないか確認
SELECT key, COUNT(*) as count 
FROM link_groups 
GROUP BY key 
HAVING COUNT(*) > 1;
```

---

## 次のステップ

1. ✅ ステップ1: データベース直接確認
2. ⏳ ステップ2: 自動保存ログ確認
3. ⏳ ステップ3: リンク抽出テスト
4. ⏳ ステップ4: トリガー確認

---

**最終更新**: 2025-10-27
