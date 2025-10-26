# リンクグループ・ネットワーク機能実装要件

**作成日:** 2025-10-26
**カテゴリ:** 機能拡張
**優先度:** High
**関連ブランチ:** feature/link-group-network

---

## 📋 概要

現在のメモ機能では `UnifiedLinkMark` により `[タイトル]` 形式のブラケットリンクと `#タグ` 形式のタグリンクが実装されています。本要件では、同一リンクテキストを持つリンク同士を「リンクグループ」として扱い、さらに多階層のリンク構造を認識・可視化する機能を追加します。

---

## 🎯 背景・目的

### 現状の課題

1. **未設定リンクの孤立**
   - 現在: リンク先ページが存在しない場合は「未設定リンク」として扱われる
   - 問題: 複数のページで同じタイトルのリンク（例: `[React]`）が存在しても、それぞれ独立した未設定リンクとして扱われる
   - 影響: 同じ概念を指すリンク同士の繋がりが認識されない

2. **1階層のみのリンク認識**
   - 現在: 直接のリンク関係（A→B）のみ認識
   - 問題: リンク先のリンク（A→B→C）が認識できない
   - 影響: ページ間の関連性の全体像が把握できない

3. **リンク構造の可視化不足**
   - 現在: ページ詳細画面には直接のリンク情報のみ表示
   - 問題: 同じリンクテキストを使用している他のページが不明
   - 影響: 関連ページの発見が困難

### 期待される効果

- 同じ概念を指すリンク同士が自動的にグループ化される
- リンク先が未作成でも、同じリンクテキストを持つページ同士が繋がる
- ページ間の関連性をネットワーク構造として可視化できる
- Wikiライクなナレッジベースとしての利便性向上

---

## 📝 要件定義

### 要件1: リンクグループ機能

#### 1.1 リンクグループの定義

**定義:**
```
リンクグループ = 正規化されたリンクテキスト（key）が同一のリンクの集合
```

**特徴:**
- リンク先ページの有無に関わらず、同じ key を持つリンクは同じグループに属する
- グループ内のリンクは互いに「繋がり」を持つ
- 一つのページが作成されたら、グループ内の全リンクが自動的にそのページへ紐づく

**例:**
```
ページA: [React] (未設定) ─┐
ページB: [React] (未設定) ─┼─ リンクグループ「react」
ページC: [React] (未設定) ─┘

↓ ページ「React」を作成

ページA: [React] (pageId: xxx) ─┐
ページB: [React] (pageId: xxx) ─┼─ 全て同じページへリンク
ページC: [React] (pageId: xxx) ─┘
```

#### 1.2 リンクグループの表示スタイル

**重要:** リンク先ページが存在しない場合でも、リンクグループに属するリンクは通常のリンクと同じテキストカラーで表示する。

**表示ルール:**
```
- リンク先ページが存在する場合: 
  → 通常リンク色（青色）で表示

- リンク先ページが存在しないが、同じリンクテキストのリンクが複数存在する場合:
  → 通常リンク色（青色）で表示
  → クリックすると、同じリンクテキストを持つページ一覧を表示

- リンク先ページが存在せず、リンクテキストが唯一の場合:
  → 未設定リンク色（グレー）で表示
  → クリックすると、新規ページ作成ダイアログを表示
```

**CSS実装例:**
```css
/* 通常リンク（ページ存在） */
.unilink[data-state="exists"] {
  color: var(--link-color);
  text-decoration: underline;
}

/* リンクグループ（ページ未存在だがグループ内に複数リンク） */
.unilink[data-state="grouped"] {
  color: var(--link-color);
  text-decoration: underline;
  cursor: pointer;
}

/* 未設定リンク（ページ未存在かつリンクテキストが唯一） */
.unilink[data-state="missing"] {
  color: var(--text-muted);
  text-decoration: underline dashed;
}
```

#### 1.3 データ構造

**データベーステーブル（新規）:**

```sql
-- リンクグループテーブル
CREATE TABLE link_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,           -- 正規化されたリンクテキスト
  raw_text TEXT NOT NULL,             -- 元のリンクテキスト（代表値）
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,  -- リンク先ページID（存在する場合）
  link_count INTEGER DEFAULT 0,       -- グループ内のリンク数
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_link_groups_key ON link_groups(key);
CREATE INDEX idx_link_groups_page_id ON link_groups(page_id);

-- リンク出現記録テーブル（新規）
CREATE TABLE link_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_group_id UUID NOT NULL REFERENCES link_groups(id) ON DELETE CASCADE,
  source_page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  position INTEGER,                   -- ページ内での出現位置
  mark_id TEXT NOT NULL,              -- UnifiedLinkMark の markId
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(source_page_id, mark_id)
);

CREATE INDEX idx_link_occurrences_link_group ON link_occurrences(link_group_id);
CREATE INDEX idx_link_occurrences_source_page ON link_occurrences(source_page_id);
```

**既存テーブルの確認:**
```sql
-- page_page_links テーブル（既存）
-- ページ間の直接リンク関係を記録
CREATE TABLE page_page_links (
  page_id UUID REFERENCES pages(id),
  linked_id UUID REFERENCES pages(id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
  PRIMARY KEY (page_id, linked_id)
);
```

**Note:** `page_page_links` テーブルは既に存在するため、これを活用してバックリンク機能を実装します。

---

### 要件2: 多階層リンク構造の認識

#### 2.1 リンク階層の定義

**定義:**
```
リンク階層 = あるページから辿れるリンクの深さ
- 深度0: 自分自身のページ
- 深度1: 直接リンクしているページ
- 深度2: リンク先のリンク先
- ...
```

**例:**
```
ページA: [React]
  ↓ 深度1
ページB (React): [Hooks], [Components]
  ↓ 深度2
ページC (Hooks): [useState], [useEffect]
ページD (Components): [Button], [Input]
  ↓ 深度3
ページE (useState): ...
```

#### 2.2 データ構造

**API レスポンス例:**
```typescript
interface LinkStructure {
  pageId: string;
  title: string;
  depth: number;
  children: LinkStructure[];  // 再帰的
  exists: boolean;
  linkCount: number;  // 同じリンクテキストの出現回数
}
```

#### 2.3 取得ルール

- 最大深度: デフォルト 3階層（パフォーマンス考慮）
- 循環参照の検出: 既に訪問したページは再訪問しない
- キャッシュ: 頻繁にアクセスされるページはキャッシュ

---

### 要件3: ページ詳細画面へのリンク構造表示

#### 3.1 表示セクション

ページ詳細画面の下部に以下のセクションを追加:

```
┌─────────────────────────────────────────┐
│ 📊 リンク構造                            │
├─────────────────────────────────────────┤
│ 📥 このページへのリンク (Backlinks) (5) │
│   - TypeScript入門 (2025-10-25)         │
│   - フロントエンド開発 (2025-10-24)     │
│   - ...                                  │
├─────────────────────────────────────────┤
│ 🔗 同じリンクテキストのページ           │
│                                          │
│   【Hooks】を参照するページ (3)         │
│   - React入門 (2025-10-25)              │
│   - コンポーネント設計 (2025-10-24)     │
│   - ...                                  │
│                                          │
│   【useState】を参照するページ (2)      │
│   - Hooks入門 (2025-10-23)              │
│   - ...                                  │
├─────────────────────────────────────────┤
│ 📤 このページからのリンク (Outbound) (7)│
│   ├─ [Hooks] ✓ (3)                      │
│   │  ├─ [useState] ✓                    │
│   │  └─ [useEffect] ✓                   │
│   ├─ [Components] ✓ (2)                 │
│   └─ [JSX] ✗ (未作成) (1)              │
└─────────────────────────────────────────┘
```

#### 3.2 インタラクティブ機能

1. **折りたたみ**: 各セクションは折りたたみ可能
2. **フィルタリング**: 存在するページのみ/未作成ページのみ表示
3. **ソート**: 最終更新日、リンク数、タイトルでソート可能
4. **クリック操作**:
   - 存在するページ: そのページへ遷移
   - 未作成ページ: 新規ページ作成ダイアログ表示
   - リンクグループ: 同じリンクテキストを持つページ一覧を表示

---

## 🛠️ 技術実装方針

### データベース設計

#### 新規テーブル

1. **`link_groups`** - リンクグループ管理
   - 正規化されたリンクテキストをキーとする
   - リンク先ページIDとの関連を保持
   - グループ内のリンク数をカウント

2. **`link_occurrences`** - リンク出現記録
   - どのページのどの位置にリンクが存在するかを記録
   - UnifiedLinkMark の markId と関連付け

#### 既存テーブルの活用

- **`page_page_links`** - バックリンク機能に使用
- **`pages`** - ページ情報

### API設計

```typescript
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

// ページのバックリンク取得
GET /api/pages/:pageId/backlinks
Response: Array<{
  pageId: string;
  title: string;
  updatedAt: string;
}>

// ページのリンク構造取得（多階層）
GET /api/pages/:pageId/link-structure?depth=3
Response: {
  outbound: LinkStructure[];  // このページからのリンク
  inbound: LinkStructure[];   // このページへのリンク
  linkGroups: Map<string, Array<{
    pageId: string;
    title: string;
    updatedAt: string;
  }>>;
}

// リンクグループ一覧取得（クリック時）
GET /api/link-groups/:key/pages
Response: Array<{
  pageId: string;
  title: string;
  updatedAt: string;
  linkCount: number;  // そのページ内でのリンク出現回数
}>
```

### コンポーネント設計

```
components/page-links/
  ├── BacklinksSection.tsx          // バックリンクセクション
  ├── LinkGroupsSection.tsx         // リンクグループセクション
  ├── OutboundLinksSection.tsx      // アウトバウンドリンクセクション
  ├── LinkStructureView.tsx         // 統合ビュー
  └── LinkGroupModal.tsx            // リンクグループ詳細モーダル
```

### UnifiedLinkMark の拡張

**新規属性:**
```typescript
interface UnifiedLinkAttributes {
  // ... 既存属性
  linkGroupId?: string;  // リンクグループID
  groupState?: 'exists' | 'grouped' | 'missing';  // 新規状態
}
```

**状態判定ロジック:**
```typescript
function determineLinkState(
  key: string,
  pageId: string | null,
  linkCount: number
): 'exists' | 'grouped' | 'missing' {
  if (pageId) return 'exists';
  if (linkCount > 1) return 'grouped';
  return 'missing';
}
```

---

## 📅 実装フェーズ

### Phase 1: リンクグループ基盤 (3日)

**タスク:**
- [ ] データベーススキーマ作成（migration）
  - `link_groups` テーブル
  - `link_occurrences` テーブル
- [ ] リンクグループ管理API実装
  - `POST /api/link-groups` - グループ作成
  - `GET /api/link-groups/:key` - グループ取得
  - `PUT /api/link-groups/:key` - グループ更新
- [ ] UnifiedLinkMark の状態管理拡張
  - `groupState` 属性追加
  - 状態判定ロジック実装

**成果物:**
- マイグレーションファイル
- API実装コード
- 単体テスト

---

### Phase 2: リンクグループ同期機能 (3日)

**タスク:**
- [ ] ページ保存時のリンクグループ同期
  - content_tiptap をパースしてリンクを抽出
  - link_groups, link_occurrences テーブル更新
- [ ] ページ削除時のクリーンアップ
  - link_occurrences からエントリ削除
  - link_groups の link_count 更新
- [ ] バックグラウンドジョブ実装
  - 既存ページのリンクグループ構築

**成果物:**
- 同期処理実装
- バックグラウンドジョブ
- 統合テスト

---

### Phase 3: リンクグループ表示機能 (3日)

**タスク:**
- [ ] CSS スタイル実装
  - `data-state="grouped"` スタイル定義
- [ ] クリックハンドラ拡張
  - grouped 状態のリンククリック時の挙動
- [ ] LinkGroupModal コンポーネント実装
  - 同じリンクテキストのページ一覧表示
  - ページ作成アクション

**成果物:**
- スタイルシート
- モーダルコンポーネント
- E2Eテスト

---

### Phase 4: バックリンク機能 (2日)

**タスク:**
- [ ] バックリンク取得API実装
  - `GET /api/pages/:pageId/backlinks`
- [ ] BacklinksSection コンポーネント実装
  - バックリンク一覧表示
  - ページ遷移機能

**成果物:**
- API実装
- Reactコンポーネント
- 統合テスト

---

### Phase 5: リンクグループセクション (3日)

**タスク:**
- [ ] リンクグループ集約API実装
  - ページ内のリンクテキストごとにグループ化
  - 各グループの参照ページ一覧取得
- [ ] LinkGroupsSection コンポーネント実装
  - リンクテキストごとのセクション表示
  - 折りたたみ機能
  - ソート・フィルタ機能

**成果物:**
- API実装
- Reactコンポーネント
- E2Eテスト

---

### Phase 6: 多階層リンク構造 (4日)

**タスク:**
- [ ] 再帰的リンク取得API実装
  - 深度指定対応
  - 循環参照検出
  - キャッシュ機構
- [ ] OutboundLinksSection コンポーネント実装
  - 階層構造表示（ツリービュー）
  - 折りたたみ機能
  - リンク数バッジ表示
- [ ] LinkStructureView 統合コンポーネント実装

**成果物:**
- API実装
- Reactコンポーネント
- パフォーマンステスト

---

### Phase 7: パフォーマンス最適化 (2日)

**タスク:**
- [ ] データベースインデックス最適化
- [ ] API レスポンスキャッシュ
- [ ] N+1クエリ問題の解決
- [ ] 大量データでの動作確認

**成果物:**
- パフォーマンス改善レポート
- 負荷テスト結果

---

## ✅ 受入基準

### 機能要件

- [ ] 同じリンクテキストを持つリンクが自動的にグループ化される
- [ ] リンク先未作成でもグループ内リンクは青色で表示される
- [ ] リンクグループクリック時にページ一覧が表示される
- [ ] バックリンクセクションが正しく表示される
- [ ] リンクグループセクションが正しく表示される
- [ ] アウトバウンドリンクが階層構造で表示される
- [ ] 最大3階層までのリンク構造が取得できる

### 非機能要件

- [ ] ページ保存時のレスポンスタイムが500ms以内
- [ ] リンク構造取得APIのレスポンスタイムが1秒以内
- [ ] 1000ページ規模でも正常に動作する
- [ ] 循環参照が発生しても無限ループにならない

### テスト要件

- [ ] 単体テストカバレッジ ≥ 80%
- [ ] 統合テストが全てパス
- [ ] E2Eテストが全てパス
- [ ] パフォーマンステストが基準を満たす

---

## 🔗 関連ドキュメント

- [UnifiedLinkMark 実装詳細](../../03_plans/unified-link-mark/)
- [データベーススキーマ](../../../database/schema.sql)
- [TipTap エディタ仕様](../../03_plans/tiptap-editor/)

---

## 📝 備考

### 既存機能への影響

- UnifiedLinkMark の状態管理ロジックが拡張される
- ページ保存処理に同期処理が追加される（パフォーマンス影響に注意）
- データベーステーブルが2つ追加される

### 将来的な拡張

- リンクグラフのビジュアライゼーション（グラフ表示）
- リンクの強度（出現回数）によるランキング表示
- リンク推奨機能（関連ページの自動提案）

---

**最終更新:** 2025-10-26
**作成者:** AI (Claude)
**レビュアー:** -
