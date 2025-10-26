# タグリンク機能の修正実装ログ

**日付**: 2025-10-26  
**担当**: AI (GitHub Copilot)  
**Issue**: タグ機能で`#aaa`と入力すると`#a`までがリンクとして認識され、それ以降の`aa`は認識されない

---

## 🎯 実装した修正

### 根本原因の特定

ユーザー提供のログから根本原因が判明しました：

```
tag-rule.ts:36 {matchFull: '#a', matchCaptured: 'a', ...}     ← #a でリンク作成
tag-rule.ts:36 {matchFull: '#aa', matchCaptured: 'aa', ...}   ← #aa を検出するが...
tag-rule.ts:36 {from: 3, to: 5, ...}                          ← 既存マークがあるため抑制
tag-rule.ts:36 {matchFull: '#aaa', matchCaptured: 'aaa', ...} ← #aaa を検出するが...
tag-rule.ts:36 {from: 3, to: 6, ...}                          ← 既存マークがあるため抑制
```

**問題点**:
1. `#a` 入力時にInputRuleが発火してリンクが作成される
2. `#aa`、`#aaa` 入力時にもInputRuleが発火するが、既存マークチェックにより抑制される
3. 既存マークチェックが「同じ範囲にマークがあるか」のみをチェックし、**長さの比較をしていなかった**

### 修正内容

**ファイル**: `lib/tiptap-extensions/unified-link-mark/input-rules/tag-rule.ts`

**変更前**:
```typescript
// CRITICAL: Check if the range already has this mark
let hasExistingMark = false;
state.doc.nodesBetween(from, to, (node) => {
  if (node.isText && node.marks.some((m) => m.type === markType)) {
    hasExistingMark = true;
    return false;
  }
});

if (hasExistingMark) {
  debugLog("SKIP", "mark already exists on this range", { from, to });
  return;
}
```

**変更後**:
```typescript
// Extract the raw tag text first
const raw = match[1];

// CRITICAL: Check if the range already has this mark
// If a mark exists, compare lengths and replace if new match is longer
type ExistingMarkInfo = { from: number; to: number; raw: string };
let existingMarkInfo: ExistingMarkInfo | null = null;
state.doc.nodesBetween(from, to, (node, pos) => {
  if (node.isText && node.marks.some((m) => m.type === markType)) {
    const mark = node.marks.find((m) => m.type === markType);
    if (mark) {
      existingMarkInfo = {
        from: pos,
        to: pos + node.nodeSize,
        raw: mark.attrs.raw || "",
      };
      return false; // Stop traversal
    }
  }
});

if (existingMarkInfo !== null) {
  const newLength = raw.length;
  const existingInfo: ExistingMarkInfo = existingMarkInfo;
  const existingLength = existingInfo.raw.length;

  if (newLength <= existingLength) {
    // New match is same or shorter - skip
    debugLog("SKIP", "existing mark is same or longer", {
      existing: existingInfo,
      newRaw: raw,
      newLength,
      existingLength,
    });
    return;
  }

  // New match is longer - remove existing mark and apply new one
  debugLog("REPLACE", "replacing shorter mark with longer one", {
    existing: existingInfo,
    newRaw: raw,
    newLength,
    existingLength,
  });

  chain()
    .focus()
    .deleteRange({ from: existingInfo.from, to: existingInfo.to })
    .run();
}
```

### 主な変更点

1. **`raw` の早期抽出**: 既存マークチェックの前に `raw = match[1]` を抽出
2. **既存マーク情報の取得**: 既存マークの位置と `raw` 属性を取得
3. **長さの比較**: 新しいマッチが既存マークより長い場合のみ処理を続行
4. **既存マークの削除**: 新しいマッチの方が長い場合、既存マークを削除してから新しいマークを適用

### 期待される動作

```
ユーザーが "#" を入力
  ↓ InputRule: マッチせず

ユーザーが "a" を追加 (#a)
  ↓ InputRule: マッチ
  ↓ 既存マークなし → リンク作成 (raw="a")

ユーザーが "a" を追加 (#aa)
  ↓ InputRule: マッチ (raw="aa")
  ↓ 既存マークあり (raw="a")
  ↓ 新しい方が長い (2 > 1)
  ↓ 既存マーク削除 → 新しいリンク作成 (raw="aa")

ユーザーが "a" を追加 (#aaa)
  ↓ InputRule: マッチ (raw="aaa")
  ↓ 既存マークあり (raw="aa")
  ↓ 新しい方が長い (3 > 2)
  ↓ 既存マーク削除 → 新しいリンク作成 (raw="aaa")
```

---

## ✅ テスト結果

### ユニットテスト

```bash
npm test -- lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/tag-rule.test.ts
```

**結果**: ✅ 28 tests passed (28)

すべてのテストがパスし、既存の機能に影響がないことを確認しました。

---

## 🔍 次のステップ: 実機テスト

### 実施予定の検証

1. **開発サーバーを起動**
   ```bash
   npm run dev
   ```

2. **ブラウザでノートエディタを開く**
   - URL: `http://localhost:3000/notes/new`
   - DevTools（F12）を開いてConsoleタブを表示

3. **段階的にタグを入力**
   - `#` → ログ確認
   - `a` → ログ確認（リンク作成）
   - `a` → ログ確認（`REPLACE`ログが表示されるはず）
   - `a` → ログ確認（`REPLACE`ログが表示されるはず）

4. **期待されるログ**
   ```
   [TagRule-DEBUG] [CALL] Call #1 - Handler triggered
   matchFull: "#a"
   matchCaptured: "a"
   
   [TagRule-DEBUG] [PROCESS] applying mark
   raw: "a"
   text: "#a"
   
   [TagRule-DEBUG] [CALL] Call #2 - Handler triggered
   matchFull: "#aa"
   matchCaptured: "aa"
   
   [TagRule-DEBUG] [REPLACE] replacing shorter mark with longer one
   existing: { from: 1, to: 3, raw: "a" }
   newRaw: "aa"
   newLength: 2
   existingLength: 1
   
   [TagRule-DEBUG] [PROCESS] applying mark
   raw: "aa"
   text: "#aa"
   
   [TagRule-DEBUG] [CALL] Call #3 - Handler triggered
   matchFull: "#aaa"
   matchCaptured: "aaa"
   
   [TagRule-DEBUG] [REPLACE] replacing shorter mark with longer one
   existing: { from: 1, to: 4, raw: "aa" }
   newRaw: "aaa"
   newLength: 3
   existingLength: 2
   
   [TagRule-DEBUG] [PROCESS] applying mark
   raw: "aaa"
   text: "#aaa"
   ```

5. **DOM構造の確認**
   - Elements タブで `#aaa` 全体が `<a>` タグで囲まれているか確認

6. **ProseMirrorドキュメント状態の確認**
   ```javascript
   editor.getJSON()
   ```
   - `marks` 配列に `unilink` マークがあるか
   - `text` プロパティが `"#aaa"` になっているか
   - `attrs.raw` が `"aaa"` になっているか

---

## 📋 チェックリスト

### 実装
- [x] 根本原因の特定
- [x] 修正コードの実装
- [x] TypeScript型エラーの解消
- [x] ユニットテストの実行（全てPASS）
- [ ] 実機での動作確認
- [ ] デバッグログの確認
- [ ] DOM構造の確認
- [ ] ProseMirrorドキュメント状態の確認

### ドキュメント
- [x] 調査ログの作成 (`01_tag-link-issue-investigation.md`)
- [x] 次のステップガイドの作成 (`02_tag-link-next-steps.md`)
- [x] 修正実装ログの作成 (このファイル)
- [ ] 実機テスト結果の記録（次回）

---

## 🔗 関連ドキュメント

- **調査ログ**: `docs/05_logs/2025_10/20251026/01_tag-link-issue-investigation.md`
- **次のステップガイド**: `docs/05_logs/2025_10/20251026/02_tag-link-next-steps.md`
- **実装ファイル**: `lib/tiptap-extensions/unified-link-mark/input-rules/tag-rule.ts`
- **テストファイル**: `lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/tag-rule.test.ts`

---

## 📝 備考

### TypeScriptの型エラー対応

当初、以下のような型エラーが発生しました：

```
プロパティ 'raw' は型 'never' に存在しません。
```

これは、TypeScriptの型推論が `existingMarkInfo` を `null` または特定の型として正しく認識できなかったため。

**解決策**:
1. 型エイリアスの定義: `type ExistingMarkInfo = { from: number; to: number; raw: string }`
2. 明示的なnullチェック: `if (existingMarkInfo !== null)`
3. 型アサーション: `const existingInfo: ExistingMarkInfo = existingMarkInfo`

これにより、TypeScriptが正しく型を推論できるようになりました。

---

**最終更新**: 2025-10-26 21:05  
**次回作業**: 実機での動作確認とログ記録
