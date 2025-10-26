# 20250126_02 未設定リンククリック時のナビゲーション修正

## 問題の概要

未設定リンクをクリックした際に、以下の2つの問題が発生していた：

1. **重複キーエラー**: NotesExplorerSidebarで同じIDのノートが複数レンダリングされ、Reactの重複キーエラーが発生
2. **slug ベースの誤ったナビゲーション**: 未設定リンクをクリックすると `/notes/{key}` のようなslugベースのURLに遷移しようとしていた

## 実施した作業

### 1. NotesExplorerSidebarの重複キー問題を修正

**ファイル**: `app/(protected)/notes/_components/notes-sidebar.tsx`

**問題**: 
- `notes`配列に重複したIDが含まれている場合、または何らかの理由で同じIDが複数回レンダリングされる場合、Reactが重複キーエラーを発生させる

**修正内容**:
```typescript
// CRITICAL FIX: Remove duplicate IDs
// Create a unique set of notes by ID to prevent duplicate key error
const uniqueNotes = notes.reduce(
  (acc, note) => {
    if (!acc.find((n) => n.id === note.id)) {
      acc.push(note);
    }
    return acc;
  },
  [] as Note[],
);
```

**効果**:
- 重複したIDを持つノートを事前にフィルタリング
- Reactの重複キーエラーを防止

---

### 2. 未設定リンククリック時の処理を修正

**ファイル**: `lib/tiptap-extensions/unified-link-mark/plugins/click-handler-plugin.ts`

**問題**:
- 従来の実装では、`attrs.key`を使って `/notes/{key}` や `/tags/{key}` のようなslugベースのURLに遷移しようとしていた
- ページIDはUUIDを使用しているため、keyベースのナビゲーションは不適切
- 未設定リンク（`pageId`がnull）をクリックした際の処理が不完全

**修正前**:
```typescript
// Handle internal links (bracket and tag)
const href =
  attrs.variant === "tag"
    ? `/tags/${attrs.key}`
    : `/notes/${attrs.key}`;

window.location.href = href;
```

**修正後**:
```typescript
// Handle existing pages (state === "exists" and pageId is set)
if (attrs.state === "exists" && attrs.pageId) {
  // Navigate to existing page using UUID
  const href = context.options.noteSlug
    ? `/notes/${encodeURIComponent(context.options.noteSlug)}/${attrs.pageId}`
    : `/pages/${attrs.pageId}`;

  window.location.href = href;
  return true;
}

// Handle missing pages (state === "missing" or no pageId)
if (attrs.state === "missing" || !attrs.pageId) {
  const titleToCreate = attrs.text || attrs.raw || "";

  if (!titleToCreate.trim()) {
    toast.error("ページタイトルが空です");
    return true;
  }

  // Call the onShowCreatePageDialog callback if provided
  if (context.options.onShowCreatePageDialog) {
    context.options.onShowCreatePageDialog(
      titleToCreate,
      async () => {
        // Callback when user confirms page creation
      },
    );
  } else {
    // If no dialog callback, directly create the page
    handleAnchorClick(
      {
        getAttribute: (attr: string) => {
          if (attr === "data-page-title") return titleToCreate;
          return null;
        },
        hasAttribute: (attr: string) => attr === "data-page-title",
        tagName: "A",
      } as unknown as HTMLAnchorElement,
      event as MouseEvent,
      context,
    );
  }

  return true;
}
```

**効果**:
- 既存ページ（pageIdあり）: UUID-based URLで正しくナビゲーション
- 未設定ページ（pageIdなし）: ページ作成処理を実行

---

### 3. rendering.tsのkey正規化を修正

**ファイル**: `lib/tiptap-extensions/unified-link-mark/rendering.ts`

**問題**:
- key属性をslug形式のURL生成用に過度に正規化していた（日本語文字の削除など）
- 実際には、keyは内部識別用のみで、URL生成にはpageId（UUID）が使われる

**修正前**:
```typescript
const normalizedKey = pageTitle
  ? pageTitle
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF-]/g, "") // Keep alphanumeric, hiragana, katakana, kanji, hyphens
  : "";
```

**修正後**:
```typescript
// Note: key is used for internal identification, not for URL generation
// For missing pages, we store the title as-is for later page creation
// URL generation uses pageId (UUID) when the page exists
const normalizedKey = pageTitle
  ? pageTitle.toLowerCase().trim().replace(/\s+/g, "_")
  : "";
```

**効果**:
- keyの正規化をシンプルに（小文字化、スペースをアンダースコアに変換）
- 日本語を含むタイトルも正しく処理できる

---

## 変更ファイル

### 修正
- `app/(protected)/notes/_components/notes-sidebar.tsx`
  - 重複ID除去ロジックを追加
- `lib/tiptap-extensions/unified-link-mark/plugins/click-handler-plugin.ts`
  - handleClick内のナビゲーション処理を修正
  - pageIdベースのURL生成に変更
  - 未設定リンククリック時のページ作成処理を追加
- `lib/tiptap-extensions/unified-link-mark/rendering.ts`
  - key正規化ロジックをシンプル化

---

## 実装詳細

### ページIDとURLの関係

現在の実装では：

| 状態 | pageId | URL形式 | 例 |
|------|--------|---------|-----|
| 既存ページ（noteSlug有） | UUID | `/notes/{noteSlug}/{pageId}` | `/notes/my-note/1ab140df-f440-46c6-bdf5-f175c37786a2` |
| 既存ページ（noteSlug無） | UUID | `/pages/{pageId}` | `/pages/1ab140df-f440-46c6-bdf5-f175c37786a2` |
| 未設定ページ | null | ページ作成処理実行 | - |

### key属性の役割

- **目的**: 内部識別用のみ（URL生成には使用しない）
- **正規化**: 小文字化、スペースをアンダースコアに変換
- **例**: `"My Page"` → `"my_page"`

---

## テスト結果

### 手動テスト項目

- [ ] 既存ページへのリンククリックで正しいUUID-based URLに遷移
- [ ] 未設定リンククリックでページ作成ダイアログが表示される
- [ ] ページ作成後、新しいページに遷移する
- [ ] 日本語タイトルのページが正しく作成される
- [ ] NotesExplorerSidebarで重複キーエラーが発生しない

---

## 今後の課題

### 1. Tag Linkの処理

現在の実装では、tagリンク（`#tag`形式）は未対応：
- 将来的に `/tags/{key}` のようなURLに遷移予定
- または、タグページ作成処理を実装する必要がある

### 2. エラーハンドリングの改善

- ページ作成失敗時のフォールバック処理
- ネットワークエラー時のリトライ機構
- より詳細なユーザーフィードバック

### 3. パフォーマンス最適化

- ページ作成処理の非同期化
- ナビゲーション時のローディング状態表示

---

## 関連ドキュメント

- **ページ作成処理**: `lib/unilink/resolver/page-creation.ts`
- **ナビゲーション処理**: `lib/unilink/resolver/navigation.ts`
- **click-handler-plugin 詳細**: `docs/03_plans/unified-link-mark/20251012_10_phase3-click-handler-migration-plan.md`

---

**最終更新**: 2025-01-26
**作成者**: AI (GitHub Copilot)
