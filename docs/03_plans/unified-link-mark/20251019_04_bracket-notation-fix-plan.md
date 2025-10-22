# ブラケット記法修正実装計画

**作成日**: 2025-10-19  
**優先度**: 🔴 High  
**推定工数**: ⭐⭐⭐ 4-6時間  
**対象ブランチ**: `feature/bracket-notation-implementation`  
**マージ先**: `develop`  
**GitHub Issue**: [#25](https://github.com/otomatty/for-all-learners/issues/25)

---

## 📋 問題の要約

### 現象

ユーザーが `[URL]` を入力後、`]` を削除しても、リンクが維持されている。

```
入力1: [https://example.com]  → リンク作成 ✅
削除:  ] を削除
入力2: [https://example.com   → リンク削除されない ❌（問題）
```

### 期待される動作

**ブラケット記法は `[]` で囲まれている場合のみ有効**

```
✅ [https://example.com]      → リンク作成
✅ https://example.com        → リンク作成（裸URL）
❌ [https://example.com       → リンク化しない
❌ https://example.com]       → リンク化しない
```

---

## 🔍 根本原因分析

### 仮説 1: InputRule パターンの問題

**現在の実装** (`config.ts` の `PATTERNS.bracket`):

```typescript
bracket: /\[([^\[\]]+)\]/
```

**問題点**:
- `[` を検出した時点で何らかの処理が開始される可能性
- `]` の有無をしっかりチェックしていない
- 開き括弧 `[` だけでもマークが作成されている可能性

**確認方法**:
```bash
# regex をテストする
node -e "console.log(/\[([^\[\]]+)\]/.test('[https://example.com'))"  # false (正常)
node -e "console.log(/\[([^\[\]]+)\]/.test('[https://example.com]'))" # true (正常)
```

### 仮説 2: リンク状態管理の問題

**現在の実装** (`bracket-rule.ts` の `handler`):

```typescript
handler: ({ state, match, range, chain }) => {
  // InputRule がトリガーされた時点でマークを作成
  chain()
    .focus()
    .deleteRange({ from, to })
    .insertContent({
      type: "text",
      text: displayText,
      marks: [{ type: context.name, attrs }]
    })
    .run();
}
```

**問題点**:
- 一度作成されたマークが、テキスト変更時に自動削除されない
- `]` が削除された後も、マークがエディタに残る
- マークの有効範囲チェックが存在しない

### 仮説 3: 複合的な問題

1. InputRule で `[URL]` を検出してマークを作成
2. ユーザーが `]` を手動削除
3. ProseMirror のテキスト変更イベントが発火
4. **しかし、マークの削除チェックが実行されない**
5. マークが残ったままになる

---

## 🛠️ 実装方針

### Phase 1: 根本原因の特定（1時間）

**実施内容**:

1. **InputRule パターンの確認**
   - ファイル: `lib/tiptap-extensions/unified-link-mark/config.ts` Line 48
   - 現在: `bracket: /\[([^\[\]]+)\]/`
   - チェック: パターンが `]` を必須にしているか確認

2. **InputRule handler の確認**
   - ファイル: `lib/tiptap-extensions/unified-link-mark/input-rules/bracket-rule.ts`
   - チェック: マーク作成時に `]` を確認しているか
   - チェック: テキスト削除時の処理はあるか

3. **テストケースの確認**
   - ファイル: `lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/bracket-rule.test.ts`
   - チェック: `[URL` のみのテストケースが存在するか
   - チェック: `URL]` のみのテストケースが存在するか

4. **ブラウザでの再現確認**
   ```bash
   bun dev
   # http://localhost:3000 で以下を操作
   1. [https://example.com] と入力
   2. ] を削除
   3. リンクが残っているか確認
   ```

**出力**:
- 問題が発生する具体的な条件
- デバッグコンソールのログ
- パターンと handler の実装内容

### Phase 2: パターン修正（1.5時間）

**実施内容**:

1. **InputRule パターンを厳密化**
   
   ```typescript
   // 現在（問題の可能性あり）
   bracket: /\[([^\[\]]+)\]/
   
   // 修正案1: より明確に
   bracket: /\[(?![\[\]])([^\[\]]+)\]/  // ネガティブルックアヘッド追加
   
   // 修正案2: 複合URL対応
   bracket: /\[([^\[\]\n]{1,2000})\]/   // 改行なし、1-2000文字
   ```

2. **InputRule handler の修正**
   
   ```typescript
   handler: ({ state, match, range, chain }) => {
     const url = match[1];
     
     // 検証: URL が正しいか
     if (!url || !isValidUrl(url)) {
       return null;  // ← リンク化しない
     }
     
     // マーク作成
     chain()
       .focus()
       .deleteRange({ from, to })
       .insertContent({...})
       .run();
   }
   ```

3. **テストケース追加**
   
   ```typescript
   describe("Bracket notation validation", () => {
     it("should not match if closing bracket is missing", () => {
       expect(PATTERNS.bracket.test("[https://example.com")).toBe(false);
     });
     
     it("should not match if opening bracket is missing", () => {
       expect(PATTERNS.bracket.test("https://example.com]")).toBe(false);
     });
     
     it("should match when both brackets present", () => {
       expect(PATTERNS.bracket.test("[https://example.com]")).toBe(true);
     });
   });
   ```

**出力**:
- 修正されたパターン
- 修正されたハンドラー
- 追加されたテストケース
- テスト実行結果

### Phase 3: リンク状態管理の改善（2時間）

**実施内容**:

1. **マークの有効範囲チェック実装**
   
   ```typescript
   // Mark がまだ有効な範囲にあるか確認
   function isValidMarkRange(
     state: EditorState,
     mark: Mark,
     from: number,
     to: number
   ): boolean {
     // Mark の両側に [ と ] があるか確認
     const text = state.doc.textBetween(from - 1, to + 1);
     
     if (!text.startsWith("[") || !text.endsWith("]")) {
       return false;  // 無効
     }
     return true;
   }
   ```

2. **オンチェンジハンドラーの実装**
   
   ```typescript
   // editor の update イベントで、無効なマークを削除
   editor.on("update", ({ editor }) => {
     const { state, dispatch } = editor.view;
     let tr = state.tr;
     let hasChanges = false;
     
     state.doc.descendants((node, pos) => {
       node.marks.forEach((mark) => {
         if (mark.type.name === "unilink" && mark.attrs.variant === "bracket") {
           // マークの両側を確認
           if (!isValidMarkRange(state, mark, pos, pos + node.nodeSize)) {
             tr.removeMark(pos, pos + node.nodeSize, mark.type);
             hasChanges = true;
           }
         }
       });
     });
     
     if (hasChanges) {
       dispatch(tr);
     }
   });
   ```

3. **テストケース追加**
   
   ```typescript
   describe("Mark validity check", () => {
     it("should remove mark if closing bracket is deleted", () => {
       // [URL] を入力してマークを作成
       // ] を削除
       // マークが削除されることを確認
     });
   });
   ```

**出力**:
- 有効範囲チェック関数
- オンチェンジハンドラー
- テスト実行結果

### Phase 4: テストとブラウザ確認（1.5時間）

**実施内容**:

1. **Unit テスト実行**
   
   ```bash
   bun test lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/bracket-rule.test.ts
   ```

2. **統合テスト実行**
   
   ```bash
   bun test lib/tiptap-extensions/unified-link-mark/
   ```

3. **ブラウザテスト実施**
   
   ```bash
   bun dev
   ```
   
   **テストケース**:
   
   | 入力 | 操作 | 期待 | 実際 |
   |------|------|------|------|
   | `[https://example.com]` | なし | リンク作成 | |
   | `[https://example.com` | なし | リンク作成しない | |
   | `https://example.com]` | なし | リンク作成しない | |
   | `[https://example.com]` | `]` を削除 | マーク削除 | |
   | `[https://example.com]` | `[` を削除 | マーク削除 | |

4. **ドキュメント更新**
   - `docs/03_design/features/bracket-notation-spec.md` を作成/更新
   - 実装の詳細を記載

---

## 📁 対象ファイル一覧

### 修正ファイル

1. **`lib/tiptap-extensions/unified-link-mark/config.ts`**
   - Line 48: `PATTERNS.bracket` の修正

2. **`lib/tiptap-extensions/unified-link-mark/input-rules/bracket-rule.ts`**
   - handler ロジックの修正
   - オンチェンジハンドラーの追加

3. **`lib/tiptap-extensions/unified-link-mark/index.ts`**
   - Extension のカスタムハンドラー登録

### テストファイル

4. **`lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/bracket-rule.test.ts`**
   - テストケース追加（括弧の片側のみケース）
   - マーク削除テスト

5. **`lib/tiptap-extensions/unified-link-mark/__tests__/config.test.ts`**
   - パターンテスト追加

### ドキュメント

6. **`docs/04_implementation/plans/unified-link-mark/20251019_04_bracket-notation-fix-plan.md`** (このファイル)
   - 実装計画書

7. **`docs/03_design/features/bracket-notation-spec.md`** (新規作成)
   - 仕様書

---

## 🧪 テスト戦略

### Unit テスト

```typescript
describe("Bracket InputRule", () => {
  describe("Pattern matching", () => {
    it("should match valid bracket notation", () => {
      expect(PATTERNS.bracket.test("[https://example.com]")).toBe(true);
    });
    
    it("should NOT match missing closing bracket", () => {
      expect(PATTERNS.bracket.test("[https://example.com")).toBe(false);
    });
    
    it("should NOT match missing opening bracket", () => {
      expect(PATTERNS.bracket.test("https://example.com]")).toBe(false);
    });
  });
  
  describe("Handler behavior", () => {
    it("should create mark for valid bracket notation", () => {
      // ... test code
    });
    
    it("should NOT create mark for invalid notation", () => {
      // ... test code
    });
  });
  
  describe("Mark removal on text change", () => {
    it("should remove mark when closing bracket is deleted", () => {
      // ... test code
    });
    
    it("should remove mark when opening bracket is deleted", () => {
      // ... test code
    });
  });
});
```

### ブラウザテスト チェックリスト

- [ ] `[https://example.com]` で リンク作成される
- [ ] `[https://example.com` で リンク作成されない
- [ ] `https://example.com]` で リンク作成されない
- [ ] リンク作成後に `]` を削除すると、マークが削除される
- [ ] リンク作成後に `[` を削除すると、マークが削除される
- [ ] リンク作成後に中央部分を削除すると、マークが削除される

---

## 📊 進捗追跡

### 実装状況

- [ ] Phase 1: 根本原因特定（完了予定: 1時間後）
- [ ] Phase 2: パターン修正（完了予定: 2.5時間後）
- [ ] Phase 3: 状態管理改善（完了予定: 4.5時間後）
- [ ] Phase 4: テストとブラウザ確認（完了予定: 6時間後）

### 品質チェック

- [ ] Unit テスト全 PASS
- [ ] ブラウザテスト全項目クリア
- [ ] TypeScript エラーなし
- [ ] 既存テストに影響なし

---

## 🔗 関連ドキュメント

- [GitHub Issue #25](https://github.com/otomatty/for-all-learners/issues/25)
- [UnifiedLinkMark 実装計画](./README.md)
- [Tag 重複問題修正](./20251019_03_tag-duplication-fix-completion.md)
- [タグ機能検証](../../08_worklogs/2025_10/20251019/20251019_04_tag-feature-verification.md)

---

**作成者**: GitHub Copilot  
**作成日**: 2025-10-19  
**ステータス**: 📋 計画書作成完了、実装待機中
