# Resolver.ts リファクタリング計画書

**作成日**: 2025-10-12  
**目的**: resolver.ts (486 行) を責務ごとに分割し、保守性・テスタビリティを向上させる  
**タイミング**: Phase 3.2 完了後、Phase 3.3 実施前

---

## エグゼクティブサマリー

現在の `lib/unilink/resolver.ts` は 486 行に達し、以下の複数の責務を持っています：

- ページ作成（2 種類の作成フロー）
- マーク操作（TipTap Editor）
- ナビゲーション処理
- リンク種別判定・処理（Icon, External, Page）
- BroadcastChannel 管理
- バッチ処理（将来用）

このリファクタリングにより、各ファイルを **100-150 行以内** に保ち、単一責任原則に従った構造に再編成します。既存の import パスとの **完全な後方互換性** を維持しながら、段階的に移行します。

---

## 現状分析

### ファイル構成（Before）

```
lib/unilink/
├── resolver.ts (486行) ← 分割対象
├── broadcast-channel.ts
├── utils.ts
├── index.ts
└── __tests__/
    ├── resolver.test.ts
    └── resolver-phase3.test.ts
```

### 責務の分類

| カテゴリ       | 関数数 | 行数 | 複雑度 |
| -------------- | ------ | ---- | ------ |
| ページ作成     | 2      | ~180 | 高     |
| マーク操作     | 2      | ~80  | 中     |
| ナビゲーション | 2      | ~60  | 低     |
| リンク処理     | 5      | ~140 | 中     |
| Broadcast      | 1      | ~20  | 低     |
| その他         | 1      | ~10  | 低     |

### 問題点

1. **可読性の低下**: 1 ファイルに複数の責務が混在
2. **テストの肥大化**: resolver のテストが複雑
3. **変更の影響範囲**: 1 つの変更が広範囲に影響
4. **新機能追加の困難**: どこに追加すべきか不明確
5. **再利用性の低下**: 関数の依存関係が複雑

---

## リファクタリング後の構成

### ファイル構成（After）

```
lib/unilink/
├── resolver/                      ← 新規ディレクトリ
│   ├── index.ts                  # Public API (re-exports)
│   ├── page-creation.ts          # ページ作成ロジック (~150行)
│   ├── navigation.ts             # ナビゲーション処理 (~80行)
│   ├── link-types.ts             # リンク種別判定・処理 (~120行)
│   ├── mark-operations.ts        # マーク操作 (~60行)
│   └── broadcast.ts              # BroadcastChannel管理 (~40行)
├── broadcast-channel.ts          # 既存（変更なし）
├── utils.ts                      # 既存（変更なし）
├── index.ts                      # 既存（更新: resolver/index への参照追加）
└── __tests__/
    ├── resolver/                 ← 新規ディレクトリ
    │   ├── page-creation.test.ts
    │   ├── navigation.test.ts
    │   ├── link-types.test.ts
    │   ├── mark-operations.test.ts
    │   └── broadcast.test.ts
    ├── resolver.test.ts          # 既存（段階的に移行）
    └── resolver-phase3.test.ts   # 既存（段階的に移行）
```

---

## 各ファイルの詳細設計

### 1. `resolver/page-creation.ts` (~150 行)

**責務**: ページ作成に関するすべてのロジック

**Exports**:

```typescript
/**
 * missing状態のマークからページを作成
 * TipTap Editor 内でのページ作成フロー
 */
export async function createPageFromMark(
  editor: Editor,
  markId: string,
  title: string,
  userId?: string,
  noteSlug?: string
): Promise<string | null>;

/**
 * DOM clickハンドラーから新規ページを作成
 * data-page-title属性を持つ<a>タグからの作成フロー
 */
export async function createPageFromLink(
  title: string,
  userId: string,
  noteSlug?: string | null
): Promise<{ pageId: string; href: string } | null>;
```

**内部ヘルパー**:

```typescript
/**
 * タイトルのアンダースコアをスペースに変換
 * "My_Page" → "My Page"
 */
function convertTitle(title: string): string;

/**
 * ページを note_page_links テーブルに関連付け
 * 将来的に共通化
 */
async function linkPageToNote(
  pageId: string,
  noteSlug: string
): Promise<boolean>;
```

**依存関係**:

- `@/app/_actions/pages` (createPage)
- `sonner` (toast)
- `@tiptap/core` (Editor)
- `./broadcast` (notifyPageCreated)
- `./mark-operations` (updateMarkToExists)
- `../utils` (normalizeTitleToKey)

**特徴**:

- ページ作成の 2 つのフローを統一的に管理
- note_page_links の関連付けロジックを共通化
- エラーハンドリングの一元化

---

### 2. `resolver/navigation.ts` (~80 行)

**責務**: ナビゲーション処理

**Exports**:

```typescript
/**
 * 指定されたページIDにナビゲーション
 * シンプルな /pages/:id への遷移
 */
export function navigateToPage(pageId: string): void;

/**
 * noteSlugを考慮した統一的なナビゲーション
 * /notes/:slug/:id または /pages/:id
 */
export function navigateToPageWithContext(
  pageId: string,
  noteSlug?: string | null,
  isNewPage?: boolean
): void;
```

**内部ヘルパー**:

```typescript
/**
 * ページURLを生成
 * 将来的にクエリパラメータの拡張に対応
 */
function generatePageUrl(
  pageId: string,
  noteSlug?: string | null,
  queryParams?: Record<string, string>
): string;
```

**依存関係**:

- `sonner` (toast)

**特徴**:

- URL 生成ロジックの一元化
- encodeURIComponent の適切な使用
- エラーハンドリング

---

### 3. `resolver/link-types.ts` (~120 行)

**責務**: リンク種別判定と処理

**Exports**:

```typescript
/**
 * .icon記法のユーザーリンクを解決
 * [username.icon] → ユーザーページに遷移
 */
export async function resolveIconLink(
  userSlug: string,
  noteSlug?: string | null
): Promise<{ pageId: string; href: string } | null>;

/**
 * ブラケット内容を解析してリンク種別を判定
 * Phase 3.1: .icon サフィックスと外部リンクの検出
 */
export function parseBracketContent(content: string): BracketContent;

/**
 * 外部リンクかどうかを判定
 * https:// または http:// で始まるか
 */
export function isExternalLink(text: string): boolean;

/**
 * 外部リンクを新規タブで開く
 * noopener, noreferrer 属性付与
 */
export function openExternalLink(url: string): void;

/**
 * missing状態のリンククリック時の処理
 * ダイアログ表示はコールバックで委譲
 */
export async function handleMissingLinkClick(
  editor: Editor,
  markId: string,
  title: string,
  userId?: string,
  onShowDialog?: (title: string, onConfirm: () => Promise<void>) => void
): Promise<void>;
```

**型定義**:

```typescript
/**
 * ブラケット内容の解析結果
 */
export interface BracketContent {
  type: "page" | "icon" | "external";
  slug: string;
  isIcon: boolean;
  userSlug?: string;
}
```

**依存関係**:

- `sonner` (toast)
- `@tiptap/core` (Editor)
- `./page-creation` (createPageFromMark)
- `./navigation` (navigateToPage)

**特徴**:

- リンク種別ごとの処理を分離
- 型安全な BracketContent インターフェース
- 外部リンクの安全な処理

---

### 4. `resolver/mark-operations.ts` (~60 行)

**責務**: TipTap マーク操作

**Exports**:

```typescript
/**
 * マークをexists状態に更新
 * ページ作成後の状態遷移
 */
export async function updateMarkToExists(
  editor: Editor,
  markId: string,
  pageId: string,
  title: string
): Promise<void>;

/**
 * 複数マークの一括解決
 * 将来のバッチ処理用（現在はプレースホルダー）
 */
export async function batchResolveMarks(
  editor: Editor,
  markIds: string[]
): Promise<void>;
```

**内部ヘルパー**:

```typescript
/**
 * markIdでマークを検索
 * 将来的に最適化
 */
function findMarkById(
  doc: Node,
  markId: string
): { node: Node; pos: number; mark: Mark } | null;

/**
 * マーク属性を更新
 * トランザクションの適用
 */
function applyMarkUpdate(
  tr: Transaction,
  pos: number,
  length: number,
  markType: MarkType,
  oldMark: Mark,
  newAttrs: UnifiedLinkAttributes
): void;
```

**依存関係**:

- `@tiptap/core` (Editor)
- `prosemirror-model` (Node, Mark)
- `../tiptap-extensions/unified-link-mark` (UnifiedLinkAttributes)

**特徴**:

- ProseMirror のトランザクション処理
- エラーハンドリング
- 将来のバッチ処理への拡張性

---

### 5. `resolver/broadcast.ts` (~40 行)

**責務**: BroadcastChannel のシングルトン管理

**Exports**:

```typescript
/**
 * BroadcastChannelインスタンスを取得（シングルトン）
 * 遅延初期化パターン
 */
export function getBroadcastChannel(): UnilinkBroadcastChannel;

/**
 * ページ作成を他タブに通知
 * key: 正規化されたタイトル, pageId: 作成されたページID
 */
export function notifyPageCreated(key: string, pageId: string): void;

/**
 * ページ更新を他タブに通知
 * 将来用（現在は未実装）
 */
export function notifyPageUpdated(key: string, pageId: string): void;
```

**内部状態**:

```typescript
/**
 * グローバルBroadcastChannelインスタンス（シングルトン）
 */
let broadcastChannel: UnilinkBroadcastChannel | null = null;
```

**依存関係**:

- `../broadcast-channel` (UnilinkBroadcastChannel)

**特徴**:

- シングルトンパターンの実装
- Lazy initialization
- 将来の拡張への対応

---

### 6. `resolver/index.ts` (新規作成)

**責務**: 公開 API の re-export

```typescript
/**
 * Resolver モジュールの公開API
 * 後方互換性を維持しながら、各機能モジュールを統合
 */

// Page creation
export { createPageFromMark, createPageFromLink } from "./page-creation";

// Navigation
export { navigateToPage, navigateToPageWithContext } from "./navigation";

// Link types
export {
  resolveIconLink,
  parseBracketContent,
  isExternalLink,
  openExternalLink,
  handleMissingLinkClick,
  type BracketContent,
} from "./link-types";

// Mark operations
export { updateMarkToExists, batchResolveMarks } from "./mark-operations";

// Broadcast
export {
  getBroadcastChannel,
  notifyPageCreated,
  notifyPageUpdated,
} from "./broadcast";
```

**特徴**:

- すべての公開関数を re-export
- 型定義も export
- 既存の import パスとの互換性維持

---

## 段階的移行計画

### Phase R1: ファイル分割と基本構造 (2-3 時間)

**目標**: 新しいディレクトリ構造を作成し、関数を移動

**ステップ**:

1. **ディレクトリ作成**

   ```bash
   mkdir -p lib/unilink/resolver
   mkdir -p lib/unilink/__tests__/resolver
   ```

2. **ファイル作成と関数移動**

   - `resolver/page-creation.ts` を作成

     - createPageFromMark を移動
     - createPageFromLink を移動
     - 内部ヘルパーを実装

   - `resolver/navigation.ts` を作成

     - navigateToPage を移動
     - navigateToPageWithContext を移動

   - `resolver/link-types.ts` を作成

     - resolveIconLink を移動
     - parseBracketContent を移動
     - isExternalLink を移動
     - openExternalLink を移動
     - handleMissingLinkClick を移動

   - `resolver/mark-operations.ts` を作成

     - updateMarkToExists を移動
     - batchResolveMarks を移動

   - `resolver/broadcast.ts` を作成
     - getBroadcastChannel を移動
     - notifyPageCreated を実装

3. **Index ファイル作成**

   - `resolver/index.ts` を作成
   - すべての関数を re-export

4. **Import パス更新**
   - `lib/unilink/index.ts` を更新
   - `resolver/index` からの re-export を追加

**検証**:

```bash
# 既存のテストがすべてパスすることを確認
bun test lib/unilink/__tests__/resolver.test.ts
bun test lib/unilink/__tests__/resolver-phase3.test.ts

# 既存の import が動作することを確認
bun test lib/tiptap-extensions/unified-link-mark/
```

**完了条件**:

- [ ] すべての新ファイルが作成されている
- [ ] 既存のテストがすべてパス (188/188)
- [ ] TypeScript のコンパイルエラーがない
- [ ] Import パスが正しく解決される

---

### Phase R2: テスト分割 (2-3 時間)

**目標**: 各モジュールごとにテストを分割

**ステップ**:

1. **テストファイル作成**

   - `__tests__/resolver/page-creation.test.ts`

     - createPageFromMark のテスト (~30 tests)
     - createPageFromLink のテスト (~20 tests)

   - `__tests__/resolver/navigation.test.ts`

     - navigateToPage のテスト (~5 tests)
     - navigateToPageWithContext のテスト (~10 tests)

   - `__tests__/resolver/link-types.test.ts`

     - resolveIconLink のテスト (~15 tests)
     - parseBracketContent のテスト (~10 tests)
     - isExternalLink のテスト (~8 tests)
     - openExternalLink のテスト (~5 tests)
     - handleMissingLinkClick のテスト (~10 tests)

   - `__tests__/resolver/mark-operations.test.ts`

     - updateMarkToExists のテスト (~10 tests)
     - batchResolveMarks のテスト (~5 tests)

   - `__tests__/resolver/broadcast.test.ts`
     - getBroadcastChannel のテスト (~5 tests)
     - notifyPageCreated のテスト (~5 tests)

2. **既存テストの移行**

   - resolver.test.ts から関連テストを抽出
   - resolver-phase3.test.ts から関連テストを抽出
   - 重複を削除

3. **テストの実行と検証**
   ```bash
   bun test lib/unilink/__tests__/resolver/
   ```

**完了条件**:

- [ ] すべての新テストファイルが作成されている
- [ ] テスト総数が維持されている (~90 tests)
- [ ] すべてのテストがパス
- [ ] カバレッジが低下していない

---

### Phase R3: 既存ファイルのクリーンアップ (1 時間)

**目標**: 旧 resolver.ts を削除し、ドキュメントを更新

**ステップ**:

1. **旧ファイルの削除**

   ```bash
   # resolver.ts をバックアップ
   mv lib/unilink/resolver.ts lib/unilink/resolver.ts.backup

   # 動作確認後に削除
   rm lib/unilink/resolver.ts.backup
   ```

2. **旧テストファイルの整理**

   - resolver.test.ts を削除または archive
   - resolver-phase3.test.ts を削除または archive

3. **ドキュメント更新**
   - README.md の更新（ファイル構成）
   - CHANGELOG.md にリファクタリングを記録
   - JSDoc コメントの見直し

**完了条件**:

- [ ] 旧 resolver.ts が削除されている
- [ ] すべてのテストがパス
- [ ] ドキュメントが更新されている
- [ ] 既存機能に影響がない

---

### Phase R4: Import パス最適化（オプション）

**目標**: 直接 import に変更し、tree-shaking を最適化

**ステップ**:

1. **Import パスの変更**

   ```typescript
   // Before
   import { createPageFromMark } from "@/lib/unilink/resolver";

   // After (optional)
   import { createPageFromMark } from "@/lib/unilink/resolver/page-creation";
   ```

2. **Bundle サイズの測定**
   - リファクタリング前後の比較
   - Tree-shaking の効果を確認

**完了条件**:

- [ ] 必要に応じて import パスを最適化
- [ ] Bundle サイズが改善されている

---

## 依存関係マップ

```
resolver/
├── page-creation.ts
│   ├─→ broadcast.ts (notifyPageCreated)
│   ├─→ mark-operations.ts (updateMarkToExists)
│   └─→ ../utils.ts (normalizeTitleToKey)
│
├── navigation.ts
│   └─→ (external only: sonner)
│
├── link-types.ts
│   ├─→ page-creation.ts (createPageFromMark)
│   └─→ navigation.ts (navigateToPage)
│
├── mark-operations.ts
│   └─→ (external only: @tiptap/core, prosemirror-*)
│
└── broadcast.ts
    └─→ ../broadcast-channel.ts
```

**循環依存の回避**:

- page-creation → mark-operations ✅
- link-types → page-creation ✅
- mark-operations → page-creation ❌ (避ける)

---

## テスト戦略

### 単体テスト

各モジュールごとに独立したテスト:

```typescript
// __tests__/resolver/page-creation.test.ts
describe("createPageFromMark", () => {
  it("should create page with correct title", () => {});
  it("should link page to note when noteSlug provided", () => {});
  it("should update mark to exists state", () => {});
  it("should notify other tabs via broadcast", () => {});
  it("should handle errors gracefully", () => {});
});
```

### 統合テスト

複数モジュール間の連携テスト:

```typescript
// __tests__/resolver/integration.test.ts
describe("Resolver Integration", () => {
  it("should create page and navigate", () => {
    // page-creation + navigation
  });

  it("should handle missing link click flow", () => {
    // link-types + page-creation + navigation
  });
});
```

### テストカバレッジ目標

| モジュール         | 目標カバレッジ |
| ------------------ | -------------- |
| page-creation.ts   | 90%+           |
| navigation.ts      | 95%+           |
| link-types.ts      | 90%+           |
| mark-operations.ts | 85%+           |
| broadcast.ts       | 90%+           |

---

## リスク評価

### リスクマトリックス

| リスク             | 確率 | 影響 | 対策                        |
| ------------------ | ---- | ---- | --------------------------- |
| Import パスの破損  | 中   | 高   | 段階的移行、後方互換性維持  |
| テストの失敗       | 低   | 高   | Phase R1 で既存テストを実行 |
| 循環依存の発生     | 低   | 中   | 依存関係マップで事前確認    |
| パフォーマンス劣化 | 低   | 低   | Bundle サイズの計測         |
| 新機能との競合     | 中   | 中   | Phase 3.3 前に完了          |

### ロールバック計画

各 Phase ごとに Git commit を作成:

```bash
git commit -m "refactor(resolver): Phase R1 - Create new file structure"
git commit -m "refactor(resolver): Phase R2 - Split tests"
git commit -m "refactor(resolver): Phase R3 - Cleanup old files"
```

問題発生時:

```bash
git revert <commit-hash>
```

---

## 成功基準

### Phase R1 完了条件

- [ ] すべての新ファイルが作成されている
- [ ] 既存のテストがすべてパス (188/188)
- [ ] TypeScript のコンパイルエラーがない
- [ ] Import パスが正しく解決される
- [ ] 既存機能に影響がない

### Phase R2 完了条件

- [ ] すべての新テストファイルが作成されている
- [ ] テスト総数が維持されている (~90 tests)
- [ ] すべてのテストがパス
- [ ] カバレッジが低下していない

### Phase R3 完了条件

- [ ] 旧 resolver.ts が削除されている
- [ ] すべてのテストがパス
- [ ] ドキュメントが更新されている
- [ ] コードレビュー完了

### 全体の成功基準

- [ ] すべてのテストがパス (188/188)
- [ ] TypeScript エラー 0 件
- [ ] 既存機能の動作に変化がない
- [ ] 各ファイルが 150 行以内
- [ ] Import パスの後方互換性が維持されている
- [ ] ドキュメントが更新されている

---

## スケジュール

### 推奨タイムライン

- **Phase R1**: 2-3 時間
- **Phase R2**: 2-3 時間
- **Phase R3**: 1 時間
- **Phase R4** (Optional): 1 時間

**合計**: 5-7 時間 (Phase R4 を含めると 6-8 時間)

### マイルストーン

1. **Day 1 午前**: Phase R1 開始・完了
2. **Day 1 午後**: Phase R2 開始・完了
3. **Day 2 午前**: Phase R3 完了、レビュー
4. **Day 2 午後**: ドキュメント更新、Phase 3.3 開始準備

---

## 期待される効果

### 保守性の向上

- **Before**: 486 行の巨大ファイル、変更の影響範囲が不明確
- **After**: 各ファイル 100-150 行、変更の影響範囲が限定的

### テスタビリティの向上

- **Before**: resolver.test.ts が複雑、デバッグが困難
- **After**: 機能ごとに独立したテスト、デバッグが容易

### 開発速度の向上

- **Before**: どこに追加すべきか不明確、コンフリクトが頻発
- **After**: 追加すべき場所が明確、コンフリクトが減少

### コードレビューの改善

- **Before**: 大きな変更、レビューに時間がかかる
- **After**: 小さな変更、レビューが迅速

---

## 次のステップ

リファクタリング完了後:

1. **Phase 3.3 の実装**: existencePluginKey の置き換え
2. **Phase 3.4 の実装**: PageLink Extension の完全削除
3. **パフォーマンステスト**: 大量リンクでの負荷確認
4. **ドキュメント整備**: 最終的な API ドキュメント

---

## 関連ドキュメント

- [Phase 3 実装計画](./20251012_10_phase3-click-handler-migration-plan.md)
- [Phase 3.1 実装完了ログ](../../../08_worklogs/2025_10/20251012/20251012_11_phase3.1-implementation-complete.md)
- [Phase 3.2 実装完了ログ](../../../08_worklogs/2025_10/20251012/20251012_12_phase3.2-implementation-complete.md)

---

## 承認とレビュー

- **作成者**: AI Assistant
- **レビュー者**: (TBD)
- **承認日**: (TBD)
- **実装開始日**: 2025-10-12（予定）

---

**作成日**: 2025-10-12  
**最終更新日**: 2025-10-12  
**ステータス**: 計画完了、実装準備完了 ✅
