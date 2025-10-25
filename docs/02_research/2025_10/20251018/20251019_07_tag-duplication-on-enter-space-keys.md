# タグ入力時の # 重複問題調査

**作成日**: 2025-10-19  
**ステータス**: 🔍 調査中 (デバッグコード追加済み)  
**優先度**: High

---

## 📋 基本情報

**問題概要**: タグ記法（`#テスト`）で Enter キーまたは Space キーを押した時に、`##テスト` と # が重複して表示される

**GitHub Issue**: [#274](https://github.com/otomatty/for-all-learners/issues/274) (該当の issue がない場合は作成予定)

---

## 🔍 問題の詳細

### 現象 1: Enter キー時
- **入力**: `#テスト` + Enter キー
- **期待**: 改行、次の行は通常入力
- **実際**: 同じ行に `##テスト` と表示される（# が重複）

### 現象 2: Space キー時
- **入力**: `#テスト` + Space キー
- **期待**: `#テスト ` で確定、その後通常テキスト入力
- **実際**: `##テスト` に変わる（# が重複）

### 影響範囲

- タグ入力ルール(`tag-rule.ts`)の入力ルール処理
- サジェスション UI のキーボードハンドラー(`suggestion-plugin.ts`)
- ユーザーが # タグを入力できない状態

---

## 🔧 調査結果

### 初期仮説（修正予定だったが未解決）

```
処理フロー(修正前):
1. ユーザーが "#テスト" と入力
2. 前の修正で Enter キー時に suggestion 状態をクリア
3. insertUnifiedLinkWithQuery() が実行される
4. しかし、InputRule が再度トリガーされて重複が発生？
```

### デバッグ方法

デバッグコードを`suggestion-plugin.ts`と`tag-rule.ts`に追加しました。

**デバッグ フラグ**: 両方のファイルで以下の定数を確認
```typescript
const DEBUG_TAG_DUPLICATION = true;
```

### ブラウザでのデバッグ手順

1. **開発サーバー起動**:
   ```bash
   cd /Users/sugaiakimasa/apps/for-all-learners
   bun dev
   ```

2. **ブラウザを開く**:
   - URL: `http://localhost:3000`

3. **デバッグコンソール開く**: F12 キーで DevTools を開く → Console タブ

4. **実際に操作**:
   - エディタに ` #テスト` と入力（先頭に空白必須）
   - Enter キーを押す

5. **コンソール出力の確認**:
   - 以下のような形式のログが表示されます
   ```
   [HH:MM:SS.mmm] [UnifiedLinkMark] [KeyHandler] Enter key pressed | {...}
   [HH:MM:SS.mmm] [UnifiedLinkMark] [KeyHandler] Creating link with input text | {...}
   [HH:MM:SS.mmm] [UnifiedLinkMark] [insertUnifiedLinkWithQuery] Starting insertion | {...}
   [HH:MM:SS.mmm] [TagRule] [handler] Tag InputRule triggered | {...}
   ```

---

## 📊 処理フローのログ出力例

### 期待される処理順序（修正後）

```
1. [KeyHandler] Enter key pressed
   └─ Clears suggestion state immediately
   
2. [insertUnifiedLinkWithQuery] Starting insertion
   └─ Deletes old tag content
   └─ Inserts new link with mark
   └─ Dispatches transaction
   
3. [TagRule] handler should NOT be called
   └─ Because suggestion state was cleared
```

### 実際に観測される処理順序（問題が存在する場合）

```
1. [KeyHandler] Enter key pressed
   └─ Clears suggestion state
   
2. [insertUnifiedLinkWithQuery] Starting insertion
   └─ Inserts "#テスト" with mark
   
3. [TagRule] handler Tag InputRule triggered  ← ここが問題！
   └─ Matches the newly inserted "#テスト"
   └─ Tries to convert it again
   └─ Results in "##テスト"
```

---

## 🔍 デバッグコード情報

### 出力される情報

**KeyHandler ログ**:
- `active`: suggestion が有効か
- `variant`: "bracket" または "tag"
- `query`: 入力中のテキスト（# を除いたもの）
- `selectedIndex`: 選択中のアイテムのインデックス
- `range`: タグの開始・終了位置

**insertUnifiedLinkWithQuery ログ**:
- `from/to`: タグの位置
- `docContent`: 削除前のドキュメント周辺テキスト
- `insertText`: 挿入するテキスト

**TagRule ログ**:
- `match`: マッチした全テキスト
- `raw`: # を除いたタグテキスト
- `range`: マッチした範囲

---

## 📝 次のステップ

### 1. デバッグログ確認
- [ ] ブラウザコンソールでログ出力を確認
- [ ] TagRule が何度実行されるか確認
- [ ] Suggestion 状態のクリアが有効に機能しているか確認

### 2. 原因特定
- [ ] InputRule のトリガータイミング確認
- [ ] トランザクション実行順序の確認
- [ ] ProseMirror の状態管理の確認

### 3. 修正実装
- [ ] 原因に応じた修正コードを実装
- [ ] テスト追加
- [ ] ブラウザで動作確認

---

## 📂 関連ファイル

- `lib/tiptap-extensions/unified-link-mark/plugins/suggestion-plugin.ts` (デバッグコード追加済み)
- `lib/tiptap-extensions/unified-link-mark/input-rules/tag-rule.ts` (デバッグコード追加済み)
- `lib/tiptap-extensions/unified-link-mark/config.ts` (PATTERNS.tag)

---

## 🔗 関連ドキュメント

- 前の修正: `docs/issues/resolved/20251019/20251019_06_tag-suggestion-ui-fix-completion.md`
- タグ機能設計: `docs/03_design/features/tag-link-feature.md` (存在すれば)

---

**最終更新**: 2025-10-19
