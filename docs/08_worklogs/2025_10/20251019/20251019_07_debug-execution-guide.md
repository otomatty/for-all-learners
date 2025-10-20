# タグ入力重複問題のデバッグ実行手順

**作成日**: 2025-10-19  
**目的**: ブラウザコンソールでログを確認しながら、# 重複問題を詳細に調査

---

## 🚀 セットアップと実行

### Step 1: 開発サーバー起動

```bash
cd /Users/sugaiakimasa/apps/for-all-learners
bun dev
```

出力例:
```
$ bun dev
  ▲ Next.js 15.1.3
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in 2.1s
```

### Step 2: ブラウザを開く

- URL: `http://localhost:3000`
- ページが読み込まれるまで待機

### Step 3: デバッグコンソール開く

- **Mac**: `Cmd + Option + I` または `Cmd + Shift + C`
- **Windows/Linux**: `F12` または `Ctrl + Shift + I`
- **Console タブ**を選択（デフォルトでは Elements が開いている場合がある）

### Step 4: コンソールをクリアして、ログを見やすくする

```javascript
// コンソールに入力してからEnter
console.clear()
```

---

## 📝 テストシナリオ

### テスト 1: Enter キー（改行後の状態確認）

**手順**:
1. エディタに `This is a test` と入力
2. 改行する（Enter キー）
3. ` #テスト` と入力（**先頭にスペース必須**）
4. **Enter キーを押す**

**コンソール出力を確認**:

```
✅ 期待される出力順序:
[HH:MM:SS] [UnifiedLinkMark] [KeyHandler] Enter key pressed | {
  "active":true,
  "variant":"tag",
  "query":"テスト",
  "selectedIndex":-1,
  "range":{"from":XX,"to":YY}
}
[HH:MM:SS] [UnifiedLinkMark] [KeyHandler] Clearing suggestion state immediately
[HH:MM:SS] [UnifiedLinkMark] [KeyHandler] Creating link with input text | {"query":"テスト"}
[HH:MM:SS] [UnifiedLinkMark] [insertUnifiedLinkWithQuery] Starting insertion | {...}
[HH:MM:SS] [UnifiedLinkMark] [insertUnifiedLinkWithQuery] Deleting old content | {...}
[HH:MM:SS] [UnifiedLinkMark] [insertUnifiedLinkWithQuery] Inserting text with mark | {...}
[HH:MM:SS] [UnifiedLinkMark] [insertUnifiedLinkWithQuery] Dispatching transaction

❌ 問題があれば以下が表示:
[HH:MM:SS] [TagRule] [handler] Tag InputRule triggered | {
  "match":"...",
  "raw":"テスト"
}
[HH:MM:SS] [TagRule] [handler] Processing tag | {...}
[HH:MM:SS] [TagRule] [handler] Chain operations completed
```

**結果の確認**:

| 項目 | 期待値 | 実際 |
|------|--------|------|
| エディタ表示 | `#テスト` | |
| # の数 | 1 個 | |
| TagRule が実行されたか | ❌ いいえ | |
| コンソールにエラーあるか | ❌ いいえ | |

### テスト 2: Space キー（スペース挿入後の状態確認）

**手順**:
1. 新しい段落を開く（Enter キー）
2. ` #テスト2` と入力
3. **Space キーを押す**

**コンソール出力を確認**:

```
✅ 期待される出力順序:
[HH:MM:SS] [UnifiedLinkMark] [KeyHandler] Space key pressed (tag variant) | {...}
[HH:MM:SS] [UnifiedLinkMark] [KeyHandler] Clearing suggestion state immediately
[HH:MM:SS] [UnifiedLinkMark] [insertUnifiedLinkWithSpaceKey] Starting insertion | {...}
[HH:MM:SS] [UnifiedLinkMark] [insertUnifiedLinkWithSpaceKey] Deleting old content | {...}
[HH:MM:SS] [UnifiedLinkMark] [insertUnifiedLinkWithSpaceKey] Inserting text with mark and space | {...}
```

**結果の確認**:

| 項目 | 期待値 | 実際 |
|------|--------|------|
| エディタ表示 | `#テスト2 ` (スペース付き) | |
| # の数 | 1 個 | |
| TagRule が実行されたか | ❌ いいえ | |

---

## 🔍 コンソール出力の解析方法

### ログ情報の読み方

```
[16:45:23.123] [UnifiedLinkMark] [KeyHandler] Enter key pressed | {
  "active":true,
  "variant":"tag",
  "query":"テスト",
  "selectedIndex":-1,
  "range":{"from":15,"to":21}
}
```

| 部分 | 意味 |
|------|------|
| `16:45:23.123` | ログ出力の時刻（HH:MM:SS.mmm）|
| `UnifiedLinkMark` | コンポーネント名 |
| `KeyHandler` | 処理の場所（関数やモジュール）|
| `Enter key pressed` | ログメッセージ |
| `{...}` | デバッグ情報（JSON 形式）|

### 重要なプロパティ

- **`active`**: suggestion UI が表示されているか (`true` / `false`)
- **`variant`**: "tag" または "bracket"
- **`query`**: # を除いたタグテキスト（例: "テスト"）
- **`selectedIndex`**: -1 なら未選択、0 以上なら選択済み
- **`range.from`**: タグ開始位置（# の直後）
- **`range.to`**: タグ終了位置

---

## 📊 処理フローのタイムライン

### 正常な場合

```
Time  Event
────────────────────────────────────────────
 T0   ユーザー Enter キー押下
      ↓
 T1   KeyHandler が Enter イベント受信
      ├─ suggestion state をクリア
      ├─ insertUnifiedLinkWithQuery() 呼び出し
      └─ transaction を dispatch
      ↓
 T2   トランザクション実行完了
      └─ エディタ状態が更新される
      ↓
 T3   新しい行に改行される
      └─ InputRule チェック
      └─ # がないので TagRule は実行されない ✅
```

### 問題がある場合

```
Time  Event
────────────────────────────────────────────
 T0   ユーザー Enter キー押下
      ↓
 T1   KeyHandler が Enter イベント受信
      ├─ suggestion state をクリア
      ├─ insertUnifiedLinkWithQuery() 呼び出し
      └─ transaction を dispatch
      ↓
 T2   トランザクション実行完了
      └─ エディタに "#テスト" が挿入される
      ↓
 T3   新しい行に改行される
      └─ InputRule チェック
      └─ "#テスト" が PATTERNS.tag にマッチ ❌
      └─ TagRule が実行される ❌
      └─ 再度 "#テスト" を処理
      └─ "##テスト" になる ❌
```

---

## 🐛 ログから読み取れる問題

### パターン A: 二重実行（最も可能性が高い）

```
[T1] [KeyHandler] Enter key pressed
[T2] [insertUnifiedLinkWithQuery] Starting insertion
[T3] [insertUnifiedLinkWithQuery] Inserting text with mark | {"insertText":"#テスト"}
[T4] [insertUnifiedLinkWithQuery] Dispatching transaction
[T5] [TagRule] handler Tag InputRule triggered  ← 問題！
     [TagRule] Processing tag | {"raw":"テスト"}
```

**原因の仮説**:
- `dispatch()` 後に InputRule が自動実行されている
- Suggestion 状態のクリアが InputRule の実行を防げていない

**対策**:
- `dispatch()` 前に別の処理が必要
- または InputRule の find パターンの見直し

### パターン B: Suggestion 状態のクリア失敗

```
[T1] [KeyHandler] Enter key pressed | {...,"active":true}
[T2] [insertUnifiedLinkWithQuery] Starting insertion
[T3] [KeyHandler] Clearing suggestion state immediately
[T4] [TagRule] handler Tag InputRule triggered
```

**原因の仮説**:
- Suggestion 状態がクリアされているのに InputRule が実行される
- InputRule は suggestion 状態に依存しない（独立した InputRule）

---

## 💡 追加のデバッグ方法

### ブレークポイント追加

Chrome DevTools の Sources タブで以下のファイルにブレークポイントを設定:

1. `lib/tiptap-extensions/unified-link-mark/plugins/suggestion-plugin.ts`
   - Line: `insertUnifiedLinkWithQuery` 関数の開始行

2. `lib/tiptap-extensions/unified-link-mark/input-rules/tag-rule.ts`
   - Line: `handler` 関数の開始行

ブレークポイント設定後、ステップ実行して処理順序を確認できます。

### DOM 検査

Elements タブでエディタの DOM 構造を確認:

```html
<div contenteditable="true">
  <p>
    <span class="unilink">
      <mark data-variant="tag">#テスト</mark>
    </span>
  </p>
</div>
```

**確認項目**:
- mark が 1 個か 2 個か
- # が 1 個か 2 個か

---

## 📋 チェックリスト

実行時の確認項目:

- [ ] コンソール出力にエラーが表示されていないか
- [ ] `DEBUG_TAG_DUPLICATION = true` が設定されているか
- [ ] タイムスタンプが正しく表示されているか
- [ ] TagRule が実行されているか
- [ ] Suggestion 状態がクリアされているか
- [ ] insertUnifiedLinkWithQuery が呼び出されているか

---

## 🔗 参考

- `docs/issues/open/20251019_07_tag-duplication-on-enter-space-keys.md` - 本問題の概要
- `lib/tiptap-extensions/unified-link-mark/plugins/suggestion-plugin.ts` - デバッグコード

---

**作成日**: 2025-10-19
