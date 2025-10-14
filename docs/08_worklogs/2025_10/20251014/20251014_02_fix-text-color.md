# 文字色が変わらない問題の修正

**日付**: 2025 年 10 月 14 日  
**作業者**: AI Assistant  
**関連機能**: UnifiedLinkMark - スタイリング

## 問題

bracket-cursor-plugin でリンク化されるものの、文字色が変わらない。

## 原因

1. **初期状態の不一致**

   - bracket-cursor-plugin で作成するマークの `state` が `"resolving"` になっていた
   - globals.css には `data-state="pending"`, `"exists"`, `"missing"` のスタイルしか定義されていない
   - `"resolving"` 状態に対応するスタイルがないため、デフォルトの文字色のまま表示されていた

2. **CSS セレクタの確認**
   ```css
   .ProseMirror a[data-state="pending"] {
     ...;
   }
   .ProseMirror a[data-state="exists"] {
     ...;
   }
   .ProseMirror a[data-state="missing"] {
     ...;
   }
   ```
   - `data-state="resolving"` は定義されていなかった

## 修正内容

### 1. bracket-cursor-plugin.ts の修正

**変更箇所**: マーク作成時の初期状態

```typescript
// 修正前
const mark = newState.schema.marks.unilink.create({
  key,
  raw,
  markId,
  variant: "bracket",
  state: "resolving", // ❌ globals.css に定義されていない
});

// 修正後
const mark = newState.schema.marks.unilink.create({
  key,
  raw,
  markId,
  variant: "bracket",
  state: "pending", // ✅ globals.css で定義されている
});
```

**理由**:

- `"pending"` は「解決待ち」を表す標準的な状態
- globals.css で適切なスタイルが定義されている
- resolver-queue.ts で解決後に `"exists"` または `"missing"` に更新される

### 2. globals.css への互換性スタイル追加

**変更箇所**: `data-state="resolving"` のサポート追加

```css
/* 修正前 */
.ProseMirror a[data-state="pending"] {
  color: #64748b;
  /* ... */
}

/* 修正後 */
.ProseMirror a[data-state="pending"],
.ProseMirror a[data-state="resolving"] {
  color: #64748b;
  /* ... */
}
```

**理由**:

- 将来的に `"resolving"` 状態を使う可能性がある
- 既存コードとの互換性を保つ
- 同じ「解決待ち」の意味なので、同じスタイルを適用

## 状態遷移フロー

```
入力: [テストページ]
  ↓
カーソル移動検出
  ↓
マーク作成: state="pending" ✅ 薄い色 + 点線下線
  ↓
ResolverQueue で解決
  ↓
┌─────────────────┬─────────────────┐
│ ページが存在    │ ページが未作成  │
│ state="exists"  │ state="missing" │
│ 青色 + 実線     │ 赤色 + 波線     │
└─────────────────┴─────────────────┘
```

## 各状態のスタイル

### pending / resolving (解決待ち)

```css
color: #64748b; /* slate-500 - 薄いグレー */
text-decoration: dotted underline; /* 点線下線 */
cursor: progress; /* 進行中カーソル */
```

### exists (既存ページ)

```css
color: #2563eb; /* blue-600 - 青色 */
text-decoration: underline; /* 実線下線 */
```

### missing (未作成ページ)

```css
color: #dc2626; /* red-600 - 赤色 */
text-decoration: wavy underline; /* 波線下線 */
background: #fef2f2; /* red-50 - 淡い赤背景 */
```

## テスト結果

### 期待される動作

1. **`[test]` と入力してカーソル移動**

   - ✅ 即座に薄いグレー色（pending）になる
   - ✅ 点線下線が表示される
   - ✅ カーソルが progress になる

2. **解決後（既存ページの場合）**

   - ✅ 青色（exists）に変わる
   - ✅ 実線下線になる

3. **解決後（未作成ページの場合）**
   - ✅ 赤色（missing）に変わる
   - ✅ 波線下線 + 淡い赤背景になる

## 技術的な詳細

### なぜ state="pending" を使うのか

1. **標準的な命名**

   - "pending" は「処理待ち」を表す一般的な用語
   - Promise の状態（pending, fulfilled, rejected）と整合性がある

2. **既存のスタイル定義**

   - globals.css で既に `data-state="pending"` のスタイルが定義済み
   - PageLinkMark からの移行も考慮されている

3. **明確な意味**
   - "resolving" は「解決中」という進行形
   - "pending" は「解決待ち」という状態
   - 厳密には異なるが、UI 的には同じ扱いで問題ない

### CSS セレクタの優先度

```css
/* 基本スタイル */
.ProseMirror a[data-state] {
  ...;
}

/* 状態別スタイル（より具体的なので優先される） */
.ProseMirror a[data-state="pending"] {
  ...;
}
.ProseMirror a[data-state="exists"] {
  ...;
}
.ProseMirror a[data-state="missing"] {
  ...;
}
```

## 関連ファイル

- `lib/tiptap-extensions/unified-link-mark/plugins/bracket-cursor-plugin.ts`
- `lib/tiptap-extensions/unified-link-mark/resolver-queue.ts`
- `lib/tiptap-extensions/unified-link-mark/state-manager.ts`
- `app/globals.css`

## 関連ドキュメント

- [ブラケットカーソルプラグインの実装](20251014_01_bracket-cursor-plugin.md)
- [UnifiedLinkMark 実装計画](../../04_implementation/plans/unified-link-mark/20251011_07_migration-plan.md)

## 次のステップ

1. **ダークモードのテスト**

   - pending/exists/missing 各状態のダークモード表示を確認

2. **パフォーマンスの確認**

   - 大量のリンクがある場合の動作確認
   - state 変更時のレンダリングパフォーマンス

3. **エラー状態のスタイル**
   - resolver-queue.ts で `state: "error"` を設定している
   - globals.css に `data-state="error"` のスタイルを追加する必要がある

## 学んだこと

### CSS と JavaScript の状態同期

- JavaScript で設定する状態名は、CSS セレクタと完全に一致させる必要がある
- 新しい状態を追加する場合は、CSS スタイルも同時に定義する
- デバッグ時は DevTools の Elements タブで `data-*` 属性を確認

### 状態管理のベストプラクティス

- 初期状態は必ず定義済みの状態にする
- 一時的な状態（resolving など）は既存の状態（pending）で代用できないか検討
- 状態の種類は最小限に保つ

## まとめ

`state: "resolving"` を `state: "pending"` に変更し、globals.css に互換性スタイルを追加することで、リンクの文字色が正しく表示されるようになりました。

修正内容:

- ✅ bracket-cursor-plugin.ts で `state: "pending"` を使用
- ✅ globals.css に `data-state="resolving"` の互換性スタイルを追加
- ✅ 状態遷移フロー: pending → exists/missing が正しく機能

これにより、ユーザーが `[タイトル]` と入力してカーソルを移動すると、即座に薄いグレー色（pending）で表示され、解決後に青色（exists）または赤色（missing）に変わるようになります。
