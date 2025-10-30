# Prism CodeBlock で JSON 言語がサポートされていない問題

**日付**: 2025-10-30  
**重要度**: High  
**カテゴリ**: Bug / Enhancement

## 問題の概要

ページ詳細ページでマークダウンを含むページを表示する際、以下のエラーが発生:

```
Error: The language "json" has no grammar.: "json"
```

## 原因

ページエディター (`usePageEditorLogic.ts`) で使用している `tiptap-extension-code-block-prism` が、JSON などの一部の言語を自動的にサポートしていない。

Prism では、使用する言語を明示的にインポートする必要がある。

## 影響範囲

- ページエディターで JSON、TypeScript、その他のサポートされていない言語のコードブロックを含むマークダウンをペーストすると、エラーが発生して表示が崩れる
- 既存のページで該当言語のコードブロックがある場合、ページの再読み込み時にエラーが発生

## 関連ファイル

- `components/pages/_hooks/usePageEditorLogic.ts` (Prism 使用)
- `lib/tiptap-extensions/code-block.ts` (Shiki 使用 - TipTap エディター)
- `components/CodeBlockComponent.tsx` (Prism 用コンポーネント)

## 解決策の選択肢

### オプション 1: Prism に必要な言語を追加 (推奨)

**メリット**:
- 既存の実装を維持
- バンドルサイズの制御が可能
- 軽量

**デメリット**:
- 新しい言語が必要になるたびに手動で追加が必要
- 設定が煩雑

**実装**:
```typescript
// Prism 言語のインポート
import "prismjs/components/prism-json";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-markdown";
// ... 必要な言語を追加
```

### オプション 2: Shiki に統一 (長期的に推奨)

**メリット**:
- すべての言語を自動サポート
- より優れたシンタックスハイライト
- 一貫性のある実装

**デメリット**:
- バンドルサイズが若干増加
- 既存実装の大幅な変更が必要

**実装**:
- `usePageEditorLogic.ts` で `CustomCodeBlock` (Shiki ベース) を使用
- `CodeBlockComponent.tsx` を Shiki 用に更新
- または既存の `CustomCodeBlock` を再利用

### オプション 3: Prism の Autoloader プラグイン使用

**メリット**:
- 言語を自動的に読み込み
- 手動インポート不要

**デメリット**:
- 初回表示時にネットワークリクエストが発生
- オフライン環境で動作しない可能性

## 推奨アプローチ

**短期的**: ~~オプション 1 を実装し、よく使われる言語をサポート~~
**長期的**: ✅ **オプション 2 を採用** - Shiki に統一

## 実装結果

### ✅ 完了: Shiki への完全移行 (2025-10-30)

**実施内容**:
- [x] `usePageEditorLogic.ts` で Prism から Shiki への移行
- [x] 不要な Prism 言語インポートをすべて削除
- [x] `CustomCodeBlock` (Shiki ベース) を使用
- [x] TypeScript コンパイルエラー解消
- [x] Prism への参照を完全削除

**変更ファイル**:
- `components/pages/_hooks/usePageEditorLogic.ts`

**詳細ログ**:
- `docs/05_logs/2025_10/20251030_01_prism-to-shiki-migration.md`

### 次のステップ (推奨)

- [ ] 手動テストで動作確認
- [ ] Prism 関連パッケージのアンインストール:
  ```bash
  bun remove prismjs tiptap-extension-code-block-prism @types/prismjs
  ```
- [ ] 既存ページの互換性確認

## テストケース

```markdown
# テストページ

## JSON コードブロック
\`\`\`json
{
  "name": "test",
  "value": 123
}
\`\`\`

## TypeScript コードブロック
\`\`\`typescript
const hello: string = "world";
\`\`\`

## サポートされていない言語
\`\`\`fortran
PROGRAM HELLO
PRINT *, "Hello World"
END PROGRAM HELLO
\`\`\`
```

期待される動作:
- JSON と TypeScript は正しくハイライト
- Fortran は plaintext として表示（エラーなし）

## 参考資料

- Prism 公式ドキュメント: https://prismjs.com/#supported-languages
- Shiki 公式ドキュメント: https://shiki.matsu.io/
- tiptap-extension-code-block-prism: https://www.npmjs.com/package/tiptap-extension-code-block-prism
- tiptap-extension-code-block-shiki: https://www.npmjs.com/package/tiptap-extension-code-block-shiki

## 関連ドキュメント

- **実装ログ**: `docs/05_logs/2025_10/20251030_01_prism-to-shiki-migration.md`
- **変更ファイル**: `components/pages/_hooks/usePageEditorLogic.ts`

---

**最終更新**: 2025-10-30
**ステータス**: ✅ Resolved - Shiki への移行完了
