# CustomHeading 実装完了レポート

**日付:** 2025-10-28
**機能:** `#` 記法を H2 見出しに自動変換する実装

---

## 📋 実装概要

ページタイトルとの重複を避けるため、Markdown記法の `#` を H2（レベル2見出し）に自動変換するよう、CustomHeading拡張を修正しました。

### 変換ルール

| Markdown記法 | 変換後    | HTMLタグ |
|--------------|-----------|----------|
| `# text`     | H2見出し  | `<h2>`   |
| `## text`    | H3見出し  | `<h3>`   |
| `### text`   | H4見出し  | `<h4>`   |
| `#### text`  | H5見出し  | `<h5>`   |
| `##### text` | H6見出し  | `<h6>`   |

**重要:** H1（レベル1見出し）はページタイトル専用として確保されています。

---

## ⚙️ 実装詳細

### 修正ファイル

**ファイル:** `lib/tiptap-extensions/custom-heading.ts`

**変更内容:**
1. `addInputRules()` メソッドを追加してデフォルトの入力ルールをオーバーライド
2. `#` の数を見出しレベル - 1 にマッピング
3. 正規表現パターン: `^(#{hashCount})\s$`

### コード変更

```typescript
import { mergeAttributes, textblockTypeInputRule } from "@tiptap/core";
import Heading from "@tiptap/extension-heading";

export const CustomHeading = Heading.extend({
	addInputRules() {
		// Override default heading input rules to shift levels by 1
		// # text -> H2, ## text -> H3, etc.
		// This prevents H1 conflicts with page title while allowing # notation
		return this.options.levels.map((level) => {
			// Map markdown notation to heading level + 1
			// For level 2: match # (1 hash)
			// For level 3: match ## (2 hashes)
			// etc.
			const hashCount = Math.max(1, level - 1);

			return textblockTypeInputRule({
				find: new RegExp(`^(#{${hashCount}})\\s$`),
				type: this.type,
				getAttributes: {
					level,
				},
			});
		});
	},

	renderHTML({ node, HTMLAttributes }) {
		// ... 既存のレンダリング処理
	},
});
```

---

## 🧪 テスト

### テストファイル

**ファイル:** `lib/tiptap-extensions/__tests__/custom-heading.test.ts`

### テストカバレッジ

- ✅ 正規表現パターンの検証（各レベル）
- ✅ テキスト内容の保持
- ✅ HTMLレンダリングの確認
- ✅ 設定レベルの尊重

**テスト結果:**
```
 8 pass
 0 fail
 24 expect() calls
```

---

## 🔍 タグ記法との共存確認

### タグ記法の正規表現

```typescript
tag: /(?<=^|\s)#([a-zA-Z0-9.\-_+=@/::\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\uAC00-\uD7AF]{1,50})(?=\s|$)/u
```

### マッチング比較

| 入力          | タグ記法 | 見出し記法 | 結果                 |
|---------------|----------|------------|----------------------|
| `#tag`        | ✅ Match | ❌ No match | タグリンクとして処理 |
| `# `          | ❌ No match | ✅ Match | H2見出しとして処理   |
| `# text`      | ❌ No match | ✅ Match | H2見出しとして処理   |
| `## text`     | ❌ No match | ✅ Match | H3見出しとして処理   |

**結論:** タグ記法と見出し記法は正しく分離されており、干渉しません。

---

## 📊 動作確認

### ユーザー操作シナリオ

#### シナリオ1: 見出しを作成

```
ユーザー入力: "# " + "大見出し"
     ↓
エディタ表示: [H2] 大見出し
     ↓
HTML出力: <h2 class="text-xl sm:text-2xl md:text-3xl font-bold mt-5 mb-3">大見出し</h2>
```

#### シナリオ2: タグリンクを作成

```
ユーザー入力: "#" + "タグ"
     ↓
エディタ表示: #タグ (リンク表示)
     ↓
UnifiedLinkMark: variant="tag", raw="タグ"
```

#### シナリオ3: スペース後のタグ

```
ユーザー入力: "これは " + "#" + "タグ" + " です"
     ↓
エディタ表示: これは #タグ です (リンク表示)
     ↓
UnifiedLinkMark: variant="tag", raw="タグ"
```

---

## 🎯 実装の利点

### 1. ページタイトルとの重複回避

- H1はページタイトル専用
- 編集エリアでH1が作成されることがない
- セマンティックHTML構造が正しく維持される

### 2. Markdown記法との互換性

- ユーザーは直感的に `#` から見出しを開始できる
- Markdownに慣れたユーザーの学習コストゼロ
- 見出しレベルが1つずれるだけで、他は標準Markdown

### 3. タグ記法との明確な分離

- `#tag` (スペースなし) → タグリンク
- `# text` (スペースあり) → 見出し
- ユーザーの混乱を防ぐ

---

## 🚀 今後の対応

### 動作確認

1. **ブラウザでの手動テスト**
   - 実際のエディタで `# text` を入力してH2に変換されるか確認
   - `#tag` がタグリンクとして正しく動作するか確認

2. **既存機能への影響確認**
   - 保存・読み込みが正常に動作するか
   - H1削除処理（`removeH1Headings`）に影響がないか

### ドキュメント更新

- [ ] ユーザーマニュアルに見出し記法の説明を追加
- [ ] 開発者ドキュメントにCustomHeadingの実装詳細を記載

---

## 📝 変更ファイル一覧

1. **修正ファイル**
   - `lib/tiptap-extensions/custom-heading.ts`

2. **新規テストファイル**
   - `lib/tiptap-extensions/__tests__/custom-heading.test.ts`

3. **関連ファイル（変更なし）**
   - `lib/tiptap-extensions/unified-link-mark/input-rules/tag-rule.ts`
   - `lib/tiptap-extensions/unified-link-mark/config.ts`

---

## ✅ チェックリスト

- [x] CustomHeading の addInputRules() 実装
- [x] テストケース作成
- [x] テスト実行・パス確認
- [x] タグ記法との干渉確認
- [x] 既存テストスイート実行（496 pass, 6 fail - 既存問題）
- [ ] ブラウザでの手動テスト
- [ ] ドキュメント更新

---

**実装者:** AI (Claude)
**レビュー待ち:** 手動テストと動作確認
