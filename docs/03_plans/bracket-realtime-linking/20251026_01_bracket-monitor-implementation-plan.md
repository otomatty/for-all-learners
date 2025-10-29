# ブラケット記法リアルタイムリンク化 実装計画

**作成日**: 2025-10-26
**対象機能**: UnifiedLinkMark - Bracket Monitor Plugin
**関連Issue**: ブラケット内テキスト変更時のリアルタイムリンク判定

---

## 📋 概要

現在のブラケット記法 `[Title]` は、カーソルがブラケット外に出た時点でリンク化される仕様となっています。
この実装では、以下の動作を実現します：

1. **閉じブラケット `]` 入力時に即座にリンク化**
2. **既に閉じているブラケット `[...]` 内のテキストが変更されたら即座にリンク再判定**
3. **開きブラケットのみ `[...` の状態ではリンク化しない**
4. **閉じブラケットが削除されたらリンク解除**

---

## 🎯 目標仕様

### 望ましい動作

```
■ 新規入力フロー

ユーザー入力: [
→ 反応なし（開きブラケットのみ）

ユーザー入力: [t
→ 反応なし（まだ閉じていない）

ユーザー入力: [te
→ 反応なし（まだ閉じていない）

ユーザー入力: [tes
→ 反応なし（まだ閉じていない）

ユーザー入力: [test]
→ ★ 閉じブラケット入力時にリンク化（raw="test"）

■ 既に閉じたブラケットの編集フロー

既存テキスト: [test]
カーソルを戻して: [te|st]（| = カーソル位置）

文字挿入: [text|st]
→ ★ 即座にリンク再判定（raw="textst"）

文字削除: [tex|st]
→ [te|st]
→ ★ 即座にリンク再判定（raw="test"）

■ ブラケット削除フロー

既存テキスト: [test]
閉じブラケット削除: [test
→ リンク解除（開きブラケットのみになった）
```

### キーポイント

1. ✅ **閉じブラケット `]` 入力時に初めてリンク化**
2. ✅ **既に閉じているブラケット `[...]` 内のテキストが変更されたら即座にリンク再判定**
3. ✅ **開きブラケットのみ `[...` の状態ではリンク化しない**
4. ✅ **閉じブラケットが削除されたらリンク解除**
5. ✅ **`markId` の再利用による無駄なマーク再生成防止**

---

## 🏗️ アーキテクチャ設計

### 参考実装: Tag Monitor Plugin

既に実装済みのタグモニタープラグイン（`tag-monitor-plugin.ts`）と同様のアーキテクチャを採用します。

```typescript
// Tag Monitor Plugin の構造
appendTransaction(transactions, oldState, newState) {
  // 1. 自分のトランザクションをスキップ（無限ループ防止）
  if (transactions.some(tr => tr.getMeta(tagMonitorPluginKey))) return null;
  
  // 2. ドキュメント全体をスキャンしてパターン検出
  const tags = findTagsInDoc(newState);
  
  // 3. 各パターンにマークを適用・更新
  tags.forEach(({from, to, raw}) => {
    applyTagMark(tr, editor, from, to, raw);
  });
  
  // 4. 自分のトランザクションであることをマーク
  tr.setMeta(tagMonitorPluginKey, true);
  
  return tr;
}
```

### Bracket Monitor Plugin の構造

```typescript
appendTransaction(transactions, oldState, newState) {
  // 無限ループ防止
  if (transactions.some(tr => tr.getMeta(bracketMonitorPluginKey))) {
    return null;
  }
  
  const tr = newState.tr;
  let modified = false;
  
  // ★ ステップ1: 完全なブラケット [text] を検出
  const completeBrackets = findCompleteBracketsInDoc(newState);
  
  // ★ ステップ2: 既存のブラケットマークを検出
  const existingBracketMarks = findExistingBracketMarks(newState);
  
  // ★ ステップ3: 完全ブラケットにマークを適用/更新
  for (const bracket of completeBrackets) {
    const needsUpdate = checkIfNeedsUpdate(newState, bracket);
    if (needsUpdate) {
      applyBracketMark(tr, editor, bracket.from, bracket.to, bracket.raw);
      modified = true;
    }
  }
  
  // ★ ステップ4: 不完全になったマークを削除
  for (const existingMark of existingBracketMarks) {
    const stillComplete = completeBrackets.some(
      b => b.from === existingMark.from && b.to === existingMark.to
    );
    if (!stillComplete) {
      tr.removeMark(existingMark.from, existingMark.to, markType);
      modified = true;
    }
  }
  
  if (modified) {
    tr.setMeta(bracketMonitorPluginKey, true);
    return tr;
  }
  
  return null;
}
```

---

## 📝 詳細設計

### 1. 新規ファイル作成

**ファイルパス**: `lib/tiptap-extensions/unified-link-mark/plugins/bracket-monitor-plugin.ts`

**主要コンポーネント**:

```typescript
/**
 * Bracket Monitor Plugin
 * Monitors bracket notation ([text]) and maintains link marks in real-time
 */

// PluginKey定義
export const bracketMonitorPluginKey = new PluginKey("bracket-monitor");

// 完全ブラケット検出関数
function findCompleteBracketsInDoc(
  state: EditorState
): Array<{ from: number; to: number; raw: string }>

// 既存ブラケットマーク検出関数
function findExistingBracketMarks(
  state: EditorState
): Array<{ from: number; to: number; raw: string }>

// 更新判定関数
function checkIfNeedsUpdate(
  state: EditorState,
  bracket: { from: number; to: number; raw: string }
): boolean

// マーク適用関数
function applyBracketMark(
  tr: Transaction,
  editor: Editor,
  from: number,
  to: number,
  raw: string
): void

// プラグイン本体
export const createBracketMonitorPlugin = (editor: Editor) => {
  return new Plugin({
    key: bracketMonitorPluginKey,
    appendTransaction(transactions, oldState, newState) {
      // 実装...
    }
  });
}
```

### 2. 完全ブラケット検出

```typescript
function findCompleteBracketsInDoc(
  state: EditorState
): Array<{ from: number; to: number; raw: string }> {
  const brackets: Array<{ from: number; to: number; raw: string }> = [];
  
  state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    
    const text = node.text;
    
    // ★ 完全なブラケット [text] のみ検出
    // 改行を含まない（\n）、ネストしない（[と]を含まない）
    const bracketPattern = /\[([^[\]\n]+)\]/g;
    const matches = text.matchAll(bracketPattern);
    
    for (const match of matches) {
      const matchStart = match.index!;
      const matchEnd = matchStart + match[0].length;
      const raw = match[1];
      
      brackets.push({
        from: pos + matchStart,
        to: pos + matchEnd,
        raw,
      });
    }
  });
  
  return brackets;
}
```

**検出パターン**:
- ✅ `[test]` → 検出（完全ブラケット）
- ❌ `[test` → 検出しない（開きブラケットのみ）
- ❌ `test]` → 検出しない（閉じブラケットのみ）
- ❌ `[]` → 検出しない（空ブラケット）
- ❌ `[[test]]` → 検出しない（ネスト）※内側のみ検出される
- ❌ `[te\nst]` → 検出しない（改行を含む）

### 3. 既存マーク検出

```typescript
function findExistingBracketMarks(
  state: EditorState
): Array<{ from: number; to: number; raw: string }> {
  const marks: Array<{ from: number; to: number; raw: string }> = [];
  const markType = state.schema.marks.unilink;
  
  if (!markType) return marks;
  
  state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    
    // variant="bracket" のマークのみ対象
    const bracketMarks = node.marks.filter(
      m => m.type === markType && m.attrs.variant === "bracket"
    );
    
    for (const mark of bracketMarks) {
      marks.push({
        from: pos,
        to: pos + (node.text?.length || 0),
        raw: mark.attrs.raw,
      });
    }
  });
  
  return marks;
}
```

### 4. 更新判定

```typescript
function checkIfNeedsUpdate(
  state: EditorState,
  bracket: { from: number; to: number; raw: string }
): boolean {
  const markType = state.schema.marks.unilink;
  if (!markType) return true;
  
  // ★ この範囲に既にマークがあるか確認
  let existingRaw: string | undefined;
  
  state.doc.nodesBetween(bracket.from, bracket.to, (node) => {
    const bracketMark = node.marks.find(
      m => m.type === markType && m.attrs.variant === "bracket"
    );
    if (bracketMark) {
      existingRaw = bracketMark.attrs.raw;
    }
  });
  
  // ★ マークがない、またはrawが異なる場合は更新が必要
  return !existingRaw || existingRaw !== bracket.raw;
}
```

### 5. マーク適用・更新

```typescript
function applyBracketMark(
  tr: Transaction,
  editor: Editor,
  from: number,
  to: number,
  raw: string,
): void {
  const markType = tr.doc.type.schema.marks.unilink;
  if (!markType) return;
  
  const text = raw;
  const key = normalizeTitleToKey(raw);
  
  // ★ 既存のmarkIdを再利用（重要：不要な解決キュー追加を防ぐ）
  let existingMarkId: string | undefined;
  
  tr.doc.nodesBetween(from, to, (node) => {
    const bracketMark = node.marks.find(
      m => m.type === markType && m.attrs.variant === "bracket"
    );
    if (bracketMark) {
      existingMarkId = bracketMark.attrs.markId;
    }
  });
  
  const markId = existingMarkId || generateMarkId();
  
  // 外部リンク判定（http:// または https:// で始まる）
  const isExternal = PATTERNS.externalUrl.test(raw);
  
  const attrs: UnifiedLinkAttributes = {
    variant: "bracket",
    raw,
    text,
    key,
    pageId: null,
    href: isExternal ? raw : `#${key}`,
    state: "pending", // ★ 閉じているので常に "pending"
    exists: false,
    markId,
  };
  
  // ★ 既存のマークを削除してから新しいマークを適用
  tr.removeMark(from, to, markType);
  tr.addMark(from, to, markType.create(attrs));
  
  // ★ 解決キューに追加（markIdが新規の場合のみ）
  if (!existingMarkId) {
    enqueueResolve({
      key,
      raw,
      markId,
      editor,
      variant: "bracket",
    });
  }
}
```

### 6. 無限ループ防止機構

```typescript
appendTransaction(transactions, oldState, newState) {
  // ★ 重要: 自分が作成したトランザクションをスキップ
  if (transactions.some(tr => tr.getMeta(bracketMonitorPluginKey))) {
    return null;
  }
  
  const tr = newState.tr;
  let modified = false;
  
  // ... マーク適用処理 ...
  
  // ★ 重要: 自分のトランザクションであることをマーク
  if (modified) {
    tr.setMeta(bracketMonitorPluginKey, true);
    return tr;
  }
  
  return null;
}
```

---

## 🧪 テスト戦略

### テストファイル

**ファイルパス**: `lib/tiptap-extensions/unified-link-mark/plugins/__tests__/bracket-monitor-plugin.test.ts`

### テストケース（26ケース想定）

#### 1. プラグイン作成・メタデータ（2ケース）

```typescript
describe("Plugin creation and metadata", () => {
  it("should create plugin successfully", () => {
    const plugin = createBracketMonitorPlugin(editor);
    expect(plugin).toBeDefined();
    expect(plugin.spec.key).toBe(bracketMonitorPluginKey);
  });

  it("should mark its own transactions with metadata", () => {
    editor.commands.setContent("<p>[test]</p>");
    // メタデータがある場合はスキップされることを確認
  });
});
```

#### 2. 無限ループ防止（2ケース）

```typescript
describe("Infinite loop prevention", () => {
  it("should skip processing own transactions", () => {
    // 自分のトランザクションをスキップすることを確認
  });

  it("should process other plugin transactions", () => {
    // 他のプラグインのトランザクションは処理することを確認
  });
});
```

#### 3. 完全ブラケット検出（4ケース）

```typescript
describe("Complete bracket detection", () => {
  it("should detect complete bracket [text]", () => {
    editor.commands.setContent("<p>[test]</p>");
    expect(hasUnilinkMark(editor, "bracket")).toBe(true);
  });

  it("should not detect open bracket only [text", () => {
    editor.commands.setContent("<p>[test</p>");
    expect(hasUnilinkMark(editor, "bracket")).toBe(false);
  });

  it("should not detect empty brackets []", () => {
    editor.commands.setContent("<p>[]</p>");
    expect(hasUnilinkMark(editor, "bracket")).toBe(false);
  });

  it("should not detect brackets with newline", () => {
    editor.commands.setContent("<p>[te\nst]</p>");
    expect(hasUnilinkMark(editor, "bracket")).toBe(false);
  });
});
```

#### 4. リアルタイム更新（6ケース）

```typescript
describe("Real-time link updates", () => {
  it("should create link when closing bracket is typed", () => {
    editor.commands.setContent("<p>[test</p>");
    expect(hasUnilinkMark(editor, "bracket")).toBe(false);
    
    editor.commands.insertContentAt(editor.state.selection.to, "]");
    expect(hasUnilinkMark(editor, "bracket")).toBe(true);
  });

  it("should update link when text changes inside closed brackets", () => {
    editor.commands.setContent("<p>[test]</p>");
    
    // カーソルを "t" の後に移動して "x" を挿入
    editor.commands.setTextSelection(3);
    editor.commands.insertContent("x");
    
    const mark = getUnilinkMark(editor);
    expect(mark?.attrs.raw).toBe("txest");
  });

  it("should remove link when closing bracket is deleted", () => {
    editor.commands.setContent("<p>[test]</p>");
    expect(hasUnilinkMark(editor, "bracket")).toBe(true);
    
    // ] を削除
    editor.commands.setTextSelection(7);
    editor.commands.deleteSelection();
    
    expect(hasUnilinkMark(editor, "bracket")).toBe(false);
  });

  it("should update raw when character is added", () => {
    editor.commands.setContent("<p>[test]</p>");
    const initialMarkId = getUnilinkMark(editor)?.attrs.markId;
    
    // 文字追加
    editor.commands.setTextSelection(6);
    editor.commands.insertContent("2");
    
    const updatedMark = getUnilinkMark(editor);
    expect(updatedMark?.attrs.raw).toBe("test2");
    expect(updatedMark?.attrs.markId).toBe(initialMarkId); // markId再利用
  });

  it("should update raw when character is deleted", () => {
    editor.commands.setContent("<p>[test]</p>");
    const initialMarkId = getUnilinkMark(editor)?.attrs.markId;
    
    // 文字削除
    editor.commands.deleteRange({ from: 5, to: 6 });
    
    const updatedMark = getUnilinkMark(editor);
    expect(updatedMark?.attrs.raw).toBe("tes");
    expect(updatedMark?.attrs.markId).toBe(initialMarkId);
  });

  it("should update raw when multiple characters change", () => {
    editor.commands.setContent("<p>[test]</p>");
    
    // 範囲選択して置換
    editor.commands.setTextSelection({ from: 2, to: 6 });
    editor.commands.insertContent("hello");
    
    const mark = getUnilinkMark(editor);
    expect(mark?.attrs.raw).toBe("hello");
  });
});
```

#### 5. マーク属性（4ケース）

```typescript
describe("Mark attributes", () => {
  it("should set raw attribute correctly", () => {
    editor.commands.setContent("<p>[test]</p>");
    const mark = getUnilinkMark(editor);
    expect(mark?.attrs.raw).toBe("test");
  });

  it("should normalize key attribute", () => {
    editor.commands.setContent("<p>[Test Title]</p>");
    const mark = getUnilinkMark(editor);
    expect(mark?.attrs.key).toBe("test-title");
  });

  it("should set state to pending for closed brackets", () => {
    editor.commands.setContent("<p>[test]</p>");
    const mark = getUnilinkMark(editor);
    expect(mark?.attrs.state).toBe("pending");
  });

  it("should reuse markId when updating", () => {
    editor.commands.setContent("<p>[test]</p>");
    const initialMarkId = getUnilinkMark(editor)?.attrs.markId;
    
    // 更新
    editor.commands.setTextSelection(6);
    editor.commands.insertContent("2");
    
    const updatedMarkId = getUnilinkMark(editor)?.attrs.markId;
    expect(updatedMarkId).toBe(initialMarkId);
  });
});
```

#### 6. 複数ブラケット（2ケース）

```typescript
describe("Multiple brackets", () => {
  it("should handle multiple brackets in same paragraph", () => {
    editor.commands.setContent("<p>[foo] [bar]</p>");
    const text = editor.state.doc.textContent;
    expect(text).toContain("[foo]");
    expect(text).toContain("[bar]");
  });

  it("should give each bracket independent markId", () => {
    editor.commands.setContent("<p>[foo] [bar]</p>");
    // 各ブラケットが独立したmarkIdを持つことを確認
  });
});
```

#### 7. エッジケース（4ケース）

```typescript
describe("Edge cases", () => {
  it("should handle nested brackets correctly", () => {
    editor.commands.setContent("<p>[[test]]</p>");
    // 内側のみ検出されることを確認
  });

  it("should handle very long text", () => {
    const longText = "a".repeat(100);
    editor.commands.setContent(`<p>[${longText}]</p>`);
    expect(hasUnilinkMark(editor, "bracket")).toBe(true);
  });

  it("should handle special characters", () => {
    editor.commands.setContent("<p>[test-title_v1.0]</p>");
    expect(hasUnilinkMark(editor, "bracket")).toBe(true);
  });

  it("should detect external URLs", () => {
    editor.commands.setContent("<p>[https://example.com]</p>");
    const mark = getUnilinkMark(editor);
    expect(mark?.attrs.href).toBe("https://example.com");
  });
});
```

#### 8. パフォーマンス（2ケース）

```typescript
describe("Performance", () => {
  it("should process multiple brackets within 100ms", () => {
    const start = performance.now();
    
    // 10個のブラケットを一度に処理
    const content = Array.from({ length: 10 }, (_, i) => `[test${i}]`).join(" ");
    editor.commands.setContent(`<p>${content}</p>`);
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it("should process large document within 100ms", () => {
    const start = performance.now();
    
    // 大きなドキュメント
    const content = `${"[test] ".repeat(50)}`;
    editor.commands.setContent(`<p>${content}</p>`);
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
```

---

## 📅 実装手順

### Phase 1: プラグイン基盤作成（1-2時間）

- [ ] `bracket-monitor-plugin.ts` ファイル作成
- [ ] `bracketMonitorPluginKey` 定義
- [ ] `findCompleteBracketsInDoc()` 実装
- [ ] `findExistingBracketMarks()` 実装
- [ ] `checkIfNeedsUpdate()` 実装
- [ ] `applyBracketMark()` 実装
- [ ] `createBracketMonitorPlugin()` 実装
- [ ] 無限ループ防止機構実装

### Phase 2: プラグイン統合（30分）

- [ ] `plugins/index.ts` にモニタープラグイン追加
- [ ] 既存プラグインとの競合確認
- [ ] InputRuleとの連携確認

### Phase 3: テスト作成（2-3時間）

- [ ] `bracket-monitor-plugin.test.ts` 作成
- [ ] 26テストケース実装
  - [ ] プラグイン作成・メタデータ（2ケース）
  - [ ] 無限ループ防止（2ケース）
  - [ ] 完全ブラケット検出（4ケース）
  - [ ] リアルタイム更新（6ケース）
  - [ ] マーク属性（4ケース）
  - [ ] 複数ブラケット（2ケース）
  - [ ] エッジケース（4ケース）
  - [ ] パフォーマンス（2ケース）
- [ ] 全テストパス確認
- [ ] Lint エラー修正

### Phase 4: 既存コード調整（1時間）

- [ ] `bracket-rule.ts` の役割見直し
  - Monitor Pluginと競合しないか確認
  - 必要なら簡素化または削除
- [ ] `bracket-cursor-plugin.ts` の必要性評価
  - Monitor Pluginで置き換え可能なら削除
- [ ] 不要なコード削除

### Phase 5: 統合テスト（1時間）

- [ ] 開発サーバー起動 (`npm run dev`)
- [ ] ブラウザでの動作確認
  - [ ] `[test]` と入力してリンク化確認
  - [ ] 閉じたブラケット内で文字編集してリンク再判定確認
  - [ ] 閉じブラケット削除でリンク解除確認
  - [ ] 複数ブラケットの動作確認
- [ ] コンソールで無限ループログがないことを確認
- [ ] パフォーマンス測定（Chrome DevTools）
- [ ] エッジケーステスト

### Phase 6: ドキュメント更新（30分）

- [ ] 作業ログ作成 (`docs/05_logs/2025_10/20251026_02_bracket-monitor-implementation.md`)
- [ ] 実装の詳細を記録
- [ ] 発見した問題点・解決策を記録

### Phase 7: コミット（15分）

```bash
git add lib/tiptap-extensions/unified-link-mark/plugins/
git commit -m "feat(tiptap): Add bracket monitor plugin for real-time linking

- Monitor closed brackets [text] and maintain links during editing
- Update link attributes when text changes inside brackets
- Remove links when brackets become incomplete
- Implement infinite loop prevention with transaction metadata
- Add comprehensive test suite (26 tests) for bracket monitor plugin
- Reuse markId to prevent unnecessary resolution queue additions"
```

---

## ⚠️ リスクと対策

### リスク1: InputRuleとの競合

**症状**: 
- InputRuleとMonitor Pluginの両方が同じブラケットを処理
- マークが二重に適用される

**対策**: 
- Monitor Pluginの `checkIfNeedsUpdate()` で既存マークを確認
- InputRuleが先に実行され、Monitor Pluginは「念のため」の保険として機能
- テストで競合がないことを確認

### リスク2: パフォーマンス劣化

**症状**:
- 大量のブラケットがある場合に編集が遅くなる
- `findCompleteBracketsInDoc()` が重い

**対策**:
- パフォーマンステストで100ms以内を目標
- 必要に応じて最適化
  - 正規表現のキャッシング
  - 変更があったノードのみスキャン（差分検出）
  - デバウンス処理

### リスク3: 既存マークとの衝突

**症状**:
- 同じ範囲に複数のマークが存在
- マーク削除時に他のマークも削除される

**対策**:
- `applyBracketMark()` で既存マークを慎重に削除
- `variant="bracket"` のマークのみ削除
- テストで他のマークが保持されることを確認

### リスク4: 無限ループ

**症状**:
- `appendTransaction` が自分のトランザクションを処理して無限ループ
- コンソールが大量のログで埋まる
- ブラウザがフリーズ

**対策**:
- トランザクションメタデータによるループ防止（Tag Monitorと同じ方式）
- テストで無限ループが発生しないことを確認
- 開発中はデバッグログで監視

### リスク5: bracket-cursor-plugin.ts との重複

**症状**:
- 同じ機能が2つのプラグインで実装される
- コードの保守性が低下

**対策**:
- Monitor Plugin実装後、bracket-cursor-plugin.ts の必要性を評価
- 不要なら削除してコードを簡素化
- テストで機能が保持されることを確認

---

## 📊 期待される効果

### UX向上

- ✅ タグ記法 `#tag` と同じリアルタイム性を実現
- ✅ 編集中でも視覚的フィードバックが得られる
- ✅ ユーザーの入力フローが中断されない
- ✅ 閉じたブラケット内でも自由に編集可能

### コード品質

- ✅ Tag Monitorと統一されたアーキテクチャ
- ✅ 包括的なテストによる品質保証（26ケース）
- ✅ 既存プラグインの整理・簡素化
- ✅ 保守性の向上

### 開発者体験

- ✅ 明確な設計ドキュメント
- ✅ 詳細なテストケース
- ✅ Tag Monitor Pluginとの一貫性
- ✅ 将来の機能追加が容易

---

## 🔄 Tag Monitor との比較

| 項目 | Tag Monitor | Bracket Monitor |
|------|-------------|-----------------|
| **トリガー** | 文字入力（リアルタイム） | 文字入力（リアルタイム） |
| **パターン** | `#tag` | `[text]` （完全ブラケットのみ） |
| **検出条件** | `#` + 連続非スペース文字 | `[` + 非ブラケット文字 + `]` |
| **状態管理** | `pending` / `exists` / `not-exists` | `pending` / `exists` / `not-exists` |
| **閉じ判定** | スペースまたは改行 | `]` 入力 |
| **markId再利用** | ✅ | ✅ |
| **無限ループ防止** | PluginKey metadata | PluginKey metadata |
| **開きのみの扱い** | `#test` でもリンク化 | `[test` はリンク化しない |
| **編集中の動作** | 常にリアルタイム更新 | 閉じている場合のみ更新 |

---

## 📚 関連ドキュメント

- **Tag Monitor Plugin実装**: `lib/tiptap-extensions/unified-link-mark/plugins/tag-monitor-plugin.ts`
- **Tag Monitor Test**: `lib/tiptap-extensions/unified-link-mark/plugins/__tests__/tag-monitor-plugin.test.ts`
- **既存Bracket Rule**: `lib/tiptap-extensions/unified-link-mark/input-rules/bracket-rule.ts`
- **既存Bracket Cursor Plugin**: `lib/tiptap-extensions/unified-link-mark/plugins/bracket-cursor-plugin.ts`
- **UnifiedLinkMark Config**: `lib/tiptap-extensions/unified-link-mark/config.ts`

---

## ✅ 実装完了チェックリスト

実装完了時に以下をすべて確認してください：

### コード実装

- [ ] `bracket-monitor-plugin.ts` 作成完了
- [ ] 全ての関数が実装されている
- [ ] TypeScript エラーがない
- [ ] Lint エラーがない
- [ ] 無限ループ防止機構が実装されている

### テスト

- [ ] `bracket-monitor-plugin.test.ts` 作成完了
- [ ] 26テストケースすべて実装
- [ ] 全テストがパス（26 passed）
- [ ] コードカバレッジ ≥ 80%

### 統合

- [ ] `plugins/index.ts` に統合完了
- [ ] 既存プラグインとの競合がない
- [ ] InputRuleとの連携が正常

### ブラウザテスト

- [ ] `[test]` と入力してリンク化される
- [ ] 閉じたブラケット内で文字編集するとリンク再判定される
- [ ] 閉じブラケット削除でリンク解除される
- [ ] 複数ブラケットが正常に動作する
- [ ] コンソールに無限ループログがない
- [ ] パフォーマンスが許容範囲内（< 100ms）

### ドキュメント

- [ ] 作業ログ作成完了
- [ ] 実装の詳細を記録
- [ ] 発見した問題点・解決策を記録

### コミット

- [ ] Conventional Commits形式でコミット
- [ ] コミットメッセージが明確
- [ ] 変更内容が適切に説明されている

---

**最終更新**: 2025-10-26
**作成者**: AI (GitHub Copilot)
**ステータス**: 実装準備完了
