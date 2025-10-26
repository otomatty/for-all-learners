# タグリンク機能の問題調査ログ

**日付**: 2025-10-26  
**担当**: AI (GitHub Copilot)  
**問題**: タグ機能で`#aaa`と入力すると`#a`までがリンクとして認識され、それ以降の`aa`は認識されない

---

## 問題の詳細

### 報告された症状
- ユーザーが`#aaa`と入力
- 期待: `#aaa`全体がタグリンクとして認識される
- 実際: `#a`までしかリンクとして認識されず、残りの`aa`は通常テキストになる
- 想定: タグ記法はスペースや改行で区切らない限り`#`以降のテキストを全てリンクテキストとして認識するべき

---

## これまでに実施した調査と修正

### 1. 正規表現パターンの確認 (20:30)

**調査内容**:
- ファイル: `lib/tiptap-extensions/unified-link-mark/config.ts`
- 該当箇所: `PATTERNS.tag` の正規表現

**発見した問題（第1の仮説）**:
```typescript
// 修正前
tag: /(?:^|\s)#([a-zA-Z0-9...]{1,50})(?=\s|$|[^\p{Letter}\p{Number}])/u
```

先読みアサーション`(?=\s|$|[^\p{Letter}\p{Number}])`が原因と推測。  
`#aaa`の場合、`#a`の次の文字`a`が`\p{Letter}`に該当するため、先読みアサーションが失敗してマッチが止まると考えた。

**実施した修正（第1回）**:
```typescript
// 修正後
tag: /(?:^|\s)#([a-zA-Z0-9...]{1,50})(?=\s|$)/u
```

先読みアサーションから`[^\p{Letter}\p{Number}]`を削除。

**検証結果**:
- Node.jsでの正規表現単体テストは成功
- `#aaa`全体がマッチすることを確認
- テストケース追加: `test-tag-pattern.js`

---

### 2. InputRuleのrange動作の調査 (20:35)

**発見した問題（第2の仮説）**:
TipTapの`InputRule`は正規表現のマッチ全体（`match[0]`）を`range`として扱う。

**問題の詳細**:
```typescript
// パターン: /(?:^|\s)#([a-z]+)/
// 入力: "hello #aaa"
// match[0]: " #aaa"  ← スペースを含む
// match[1]: "aaa"    ← キャプチャグループ
// range.from: 5      ← スペースの位置
// range.to: 10       ← #aaaの終わり
```

`range`にスペースが含まれるため、`deleteRange({ from, to })`がスペースも削除してしまう可能性。

**実施した修正（第2回）**:
後読みアサーション（positive lookbehind）を使用してスペースをマッチから除外。

```typescript
// 修正後
tag: /(?<=^|\s)#([a-zA-Z0-9...]{1,50})(?=\s|$)/u
```

**検証結果**:
- Node.jsでの検証: 成功
- `test-inputrule-range.js`と`test-lookbehind-pattern.js`で確認
- パターン1（スペース含む）: `match[0] = " #aaa"`, `index = 5`
- パターン2（後読み）: `match[0] = "#aaa"`, `index = 6` ← スペースを含まない
- ユニットテスト: **全てPASS**（28 tests passed）

---

### 3. テストケースの追加 (20:40)

**追加したテスト**:
`lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/tag-rule.test.ts`

```typescript
it("should capture complete tag text including multiple consecutive characters", () => {
  const testCases = [
    { input: " #aaa", expected: "aaa" },
    { input: " #abc123", expected: "abc123" },
    { input: " #テストケース", expected: "テストケース" },
    { input: " #中文测试", expected: "中文测试" },
    { input: " #mixedText123", expected: "mixedText123" },
    { input: " #a1b2c3d4e5", expected: "a1b2c3d4e5" },
  ];

  for (const { input, expected } of testCases) {
    const match = PATTERNS.tag.exec(input);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe(expected);
  }
});
```

**結果**: 全てPASS

---

## 修正内容のまとめ

### 変更ファイル

1. **`lib/tiptap-extensions/unified-link-mark/config.ts`**
   - 変更箇所: `PATTERNS.tag`正規表現
   - 変更前: `(?:^|\s)#([...]{1,50})(?=\s|$|[^\p{Letter}\p{Number}])`
   - 変更後: `(?<=^|\s)#([...]{1,50})(?=\s|$)`
   - 理由: 後読みアサーションでスペースをマッチから除外

2. **`lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/tag-rule.test.ts`**
   - テストケース追加: 複数連続文字のタグが正しくキャプチャされることを確認

3. **デバッグフラグの一時変更**
   - `lib/tiptap-extensions/unified-link-mark/input-rules/tag-rule.ts`
   - `DEBUG_TAG_DUPLICATION`を一時的に`true`に変更（その後`false`に戻した）

---

## 検証結果

### ユニットテストの結果
```
✓ lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/tag-rule.test.ts (28 tests) 74ms
  ✓ Pattern matching > should match tag notation correctly
  ✓ Pattern validation > should capture complete tag text including multiple consecutive characters
  （以下略）
```

**結果**: 正規表現レベルでは問題なく動作

### ユーザーからの報告
**問題は依然として解決していない**

---

## 結論: これまでの修正が見当違いだった理由

### 正規表現は正しく動作している
- Node.jsでの単体テスト: ✅ 成功
- ユニットテスト（Vitest）: ✅ 成功
- パターンマッチング: ✅ `#aaa`全体をキャプチャ

### しかし実際のエディタでは問題が発生
これは、**問題が正規表現やInputRuleのマッチングではなく、別の箇所にある**ことを示唆。

---

## 次に調査すべき箇所

### 1. InputRuleのhandler実行フロー

**調査対象**:
- `lib/tiptap-extensions/unified-link-mark/input-rules/tag-rule.ts`の`handler`関数
- 特に以下の処理:
  ```typescript
  chain()
    .focus()
    .deleteRange({ from, to })
    .insertContent({
      type: "text",
      text: text,
      marks: [{ type: "unilink", attrs }]
    })
    .run();
  ```

**調査内容**:
1. `deleteRange({ from, to })`が実際にどの範囲を削除しているか
2. `insertContent`で挿入されるテキストが正しいか
3. `range.from`と`range.to`の値が期待通りか

**方法**:
- デバッグログを有効化（`DEBUG_TAG_DUPLICATION = true`）
- 実際のエディタで`#aaa`を入力
- コンソールログで以下を確認:
  - `match[0]`, `match[1]`
  - `range.from`, `range.to`
  - `text`（挿入されるテキスト）
  - `raw`（キャプチャされたテキスト）

---

### 2. TipTapのInputRule実行タイミング

**調査対象**:
- TipTapがInputRuleをトリガーするタイミング
- 文字入力ごとにInputRuleが実行されるか
- 複数回InputRuleが実行される可能性

**調査内容**:
1. ユーザーが`#`を入力 → InputRule実行？
2. ユーザーが`a`を入力（1文字目） → InputRule実行？
3. ユーザーが`a`を入力（2文字目） → InputRule実行？
4. ユーザーが`a`を入力（3文字目） → InputRule実行？

**仮説**:
- 各文字入力ごとにInputRuleが実行される
- `#a`の時点でInputRuleが発火し、リンクが作成される
- その後の`aa`はリンク外のテキストとして追加される

**検証方法**:
- `inputRuleCallCount`のログを確認
- `#aaa`入力時に何回handlerが呼ばれるか
- 各呼び出し時の`match`と`range`を記録

---

### 3. 既存マークの重複チェック

**調査対象**:
```typescript
// CRITICAL: Check if the range already has this mark
let hasExistingMark = false;
state.doc.nodesBetween(from, to, (node) => {
  if (node.isText && node.marks.some((m) => m.type === markType)) {
    hasExistingMark = true;
    return false; // Stop traversal
  }
});

if (hasExistingMark) {
  debugLog("SKIP", "mark already exists on this range", { from, to });
  return;
}
```

**調査内容**:
1. `#a`が既にマークされている場合、`#aa`や`#aaa`のInputRuleは抑制されるか
2. `nodesBetween`が正しく動作しているか
3. 既存マークの範囲判定が正しいか

**仮説**:
- `#a`でマークが作成される
- `#aa`を認識しようとするが、`from`位置に既存マークがあるため抑制される
- 結果として`#a`のみがリンクになる

---

### 4. TipTapのトランザクション・状態管理

**調査対象**:
- `chain().focus().deleteRange().insertContent().run()`の実行順序
- `deleteRange`と`insertContent`の間でエディタ状態がどう変化するか
- トランザクションが正しくコミットされているか

**調査内容**:
1. `deleteRange({ from: 1, to: 5 })`が期待通りの範囲を削除しているか
2. `insertContent({ text: "#aaa" })`が正しい位置に挿入されているか
3. マーク適用が正しく行われているか

---

### 5. Suggestion Plugin との競合

**調査対象**:
- `lib/tiptap-extensions/unified-link-mark/plugins/`配下のプラグイン
- 特に`suggestion-plugin`や`auto-bracket-plugin`

**調査内容**:
1. Suggestion Pluginが`#`の入力を検知して動作していないか
2. 複数のプラグインが同時に動作して競合していないか
3. プラグインの優先順位（priority）が正しいか

**確認方法**:
```typescript
// UnifiedLinkMark Extension
export const UnifiedLinkMark = Mark.create<UnifiedLinkMarkOptions>({
  name: "unilink",
  priority: 1000,  // ← この優先度で他のプラグインより先に実行されるか
  // ...
});
```

---

### 6. ブラウザのDevToolsでのリアルタイムデバッグ

**実施内容**:
1. 開発サーバー起動（`npm run dev`）
2. ブラウザでノートエディタを開く
3. DevToolsのコンソールを開く
4. `#aaa`を実際に入力
5. 以下を確認:
   - ネットワークタブ: APIリクエストの有無
   - コンソール: エラーメッセージ、ログ出力
   - Elements: DOM構造の変化
   - ProseMirrorのドキュメント状態（`editor.state.doc`）

**特に確認すべき点**:
- `#a`入力後のDOM構造
- `#aa`入力後のDOM構造
- `#aaa`入力後のDOM構造
- 各段階でのマーク（`<a>`タグ）の範囲

---

### 7. ProseMirror Devtoolsの使用

**ツール**: [prosemirror-dev-tools](https://github.com/d4rkr00t/prosemirror-dev-tools)

**インストール**:
```bash
npm install --save-dev prosemirror-dev-tools
```

**使用方法**:
エディタのセットアップ時に:
```typescript
import { applyDevTools } from "prosemirror-dev-tools";

const editor = new Editor({
  // ...
});

if (process.env.NODE_ENV === 'development') {
  applyDevTools(editor.view);
}
```

**確認内容**:
1. ドキュメント構造のリアルタイム表示
2. トランザクションの履歴
3. 各InputRule実行時の状態変化
4. マークの適用範囲

---

## 推奨される次のステップ

### ステップ1: デバッグログの詳細化（最優先）

**ファイル**: `lib/tiptap-extensions/unified-link-mark/input-rules/tag-rule.ts`

**修正内容**:
```typescript
const DEBUG_TAG_DUPLICATION = true; // 有効化

function debugLog(context: string, message: string, data?: Record<string, unknown>) {
  if (!DEBUG_TAG_DUPLICATION) return;
  
  // さらに詳細な情報を出力
  console.log(`[TagRule-DEBUG] [${context}] ${message}`, {
    ...data,
    timestamp: Date.now(),
    stackTrace: new Error().stack?.split('\n').slice(2, 5) // 呼び出し元
  });
}

// handlerの先頭に追加
handler: ({ state, match, range, chain }) => {
  inputRuleCallCount++;
  const { from, to } = range;
  
  // ★ 詳細なログ出力
  console.log('=== InputRule Handler Called ===');
  console.log('Call count:', inputRuleCallCount);
  console.log('Match full:', JSON.stringify(match[0]));
  console.log('Match captured:', JSON.stringify(match[1]));
  console.log('Range:', { from, to });
  console.log('Document text at range:', state.doc.textBetween(from, to));
  console.log('Cursor position:', state.selection.from);
  
  // 既存のログ
  debugLog("CALL", `Call #${inputRuleCallCount}`, {
    match: match[0],
    captured: match[1],
    range: { from, to },
    docText: state.doc.textBetween(from, to),
    cursorPos: state.selection.from
  });
  
  // ... 以下既存のコード
}
```

**実施手順**:
1. 上記の修正を適用
2. 開発サーバー起動
3. ブラウザのコンソールを開く
4. エディタで`#aaa`を1文字ずつ入力
5. 各文字入力時のログを詳細に記録

---

### ステップ2: 簡易テストページの作成

**ファイル**: `app/(protected)/debug-tag/page.tsx`（または適切な場所）

**内容**:
```typescript
"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { UnifiedLinkMark } from '@/lib/tiptap-extensions/unified-link-mark';

export default function DebugTagPage() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      UnifiedLinkMark.configure({
        // 必要な設定
      })
    ],
    content: '<p>テスト入力エリア</p>',
    onUpdate: ({ editor }) => {
      // 状態変化をログ
      console.log('Editor updated:', editor.getJSON());
    }
  });

  return (
    <div style={{ padding: '50px' }}>
      <h1>タグ機能デバッグ</h1>
      <div style={{ border: '1px solid #ccc', padding: '20px', minHeight: '200px' }}>
        <EditorContent editor={editor} />
      </div>
      <button onClick={() => console.log('Doc:', editor?.state.doc)}>
        Log Document
      </button>
    </div>
  );
}
```

---

### ステップ3: 段階的な入力シミュレーション

**方法**: ユニットテストで段階的な入力をシミュレート

**ファイル**: `lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/tag-rule-stepwise.test.ts`

```typescript
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { UnifiedLinkMark } from "../../index";

describe("Tag InputRule - Stepwise Input", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, UnifiedLinkMark],
      content: "<p></p>",
    });
  });

  afterEach(() => {
    editor?.destroy();
  });

  it("should handle stepwise input: # -> #a -> #aa -> #aaa", () => {
    // Step 1: 入力 "#"
    editor.commands.insertContent("#");
    console.log("After #:", editor.getJSON());
    
    // Step 2: 入力 "a"
    editor.commands.insertContent("a");
    console.log("After #a:", editor.getJSON());
    
    // Step 3: 入力 "a"
    editor.commands.insertContent("a");
    console.log("After #aa:", editor.getJSON());
    
    // Step 4: 入力 "a"
    editor.commands.insertContent("a");
    console.log("After #aaa:", editor.getJSON());
    
    // 最終確認
    const doc = editor.getJSON();
    const paragraph = doc.content?.[0];
    const textContent = paragraph?.content?.[0];
    
    // マークが存在するか確認
    expect(textContent?.marks).toBeDefined();
    expect(textContent?.marks?.[0]?.type).toBe("unilink");
    expect(textContent?.text).toBe("#aaa"); // ← ここが "#a" になっていないか確認
  });
});
```

---

## 追加の調査ポイント

### A. InputRuleのトリガー条件

**確認内容**:
- TipTapのInputRuleはどのタイミングで実行されるか
- `textContent`の変更ごとに実行？
- スペースやEnterキー押下時のみ実行？

**ドキュメント参照**:
- [TipTap InputRule Documentation](https://tiptap.dev/api/utilities/input-rules)
- ProseMirrorの`inputRules`プラグイン仕様

---

### B. 他のInputRuleとの競合

**確認ファイル**:
- `lib/tiptap-extensions/unified-link-mark/input-rules/index.ts`
- `lib/tiptap-extensions/unified-link-mark/input-rules/bracket-rule.ts`

**確認内容**:
- `bracket-rule`と`tag-rule`の実行順序
- 両方のInputRuleが同じ位置で発火する可能性

---

### C. マークのマージ動作

**ProseMirrorの仕様**:
- 隣接する同じタイプのマークは自動的にマージされる
- `#a`のマークと追加の`aa`が別々に処理される場合、マージされるべき

**確認方法**:
```typescript
// エディタのマーク構造を確認
editor.state.doc.content.forEach((node) => {
  node.content.forEach((child) => {
    console.log('Node:', child.text);
    console.log('Marks:', child.marks);
  });
});
```

---

## まとめ

### 現状
- 正規表現パターンは正しく動作（テスト済み）
- InputRuleの基本構造も正しい（テスト済み）
- **しかし実際のエディタでは問題が発生**

### 結論
問題の原因は以下のいずれかの可能性が高い:
1. **InputRuleの実行タイミング**: 各文字入力ごとに発火し、`#a`の時点でマークが確定
2. **既存マークの重複チェック**: 既存マークがあると新しいマークが作成されない
3. **ProseMirrorのトランザクション処理**: `deleteRange`と`insertContent`の間での状態不整合
4. **他のプラグインとの競合**: Suggestion Pluginなどが干渉
5. **マークの適用範囲の問題**: `range.from`と`range.to`の計算ミス

### 次のアクション（優先順位順）
1. ✅ **最優先**: デバッグログを詳細化して実際のエディタでの動作を確認
2. ✅ **優先**: 簡易テストページで段階的入力をテスト
3. ✅ **優先**: 段階的入力のユニットテストを作成
4. ⚠️ **推奨**: ProseMirror Devtoolsを導入してリアルタイムで状態確認
5. ⚠️ **推奨**: InputRuleのトリガー条件をTipTapドキュメントで確認
6. ⚠️ **検討**: 他のプラグイン（Suggestion等）を一時的に無効化してテスト

---

## 参考資料

- TipTap InputRule API: https://tiptap.dev/api/utilities/input-rules
- ProseMirror InputRules: https://prosemirror.net/docs/ref/#inputrules
- ProseMirror Devtools: https://github.com/d4rkr00t/prosemirror-dev-tools
- 正規表現後読みアサーション: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Assertions

---

**最終更新**: 2025-10-26 20:45  
**次回対応**: デバッグログの詳細化と実機テスト
