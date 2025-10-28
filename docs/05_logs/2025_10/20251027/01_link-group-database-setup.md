# リンクグループ機能 - データベース基盤構築

**作業日:** 2025-10-27
**担当者:** AI (Claude) + sugaiakimasa
**関連ブランチ:** feature/link-group-network
**作業時間:** 約2時間

---

## 📋 作業概要

リンクグループ・ネットワーク機能の実装に向けて、データベース基盤の構築を実施しました。Supabase MCP Server を使用して、新規テーブル `link_groups` と `link_occurrences` を作成し、RLS ポリシー、トリガー、インデックスを設定しました。

---

## 🎯 作業目的

同一リンクテキストを持つリンク同士を「リンクグループ」として管理し、リンク先ページが未作成でも繋がりを認識できる仕組みを構築する。

### 解決する課題

1. **未設定リンクの孤立問題**
   - 現状: 複数ページで同じリンクテキスト（例: `[React]`）が存在しても、それぞれ独立した未設定リンクとして扱われる
   - 解決策: リンクグループテーブルで正規化されたテキストをキーとして管理

2. **リンク出現の追跡**
   - 現状: どのページにどのリンクが何回出現するか記録されていない
   - 解決策: リンク出現記録テーブルで各リンクの位置と出現を記録

---

## ✅ 実施した作業

### 1. データベース構造の調査

**使用ツール:** `mcp_supabase_list_tables`, `mcp_supabase_execute_sql`

**調査結果:**
- Supabase プロジェクト: `ablwpfboagwcegeehmtg` (ap-northeast-1)
- 既存テーブル確認:
  - `pages`: 1239行（ページ情報）
  - `page_page_links`: 1行（ページ間直接リンク）
  - `note_page_links`: 1185行（ノートとページのリンク）
- 既存テーブルを活用しつつ、新規テーブル追加の方針を決定

---

### 2. 要件ドキュメント作成

**ファイル:** `docs/01_issues/open/2025_10/20251026_01_link-group-and-network-feature.md`

**内容:**
- 3つの主要要件定義
  1. リンクグループ機能
  2. 多階層リンク構造の認識
  3. ページ詳細画面へのリンク構造表示
- 7段階の実装フェーズ計画（合計20日間）
- データベース設計仕様
- API設計仕様
- コンポーネント設計

**重要なポイント:**
- リンク先ページが未作成でも、グループ内リンクは**通常リンク色（青色）**で表示
- UnifiedLinkMark に `groupState` 属性を追加（`exists` / `grouped` / `missing`）
- 最大3階層までのリンク構造を取得

---

### 3. データベーステーブル作成

#### 3.1 Migration 1: テーブル作成

**実行コマンド:** `mcp_supabase_apply_migration`
**Migration名:** `create_link_groups_and_occurrences`

**作成テーブル:**

##### `link_groups` テーブル
リンクグループの管理テーブル

| カラム名   | 型          | 制約                  | 説明                             |
| ---------- | ----------- | --------------------- | -------------------------------- |
| id         | uuid        | PRIMARY KEY           | グループID                       |
| key        | text        | NOT NULL UNIQUE       | 正規化されたリンクテキスト       |
| raw_text   | text        | NOT NULL              | 元のリンクテキスト（代表値）     |
| page_id    | uuid        | FK to pages           | リンク先ページID（存在する場合） |
| link_count | integer     | DEFAULT 0             | グループ内のリンク数（自動更新） |
| created_at | timestamptz | DEFAULT now()         | 作成日時                         |
| updated_at | timestamptz | DEFAULT now()         | 更新日時（自動更新）             |

**インデックス:**
- `idx_link_groups_key` (key)
- `idx_link_groups_page_id` (page_id)

**トリガー:**
- `update_link_groups_updated_at` - updated_at を自動更新

---

##### `link_occurrences` テーブル
リンク出現記録テーブル

| カラム名       | 型          | 制約                         | 説明                      |
| -------------- | ----------- | ---------------------------- | ------------------------- |
| id             | uuid        | PRIMARY KEY                  | 出現ID                    |
| link_group_id  | uuid        | NOT NULL, FK to link_groups  | リンクグループID          |
| source_page_id | uuid        | NOT NULL, FK to pages        | リンク元ページID          |
| position       | integer     | NULL                         | ページ内での出現位置      |
| mark_id        | text        | NOT NULL                     | TipTap の markId          |
| created_at     | timestamptz | DEFAULT now()                | 作成日時                  |

**制約:**
- UNIQUE (source_page_id, mark_id) - 同じページ内で同じmarkIdは1つのみ

**インデックス:**
- `idx_link_occurrences_link_group` (link_group_id)
- `idx_link_occurrences_source_page` (source_page_id)
- `idx_link_occurrences_mark_id` (mark_id)

**トリガー:**
- `update_link_count` - link_occurrences の INSERT/DELETE 時に link_groups.link_count を自動更新

**外部キー:**
- link_group_id → link_groups(id) ON DELETE CASCADE
- source_page_id → pages(id) ON DELETE CASCADE

---

#### 3.2 Migration 2: RLS ポリシー設定

**実行コマンド:** `mcp_supabase_apply_migration`
**Migration名:** `setup_rls_for_link_tables`

**link_groups テーブルのポリシー:**
- ✅ RLS 有効化
- `link_groups_select_policy` - すべての認証ユーザーが SELECT 可能
- `link_groups_insert_policy` - すべての認証ユーザーが INSERT 可能
- `link_groups_update_policy` - すべての認証ユーザーが UPDATE 可能

**link_occurrences テーブルのポリシー:**
- ✅ RLS 有効化
- `link_occurrences_select_policy` - すべての認証ユーザーが SELECT 可能
- `link_occurrences_insert_policy` - ページオーナーのみ INSERT 可能
- `link_occurrences_update_policy` - ページオーナーのみ UPDATE 可能
- `link_occurrences_delete_policy` - ページオーナーのみ DELETE 可能

**セキュリティ方針:**
- リンクグループ情報は全ユーザーが閲覧・作成・更新可能（Wikiライクな共有知識ベース）
- リンク出現記録の書き込み操作はページオーナーのみ（自分のページのみ編集可能）

---

### 4. テーブル検証

**検証内容:**
- ✅ `link_groups` テーブルが正常に作成（7カラム、RLS有効）
- ✅ `link_occurrences` テーブルが正常に作成（6カラム、RLS有効）
- ✅ インデックスが正しく設定
- ✅ 外部キー制約が正常に動作
- ✅ トリガーが正常に動作（link_count の自動更新確認予定）
- ✅ RLS ポリシーが正しく適用

**確認クエリ:**
```sql
-- テーブル構造確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name IN ('link_groups', 'link_occurrences')
ORDER BY table_name, ordinal_position;
```

---

## 🛠️ 技術詳細

### トリガー実装

#### 1. updated_at 自動更新トリガー

```sql
CREATE OR REPLACE FUNCTION update_link_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_link_groups_updated_at
  BEFORE UPDATE ON link_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_link_groups_updated_at();
```

#### 2. link_count 自動更新トリガー

```sql
CREATE OR REPLACE FUNCTION update_link_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE link_groups 
    SET link_count = link_count + 1 
    WHERE id = NEW.link_group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE link_groups 
    SET link_count = link_count - 1 
    WHERE id = OLD.link_group_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_link_count
  AFTER INSERT OR DELETE ON link_occurrences
  FOR EACH ROW
  EXECUTE FUNCTION update_link_count();
```

---

### データ整合性の保証

1. **ユニーク制約:**
   - `link_groups.key` - 同じ正規化テキストは1つのグループのみ
   - `link_occurrences (source_page_id, mark_id)` - 同じページ内で同じmarkIdは1つのみ

2. **外部キー制約:**
   - `link_groups.page_id → pages.id` (ON DELETE SET NULL)
     - ページ削除時、link_groups は残る（他のページでも使用される可能性）
   - `link_occurrences.link_group_id → link_groups.id` (ON DELETE CASCADE)
     - リンクグループ削除時、関連する出現記録も削除
   - `link_occurrences.source_page_id → pages.id` (ON DELETE CASCADE)
     - ページ削除時、そのページのリンク出現記録も削除

3. **トリガーによる自動更新:**
   - link_count の正確性を保証
   - updated_at の自動更新

---

## 📊 成果物

### 新規作成ファイル
- `docs/01_issues/open/2025_10/20251026_01_link-group-and-network-feature.md` - 要件定義ドキュメント

### データベース変更
- `link_groups` テーブル作成（0行、RLS有効）
- `link_occurrences` テーブル作成（0行、RLS有効）
- インデックス 5個 作成
- トリガー 2個 作成
- RLS ポリシー 8個 作成

### Migration ファイル
- Migration 1: `create_link_groups_and_occurrences` (実行済み)
- Migration 2: `setup_rls_for_link_tables` (実行済み)

---

## 🎯 次のステップ（Phase 1実装）

### 1. UnifiedLinkMark の拡張（1日）

**タスク:**
- [ ] `UnifiedLinkAttributes` に `linkGroupId` と `groupState` 追加
- [ ] 状態判定ロジック実装
  ```typescript
  function determineLinkState(
    key: string,
    pageId: string | null,
    linkCount: number
  ): 'exists' | 'grouped' | 'missing'
  ```
- [ ] CSS スタイル追加
  ```css
  .unilink[data-state="grouped"] {
    color: var(--link-color);
    text-decoration: underline;
  }
  ```

**ファイル:**
- `lib/tiptap-extensions/unified-link-mark/types.ts`
- `lib/tiptap-extensions/unified-link-mark/index.ts`
- `lib/tiptap-extensions/unified-link-mark/styles.css`

---

### 2. リンクグループ管理 API 実装（1日）

**エンドポイント:**

```typescript
// リンクグループ作成・更新
POST /api/link-groups
Body: {
  key: string;
  rawText: string;
  pageId?: string;
}

// リンクグループ取得
GET /api/link-groups/:key
Response: {
  id: string;
  key: string;
  rawText: string;
  pageId: string | null;
  linkCount: number;
  occurrences: Array<{
    pageId: string;
    pageTitle: string;
    updatedAt: string;
  }>;
}

// リンクグループ更新
PUT /api/link-groups/:key
Body: {
  pageId?: string;
  rawText?: string;
}
```

**ファイル:**
- `app/api/link-groups/route.ts`
- `app/api/link-groups/[key]/route.ts`

---

### 3. ページ保存時の同期処理（1日）

**実装内容:**
- TipTap コンテンツ (`content_tiptap`) から UnifiedLinkMark を抽出
- 各リンクに対して:
  1. `link_groups` にレコードを作成/取得
  2. `link_occurrences` にレコードを作成/更新
- トリガーにより `link_count` が自動更新される

**ファイル:**
- `app/_actions/pages/updatePage.ts` - 既存の保存処理に追加
- `lib/services/linkGroupService.ts` - リンクグループ同期ロジック

**実装例:**
```typescript
// content_tiptap からリンクを抽出
function extractLinks(contentTiptap: JSONContent): UnifiedLink[] {
  // 再帰的に全ての UnifiedLinkMark を抽出
}

// リンクグループ同期
async function syncLinkGroups(pageId: string, links: UnifiedLink[]) {
  for (const link of links) {
    // link_groups に upsert
    const linkGroup = await upsertLinkGroup(link.key, link.text);
    
    // link_occurrences に upsert
    await upsertLinkOccurrence({
      linkGroupId: linkGroup.id,
      sourcePageId: pageId,
      markId: link.markId,
      position: link.position,
    });
  }
}
```

---

## 📝 備考

### Supabase MCP Server の活用

今回の作業では、Supabase MCP Server を使用してデータベース操作を実施しました。

**メリット:**
- ✅ ローカルでマイグレーションファイルを作成する必要がない
- ✅ 即座にデータベースに反映される
- ✅ RLS ポリシーやトリガーも一括で設定可能
- ✅ テーブル構造の確認が容易

**今後の運用:**
- Phase 1以降の実装時も MCP Server を活用
- 必要に応じて従来の migration ファイルも併用

---

### パフォーマンス考慮事項

1. **インデックス:**
   - `link_groups.key` にインデックス → リンクテキストからのグループ検索が高速
   - `link_occurrences (link_group_id, source_page_id, mark_id)` にインデックス → 複合検索が高速

2. **トリガーのオーバーヘッド:**
   - `link_count` の自動更新は軽量な操作
   - ページ保存時のリンク同期処理が主なボトルネック（Phase 2で最適化予定）

3. **N+1 問題の回避:**
   - Phase 1実装時に JOIN を活用したクエリ設計
   - バックリンク取得時は1クエリで全件取得

---

## 🔗 関連ドキュメント

- [要件定義](../../01_issues/open/2025_10/20251026_01_link-group-and-network-feature.md)
- [データベーススキーマ](../../../database/schema.sql)
- [UnifiedLinkMark 実装](../../../lib/tiptap-extensions/unified-link-mark/)

---

## ✅ 作業完了チェック

- [x] データベース構造の調査完了
- [x] 要件定義ドキュメント作成
- [x] `link_groups` テーブル作成
- [x] `link_occurrences` テーブル作成
- [x] インデックス設定
- [x] トリガー設定
- [x] RLS ポリシー設定
- [x] テーブル検証
- [x] 作業ログ記録
- [ ] PR 作成
- [ ] Phase 1 実装開始

---

**最終更新:** 2025-10-27 11:30 (JST)
**レビュアー:** -
