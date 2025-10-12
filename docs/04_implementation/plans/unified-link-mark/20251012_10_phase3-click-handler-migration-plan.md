# Phase 3: PageLink Extension 完全削除 実装計画書

**作成日**: 2025-10-12  
**Phase**: 3 - PageLink Extension の完全削除と UnifiedLinkMark への統合  
**目的**: PageLink Extension のクリックハンドラー機能を UnifiedLinkMark に移植し、旧実装を完全に削除

---

## エグゼクティブサマリー

Phase 1-2.1 で suggestionPlugin と bracketPlugin の削除を完了しました。残る課題は **PageLink Extension のクリックハンドラー機能の移植**です。この機能は以下の重要な処理を担っています：

- ブラケットリンククリック処理（ページ検索・遷移）
- 新規ページ作成（クリック時の自動生成）
- .icon 記法処理（ユーザーアイコンリンク）
- 外部リンク処理
- noteSlug 統合（ノートコンテキストでの動作）
- DOM レベルのクリック処理

これらを UnifiedLinkMark に統合することで、**単一の統一された実装**による保守性の向上と、テストカバレッジの完全化を実現します。

---

## 現状分析

### PageLink Extension の残存機能

#### 1. クリックハンドラー (handleClick)

**実装箇所**: `page-link.ts` 行 103-336

**主な処理フロー**:

```
1. クリック位置からブラケット内容を検出
2. parseBracketContent() でリンク種別を判定
   ├─ .icon サフィックス → ユーザーページ遷移
   ├─ https?:// → 外部リンク
   └─ その他 → 内部ページリンク
3. 内部ページリンクの場合:
   ├─ ページ検索 (Supabase)
   ├─ 存在しなければ新規作成
   └─ noteSlug を考慮して適切な URL に遷移
```

**処理詳細**:

```typescript
// ① ブラケット検出ロジック
for (let i = 0; i < text.length; i++) {
  if (text[i] === "[" && !inBracket) {
    bracketStart = i;
    inBracket = true;
    continue;
  }
  if (text[i] === "]" && inBracket) {
    bracketEnd = i;
    if (posInNode >= bracketStart && posInNode <= bracketEnd) {
      bracketContent = text.substring(bracketStart + 1, bracketEnd);
      break;
    }
    inBracket = false;
    bracketStart = -1;
  }
}

// ② .icon 記法処理
if (parsedContent.isIcon) {
  // accounts テーブルから user_slug で検索
  // pages テーブルからユーザーページを取得
  // noteSlug に応じて適切な URL に遷移
}

// ③ 内部リンク処理
// - ページ検索 (title で exact match)
// - 存在しなければページ作成 + note_page_links 関連付け
// - 適切な URL に遷移 (noteSlug 考慮)
```

#### 2. DOM クリックハンドラー (handleDOMEvents.click)

**実装箇所**: `page-link.ts` 行 338-439

**主な処理**:

```typescript
// <a> タグクリックの横取り
if (target.tagName === "A") {
  // data-page-title 属性があれば新規ページ作成
  const newTitle = target.getAttribute("data-page-title");
  if (newTitle) {
    // ページ作成 + note_page_links 関連付け
    // 遷移
  }

  // href 属性があれば通常のナビゲーション
  if (target.hasAttribute("href")) {
    // target="_blank" なら window.open()
    // それ以外は window.location.href
  }
}
```

#### 3. プレビュープラグイン

**実装箇所**: `page-link-preview-mark-plugin.ts` (外部ファイル)

**現状**: PageLink Extension から使用されている

**今後の方針**: UnifiedLinkMark に統合済み（resolver 実装で対応）

### 依存している箇所

#### ① usePageEditorLogic.ts

```typescript
import { PageLink } from "@/lib/tiptap-extensions/page-link";
import { existencePluginKey } from "@/lib/tiptap-extensions/page-link";

extensions: [
  UnifiedLinkMark,
  PageLinkMark,
  PageLink.configure({ noteSlug }), // ← 削除対象
  // ...
];
```

#### ② useLinkExistenceChecker.ts

```typescript
import { existencePluginKey } from "@/lib/tiptap-extensions/page-link";

// existencePluginKey を使ってページ存在確認の状態を設定
const tr = editor.state.tr.setMeta(existencePluginKey, existMap);
```

**課題**: `existencePluginKey` の代替実装が必要

#### ③ rich-content.tsx

```typescript
import { PageLink } from "@/lib/tiptap-extensions/page-link";

const editor = useEditor({
  extensions: [
    // ...
    PageLink, // 読み取り専用エディタでも使用
  ],
  editable: false,
});
```

---

## 移植戦略

### Phase 3 の全体構成

```
Phase 3.1: クリックハンドラー機能の拡張 ⏳
  ├─ ブラケットリンククリック処理の移植
  ├─ .icon 記法サポートの追加
  └─ 外部リンク処理の追加

Phase 3.2: 新規ページ作成機能の統合 ⏳
  ├─ DOM クリックハンドラーの統合
  └─ noteSlug 統合の完全対応

Phase 3.3: existencePluginKey の代替実装 ⏳
  └─ useLinkExistenceChecker の UnifiedLinkMark 対応

Phase 3.4: PageLink Extension の完全削除 ⏳
  ├─ usePageEditorLogic.ts からの削除
  ├─ rich-content.tsx からの削除
  └─ page-link.ts の削除
```

---

## Phase 3.1: クリックハンドラー機能の拡張

### 目的

UnifiedLinkMark の既存 click-handler-plugin を拡張し、PageLink のクリックハンドラー機能を完全に移植する。

### 現状の UnifiedLinkMark click-handler

**既存実装**:

```typescript
// lib/tiptap-extensions/unified-link-mark/plugins/click-handler-plugin.ts
export function createClickHandlerPlugin(context) {
  return new Plugin({
    key: new PluginKey("unifiedLinkClickHandler"),
    props: {
      handleClick: (view, pos, event) => {
        // unilink mark のみを処理
        const unilinkMark = $pos.marks().find(
          (mark) => mark.type.name === "unilink"
        );

        if (attrs.state === "exists" && attrs.pageId) {
          navigateToPage(attrs.pageId);
        } else if (attrs.state === "missing") {
          handleMissingLinkClick(...);
        }
      }
    }
  });
}
```

**制限事項**:

- UnifiedLinkMark のみを処理（ブラケット記法の直接クリックに非対応）
- .icon 記法に非対応
- 外部リンクに非対応
- noteSlug 統合が部分的

### 移植する機能

#### ① ブラケット記法の直接クリック対応

**現状**: PageLink が `[text]` パターンを直接検出してクリック処理

**移植後**: UnifiedLinkMark がブラケット記法も処理

**実装方針**:

```typescript
handleClick: (view, pos, event) => {
  // ① まず unilink mark をチェック
  const unilinkMark = $pos.marks().find((mark) => mark.type.name === "unilink");

  if (unilinkMark) {
    // 既存の処理
    return handleUnilinkMarkClick(unilinkMark.attrs);
  }

  // ② mark がなければブラケット記法を検出（後方互換）
  const bracketContent = detectBracketAtPosition($pos);
  if (bracketContent) {
    return handleBracketClick(bracketContent);
  }

  return false;
};
```

**理由**:

- 既存コンテンツで UnifiedLinkMark に変換されていないブラケットへの対応
- 段階的な移行をサポート

#### ② .icon 記法のサポート

**PageLink の実装**:

```typescript
function parseBracketContent(content: string): BracketContent {
  const iconMatch = content.match(/^(.+)\.icon$/);
  if (iconMatch) {
    return { slug: iconMatch[1], isIcon: true, type: "icon" };
  }
  // ...
}

// .icon の場合:
// 1. accounts テーブルから user_slug で検索
// 2. pages テーブルからユーザーページを取得
// 3. noteSlug に応じて /notes/:slug/:pageId または /pages/:pageId に遷移
```

**移植先**:

- `lib/tiptap-extensions/unified-link-mark/types.ts` に LinkType 追加
- `lib/unilink/resolver.ts` に icon 処理を追加

**新しい型定義**:

```typescript
export type LinkType = "page" | "tag" | "icon" | "external";

export interface UnifiedLinkAttributes {
  markId: string;
  text: string;
  linkType: LinkType; // 追加
  state: "pending" | "exists" | "missing";
  pageId?: string;
  noteSlug?: string;
  userSlug?: string; // .icon 用に追加
}
```

**実装計画**:

```typescript
// lib/unilink/resolver.ts

export async function resolveIconLink(
  userSlug: string,
  noteSlug?: string
): Promise<{ pageId: string; href: string } | null> {
  const supabase = createClient();

  // 1. accounts テーブルから user_slug で検索
  const { data: account } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_slug", userSlug)
    .single();

  if (!account) return null;

  // 2. ユーザーページを取得
  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .eq("user_id", account.id)
    .eq("title", userSlug)
    .single();

  if (!page) return null;

  // 3. noteSlug に応じた URL を生成
  const href = noteSlug
    ? `/notes/${encodeURIComponent(noteSlug)}/${page.id}`
    : `/pages/${page.id}`;

  return { pageId: page.id, href };
}
```

#### ③ 外部リンクのサポート

**PageLink の実装**:

```typescript
if (/^https?:\/\//.test(content)) {
  window.open(content, "_blank");
  return true;
}
```

**移植先**: `click-handler-plugin.ts` に外部リンク判定を追加

**実装計画**:

```typescript
// UnifiedLinkAttributes に external フラグを追加
if (attrs.linkType === "external") {
  window.open(attrs.href, "_blank");
  return true;
}
```

#### ④ noteSlug 統合の完全対応

**現状**: UnifiedLinkMark は noteSlug を部分的にサポート

**移植後**: すべてのリンク種別で noteSlug を考慮

**実装方針**:

```typescript
// navigateToPage() を拡張
export function navigateToPage(
  pageId: string,
  noteSlug?: string,
  isNewPage?: boolean
) {
  const queryParam = isNewPage ? "?newPage=true" : "";

  if (noteSlug) {
    window.location.href = `/notes/${encodeURIComponent(
      noteSlug
    )}/${pageId}${queryParam}`;
  } else {
    window.location.href = `/pages/${pageId}${queryParam}`;
  }
}
```

### テスト戦略

#### テストケース設計

```typescript
describe("UnifiedLinkMark Click Handler", () => {
  describe("Bracket link clicks", () => {
    it("should detect and handle [text] clicks", () => {});
    it("should handle [text] when not yet converted to mark", () => {});
  });

  describe(".icon notation", () => {
    it("should navigate to user page on [user.icon] click", () => {});
    it("should handle [user.icon] with noteSlug context", () => {});
    it("should show error when user not found", () => {});
  });

  describe("External links", () => {
    it("should open external link in new tab", () => {});
    it("should handle [https://example.com] correctly", () => {});
  });

  describe("noteSlug integration", () => {
    it("should navigate to /notes/:slug/:id when noteSlug present", () => {});
    it("should navigate to /pages/:id when noteSlug absent", () => {});
  });
});
```

---

## Phase 3.2: 新規ページ作成機能の統合

### 目的

PageLink の DOM クリックハンドラーを UnifiedLinkMark に統合し、新規ページ作成フローを完全にサポートする。

### 現状の DOM クリックハンドラー

**PageLink の実装**:

```typescript
handleDOMEvents: {
  click(view, event) {
    const target = event.target as HTMLAnchorElement;
    if (target.tagName === "A") {
      // data-page-title 属性があれば新規ページ作成
      const newTitle = target.getAttribute("data-page-title");
      if (newTitle) {
        event.preventDefault();
        // ページ作成処理
        // noteSlug があれば note_page_links に関連付け
        // 遷移
        return true;
      }

      // href 属性があれば通常のナビゲーション
      if (target.hasAttribute("href")) {
        // ...
      }
    }
  }
}
```

### 移植方針

#### ① handleDOMEvents の追加

**実装場所**: `click-handler-plugin.ts`

```typescript
export function createClickHandlerPlugin(context) {
  return new Plugin({
    key: new PluginKey("unifiedLinkClickHandler"),
    props: {
      handleClick: (view, pos, event) => {
        // 既存の処理
      },
      handleDOMEvents: {
        click(view, event) {
          const target = event.target as HTMLAnchorElement;

          if (target.tagName === "A") {
            return handleAnchorClick(target, event, context);
          }

          return false;
        },
      },
    },
  });
}
```

#### ② ページ作成フローの統合

**新規関数**: `lib/unilink/resolver.ts`

```typescript
export async function createPageFromLink(
  title: string,
  userId: string,
  noteSlug?: string
): Promise<{ pageId: string; href: string } | null> {
  const supabase = createClient();

  // 1. ページ作成
  const { data: newPage, error: insertError } = await supabase
    .from("pages")
    .insert({
      user_id: userId,
      title: title,
      content_tiptap: { type: "doc", content: [] },
      is_public: false,
    })
    .select("id")
    .single();

  if (insertError || !newPage) {
    return null;
  }

  // 2. noteSlug があれば note_page_links に関連付け
  if (noteSlug) {
    const { data: note } = await supabase
      .from("notes")
      .select("id")
      .eq("slug", noteSlug)
      .single();

    if (note) {
      await supabase
        .from("note_page_links")
        .insert({ note_id: note.id, page_id: newPage.id });
    }
  }

  // 3. URL 生成
  const href = noteSlug
    ? `/notes/${encodeURIComponent(noteSlug)}/${newPage.id}?newPage=true`
    : `/pages/${newPage.id}?newPage=true`;

  return { pageId: newPage.id, href };
}
```

### テスト戦略

```typescript
describe("DOM Click Handler", () => {
  describe("data-page-title attribute", () => {
    it("should create new page on click", () => {});
    it("should link page to note when noteSlug present", () => {});
    it("should navigate to new page after creation", () => {});
  });

  describe("href attribute", () => {
    it("should handle target='_blank' correctly", () => {});
    it("should navigate to href normally", () => {});
  });
});
```

---

## Phase 3.3: existencePluginKey の代替実装

### 問題点

`useLinkExistenceChecker.ts` が `existencePluginKey` を使用してページ存在確認の状態を設定しています。PageLink Extension 削除後は動作しなくなります。

### 現状の実装

```typescript
// useLinkExistenceChecker.ts
import { existencePluginKey } from "@/lib/tiptap-extensions/page-link";

// 存在確認状態を設定
const tr = editor.state.tr.setMeta(existencePluginKey, existMap);
editor.view.dispatch(tr);
```

### 代替方法

#### Option A: UnifiedLinkMark の resolver 機能を活用

**方針**: useLinkExistenceChecker を削除し、UnifiedLinkMark の自動解決に統合

**利点**:

- 重複コードの削除
- リアルタイム更新との統合
- 一貫した状態管理

**実装**:

- useLinkExistenceChecker.ts を削除
- UnifiedLinkMark の resolver がすべてのリンクを自動解決

#### Option B: 互換性レイヤーの提供

**方針**: UnifiedLinkMark に existencePluginKey 互換の PluginKey をエクスポート

**利点**:

- 最小限の変更
- 既存コードとの互換性

**欠点**:

- 重複した状態管理
- 保守コストの増加

### 推奨: Option A（完全移行）

**理由**:

1. UnifiedLinkMark は既にリアルタイム解決機能を持つ
2. BroadcastChannel によるタブ間同期もサポート
3. 重複コードの削除により保守性が向上
4. Phase 3 の目標（完全統合）に合致

**実装手順**:

1. `usePageEditorLogic.ts` から `useLinkExistenceChecker` の呼び出しを削除
2. `useLinkExistenceChecker.ts` を削除（または archive）
3. UnifiedLinkMark の自動解決で代替

---

## Phase 3.4: PageLink Extension の完全削除

### 削除対象ファイル

1. `lib/tiptap-extensions/page-link.ts` (446 行)
2. `lib/tiptap-extensions/page-link-preview-mark-plugin.ts` (既に UnifiedLinkMark に統合済み)
3. `app/(protected)/pages/[id]/_hooks/useLinkExistenceChecker.ts` (78 行)

### 更新が必要なファイル

#### ① usePageEditorLogic.ts

**Before**:

```typescript
import { PageLink } from "@/lib/tiptap-extensions/page-link";
import { existencePluginKey } from "@/lib/tiptap-extensions/page-link";

extensions: [
  UnifiedLinkMark,
  PageLinkMark,
  PageLink.configure({ noteSlug }), // ← 削除
  // ...
];

// useLinkExistenceChecker の呼び出し
useLinkExistenceChecker(editor, supabase);
```

**After**:

```typescript
// import 削除

extensions: [
  UnifiedLinkMark, // すべてのリンク処理を担当
  PageLinkMark, // 互換性のため残存（Phase 4 で削除）
  // ...
];

// useLinkExistenceChecker 削除（UnifiedLinkMark の自動解決で代替）
```

#### ② rich-content.tsx

**Before**:

```typescript
import { PageLink } from "@/lib/tiptap-extensions/page-link";

const editor = useEditor({
  extensions: [
    StarterKit,
    LinkExtension,
    Image,
    TextAlign,
    Typography,
    PageLink, // ← 削除
    Highlight,
  ],
  editable: false,
  content: processedDoc,
});
```

**After**:

```typescript
// import 削除

const editor = useEditor({
  extensions: [
    StarterKit,
    LinkExtension,
    Image,
    TextAlign,
    Typography,
    UnifiedLinkMark, // ← 追加
    Highlight,
  ],
  editable: false,
  content: processedDoc,
});
```

---

## 段階的実装計画

### Week 1: Phase 3.1 クリックハンドラー拡張

**Day 1-2**:

- [ ] UnifiedLinkAttributes に linkType, userSlug を追加
- [ ] click-handler-plugin にブラケット検出ロジックを追加
- [ ] .icon 記法の resolver 実装
- [ ] 外部リンク処理の実装

**Day 3-4**:

- [ ] テストケースの作成（20 テスト）
- [ ] 動作確認（手動テスト）
- [ ] 既存機能の互換性確認

**Day 5**:

- [ ] コードレビュー
- [ ] ドキュメント更新

### Week 2: Phase 3.2 DOM ハンドラー統合

**Day 1-2**:

- [ ] handleDOMEvents の実装
- [ ] createPageFromLink() 関数の実装
- [ ] noteSlug 統合の完全対応

**Day 3-4**:

- [ ] テストケースの作成（15 テスト）
- [ ] 動作確認
- [ ] エッジケースの処理

**Day 5**:

- [ ] コードレビュー
- [ ] ドキュメント更新

### Week 3: Phase 3.3 existencePluginKey 代替

**Day 1-2**:

- [ ] useLinkExistenceChecker の削除計画
- [ ] UnifiedLinkMark 自動解決での代替確認
- [ ] 互換性テスト

**Day 3**:

- [ ] usePageEditorLogic からの削除
- [ ] rich-content.tsx の更新
- [ ] 動作確認

**Day 4-5**:

- [ ] 統合テスト
- [ ] パフォーマンステスト

### Week 4: Phase 3.4 完全削除

**Day 1-2**:

- [ ] 並行稼働期間の監視結果レビュー
- [ ] 削除前の最終確認
- [ ] バックアップとロールバック計画

**Day 3**:

- [ ] PageLink Extension の削除
- [ ] page-link.ts の削除
- [ ] useLinkExistenceChecker.ts の削除

**Day 4**:

- [ ] すべてのテストの実行（280+ テスト）
- [ ] 手動テストの実施
- [ ] ドキュメント更新

**Day 5**:

- [ ] Phase 3 完了レポート作成
- [ ] Phase 4 への移行準備

---

## リスク評価とマイルストーン

### リスクマトリックス

| リスク                        | 確率 | 影響 | 対策                                      |
| ----------------------------- | ---- | ---- | ----------------------------------------- |
| .icon 記法の動作不良          | 中   | 高   | 専用テスト 10+、段階的ロールアウト        |
| 外部リンク処理の互換性問題    | 低   | 中   | 既存動作の完全再現                        |
| noteSlug 統合の不完全         | 中   | 高   | すべてのリンク種別でテスト                |
| existencePluginKey 削除の影響 | 中   | 高   | 並行稼働期間で UnifiedLinkMark を検証     |
| DOM ハンドラーの動作不良      | 低   | 中   | handleDOMEvents の完全テスト              |
| パフォーマンス劣化            | 低   | 中   | ベンチマークテスト、プロファイリング      |
| 予期しないエッジケース        | 中   | 中   | 広範な E2E テスト、ユーザーフィードバック |

### 成功基準

#### Phase 3.1 完了条件

- [ ] .icon 記法が正常に動作（10 テスト全パス）
- [ ] 外部リンクが正常に動作（5 テスト全パス）
- [ ] ブラケット直接クリックが動作（8 テスト全パス）
- [ ] noteSlug 統合が完全動作（12 テスト全パス）
- [ ] 既存機能との互換性確認

#### Phase 3.2 完了条件

- [ ] DOM クリックハンドラーが動作（10 テスト全パス）
- [ ] 新規ページ作成フローが動作（8 テスト全パス）
- [ ] note_page_links 関連付けが動作（5 テスト全パス）

#### Phase 3.3 完了条件

- [ ] useLinkExistenceChecker 削除完了
- [ ] UnifiedLinkMark 自動解決で代替
- [ ] パフォーマンス劣化なし

#### Phase 3.4 完了条件

- [ ] PageLink Extension 完全削除
- [ ] すべてのテストが成功（280+ テスト）
- [ ] ドキュメント完全更新
- [ ] ロールバック計画が文書化

---

## テスト戦略

### テストカバレッジ目標

| カテゴリ                | テスト数 | 優先度 |
| ----------------------- | -------- | ------ |
| ブラケットクリック      | 8        | 高     |
| .icon 記法              | 10       | 高     |
| 外部リンク              | 5        | 中     |
| DOM ハンドラー          | 10       | 高     |
| ページ作成フロー        | 8        | 高     |
| noteSlug 統合           | 12       | 高     |
| existencePluginKey 代替 | 5        | 中     |
| エッジケース            | 10       | 中     |
| **合計**                | **68**   | -      |

### テスト実装順序

1. **Phase 3.1**: click-handler 拡張（35 テスト）
2. **Phase 3.2**: DOM ハンドラー統合（23 テスト）
3. **Phase 3.3**: existencePluginKey 代替（5 テスト）
4. **Phase 3.4**: 統合テスト（5 テスト）

---

## ロールバック戦略

### Phase 3.1-3.2 のロールバック

**条件**:

- クリックハンドラーの重大な不具合
- .icon 記法の動作不良
- テスト成功率 < 95%

**手順**:

1. feature ブランチを revert
2. PageLink Extension を一時的に復活
3. 問題の特定と修正
4. 再実装

### Phase 3.3-3.4 のロールバック

**条件**:

- 本番環境での重大な不具合
- パフォーマンスの著しい劣化
- 予期しないエッジケース

**手順**:

1. main ブランチを以前の commit に revert
2. 緊急 hotfix の作成
3. 問題の根本原因分析
4. 修正後の段階的再デプロイ

---

## Phase 4 への展望

Phase 3 完了後、以下の Phase 4 を計画します：

### Phase 4.1: PageLinkMark の非推奨化

- PageLinkMark を deprecated としてマーク
- UnifiedLinkMark への完全移行を推奨

### Phase 4.2: レガシーコードの完全削除

- PageLinkMark の削除
- 旧 InputRule の削除
- ドキュメントの最終更新

### Phase 4.3: パフォーマンス最適化

- リンク解決のバッチ処理最適化
- キャッシュ戦略の改善
- BroadcastChannel の最適化

---

## まとめ

Phase 3 は UnifiedLinkMark 移行の**最も重要なフェーズ**です。クリックハンドラー、ページ作成、.icon 記法、外部リンクなど、すべての重要機能を統合します。

**推定工数**: 3-4 週間  
**推定テスト数**: 68 テスト  
**削除コード**: 524 行（page-link.ts 446 行 + useLinkExistenceChecker.ts 78 行）

慎重な段階的実装と広範なテストにより、リスクを最小化しながら、保守性の高い統一実装を実現します。

---

**次のアクション**: Phase 3.1 の実装開始（クリックハンドラー拡張）

**作成日**: 2025-10-12  
**最終更新日**: 2025-10-12  
**ステータス**: 計画完了、実装準備完了
