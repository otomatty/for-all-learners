# 太字テキストをリンクに変換する際の表示問題

**日付**: 2025-10-28  
**カテゴリ**: Bug / Enhancement  
**優先度**: Medium  
**状態**: Open  
**担当者**: 未割当

---

## 問題の概要

UnifiedLinkMark（リンク機能）において、太字のテキストをリンクに変換した際に、太字スタイルが維持されない問題が発生しています。

## 現在の状況

### 動作するケース ✅
- **リンクを作成してから太字を適用する** → 正常に動作
  - 手順: `[テキスト]` → リンクを選択 → 太字ボタン
  - 結果: 太字のリンクとして表示される

### 動作しないケース ❌
- **太字のテキストに対してリンクを適用する** → 太字が解除される
  - 手順: テキストを選択 → 太字ボタン → `[太字テキスト]`
  - 結果: リンクになるが太字が消える
  - 期待: 太字のままリンクになるべき

---

## 試したこと

### 試行 1: `inclusive`プロパティの変更

**対象ファイル**: `lib/tiptap-extensions/unified-link-mark/index.ts`

```typescript
export const UnifiedLinkMark = Mark.create<UnifiedLinkMarkOptions>({
  name: "unilink",
  priority: 1000,
  inclusive: false,  // ← これを true に変更
  // ...
});
```

**変更内容**:
- `inclusive: false` → `inclusive: true`
- 他のマーク（太字など）との共存を許可

**結果**: ❌ 効果なし

**考察**:
- `inclusive`だけでは既存のマークを保持できない
- Input Rulesでのマーク処理に問題がある可能性

---

### 試行 2: 優先度（priority）の調整 - パターンA

**対象ファイル**: `lib/tiptap-extensions/unified-link-mark/index.ts`

```typescript
export const UnifiedLinkMark = Mark.create<UnifiedLinkMarkOptions>({
  name: "unilink",
  priority: 100,      // 1000 から 100 に変更
  inclusive: true,
  excludes: "",
  spanning: true,
  keepOnSplit: false,
});
```

**変更内容**:
- 優先度を `1000` → `100` に下げて、Boldマーク（優先度100前後）と同等にする
- `excludes: ""` で他のマークを排除しない設定を明示
- `spanning: true` でマークの範囲拡張を有効化

**結果**: ❌ 効果なし

**考察**:
- 優先度を下げても問題は解決しない
- マークの適用順序が問題ではない可能性

---

### 試行 3: Boldマークの優先度を明示的に設定

**対象ファイル**: `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts`

```typescript
import Bold from "@tiptap/extension-bold";

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: false,
      bulletList: false,
      orderedList: false,
      codeBlock: false,
      bold: false, // StarterKitのBoldを無効化
    }),
    // 高い優先度でBoldを明示的に再定義
    Bold.configure({}).extend({
      priority: 200,
    }),
    UnifiedLinkMark, // priority: 100
    // ...
  ],
});
```

**変更内容**:
- StarterKitのデフォルトBoldを無効化
- Boldを明示的にインポートして、優先度200で再定義
- Bold (200) > UnifiedLink (100) という優先度順序を確立

**結果**: ⚠️ 部分的に動作
- リンク→太字: ✅ 動作する
- 太字→リンク: ❌ 動作しない

**考察**:
- 優先度の順序は影響するが、根本的な解決にはならない
- 問題はマークの適用時の処理にある

---

### 試行 4: 優先度（priority）の調整 - パターンB（最終試行）

**対象ファイル**: 
- `lib/tiptap-extensions/unified-link-mark/index.ts`
- `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts`

```typescript
// UnifiedLinkMark
export const UnifiedLinkMark = Mark.create<UnifiedLinkMarkOptions>({
  name: "unilink",
  priority: 1000,     // 高い優先度に戻す
  inclusive: true,
  excludes: "",
  spanning: false,    // falseに変更
});

// usePageEditorLogic.ts
StarterKit.configure({
  // boldはデフォルトのまま（無効化しない）
  heading: false,
  bulletList: false,
  orderedList: false,
  codeBlock: false,
}),
UnifiedLinkMark,
```

**変更内容**:
- UnifiedLinkMarkの優先度を1000に戻す（外側にレンダリング）
- `spanning: false` に変更（マーク分割を抑制）
- StarterKitのBoldはデフォルト設定に戻す

**結果**: ❌ 依然として太字→リンクが動作せず

**考察**:
- 優先度の調整だけでは解決しない
- Input RulesまたはCommandsの実装に根本的な問題がある

---

## 技術的な詳細

### 期待されるHTML構造

```html
<!-- パターン1: リンクが外側（推奨） -->
<a class="unilink"><strong>太字のリンク</strong></a>

<!-- パターン2: 太字が外側（代替） -->
<strong><a class="unilink">太字のリンク</a></strong>
```

どちらの構造でも、視覚的には太字のリンクとして表示されるべき。

---

### 関連ファイル一覧

#### コア実装
- `lib/tiptap-extensions/unified-link-mark/index.ts` - マークの定義
- `lib/tiptap-extensions/unified-link-mark/rendering.ts` - HTMLレンダリング
- `lib/tiptap-extensions/unified-link-mark/config.ts` - 設定
- `lib/tiptap-extensions/unified-link-mark/attributes.ts` - 属性定義

#### Input Rules（入力パターン検出）
- `lib/tiptap-extensions/unified-link-mark/input-rules/index.ts`
- `lib/tiptap-extensions/unified-link-mark/input-rules/bracket-input-rule.ts`
- `lib/tiptap-extensions/unified-link-mark/input-rules/tag-input-rule.ts`

#### Commands（操作コマンド）
- `lib/tiptap-extensions/unified-link-mark/commands/index.ts`
- `lib/tiptap-extensions/unified-link-mark/commands/wrap-with-brackets.ts`
- `lib/tiptap-extensions/unified-link-mark/commands/unwrap-brackets.ts`

#### エディタ設定
- `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts` - エディタの初期化

#### スタイル
- `app/globals.css` (line 490-540) - リンクのスタイル定義

---

### 現在の設定値

```typescript
// UnifiedLinkMark (index.ts)
{
  name: "unilink",
  priority: 1000,
  inclusive: true,
  excludes: "",
  spanning: false,
}

// CSS (globals.css)
DEFAULT_HTML_ATTRIBUTES = {
  class: "unilink underline cursor-pointer",
}

// スタイル定義
.ProseMirror a.unilink[data-group-state="exists"] {
  color: #2563eb; /* blue-600 */
}
// font-weightを上書きするスタイルは存在しない
```

---

## 考えられる原因

### 1. **Input Rulesでのマーク削除**（最有力）

`[テキスト]` パターンを検出した際に、Input Ruleが既存のマークを削除している可能性が高い。

**確認ポイント**:
- `bracket-input-rule.ts` での `replaceWith` 処理
- 既存のマークを保持する処理があるか
- ProseMirrorの `addMark` が正しく呼ばれているか

**想定されるコード**:
```typescript
// 問題がある可能性のあるコード
find: /\[([^[\]\n]+)\]/,
replace: (match) => {
  // この時点で既存のマークが失われる？
  return createUnifiedLinkMark(match[1]);
}
```

---

### 2. **ProseMirrorのマーク適用順序**

TipTapの内部でマークが適用される際、ProseMirrorのトランザクション処理で既存のマークが考慮されていない可能性。

**確認ポイント**:
- `tr.addMark()` の呼び出し時に既存マークを保持しているか
- `storedMarks` の使用状況

---

### 3. **Commandsの実装問題**

`wrapWithBrackets` コマンドが既存のマークを保持していない可能性。

**確認ポイント**:
- `commands/wrap-with-brackets.ts` の実装
- 選択範囲のマークを取得して保持しているか

---

### 4. **レンダリングロジックの問題**

`renderHTML` 関数で子要素のマークが正しく継承されていない可能性（可能性は低い）。

**現在の実装**:
```typescript
export function renderHTML(
  HTMLAttributes: Record<string, unknown>,
  options: UnifiedLinkMarkOptions,
): ["a", Record<string, unknown>, 0] {
  // ...
  return [
    "a",
    mergeAttributes(options.HTMLAttributes, rest, dataAttributes, {
      class: allClasses,
    }),
    0, // ← この 0 は子要素を継承するという意味
  ];
}
```

---

## 次のステップ

### 🔍 調査が必要な項目

#### 優先度: 高
1. [ ] **Input Rulesの詳細調査**
   - `lib/tiptap-extensions/unified-link-mark/input-rules/bracket-input-rule.ts`
   - パターンマッチ時に既存のマークが保持されているか確認
   - デバッグログを追加してマークの状態を追跡

2. [ ] **ブラウザ開発者ツールでHTML構造を確認**
   - 太字 → リンク変換時のDOM構造
   - リンク → 太字変換時のDOM構造
   - 両者の違いを分析

3. [ ] **`wrapWithBrackets` コマンドの実装確認**
   - `lib/tiptap-extensions/unified-link-mark/commands/wrap-with-brackets.ts`
   - 既存のマークを取得・保持する処理があるか

#### 優先度: 中
4. [ ] **ProseMirrorのトランザクションログ確認**
   - `editor.on('transaction')` でトランザクションを監視
   - マークの追加・削除のタイミングを追跡

5. [ ] **他のTipTap拡張機能の実装を参考にする**
   - 公式のLinkマーク実装
   - コミュニティの実装例

---

### 💡 検討すべき解決策

#### 解決策 1: Input Rulesでマークを明示的に保持

```typescript
// bracket-input-rule.ts の修正案
export function createBracketInputRule(context: InputRuleContext) {
  return markInputRule({
    find: PATTERNS.bracket,
    type: context.type,
    getAttributes: (match) => {
      // 既存の実装
    },
    // 既存のマークを保持する処理を追加
    handler: ({ state, range, match }) => {
      const { from, to } = range;
      const $from = state.doc.resolve(from);
      
      // 既存のマークを取得
      const existingMarks = $from.marks();
      
      // トランザクションを作成
      const tr = state.tr;
      
      // リンクマークを追加（既存マークも保持）
      tr.addMark(from, to, context.type.create(attrs));
      
      // 既存のマークを再適用
      existingMarks.forEach(mark => {
        tr.addMark(from, to, mark);
      });
      
      return tr;
    }
  });
}
```

---

#### 解決策 2: `addMark` 時に `inclusive: true` を考慮

```typescript
// commands/insert-unified-link.ts の修正案
export function createInsertUnifiedLinkCommand(context) {
  return (attrs) => ({ state, dispatch }) => {
    const { from, to } = state.selection;
    
    if (dispatch) {
      // 既存のマークを取得
      const $from = state.doc.resolve(from);
      const storedMarks = $from.marks();
      
      // リンクマークを作成
      const linkMark = context.type.create(fullAttrs);
      
      // トランザクションを作成
      const tr = state.tr;
      
      // リンクマークを追加
      tr.addMark(from, to, linkMark);
      
      // 既存のマークを保持（重要）
      if (storedMarks.length > 0) {
        storedMarks.forEach(mark => {
          tr.addMark(from, to, mark);
        });
      }
      
      dispatch(tr);
    }
    return true;
  };
}
```

---

#### 解決策 3: Boldマーク専用の互換性処理

```typescript
// 太字を明示的に保持する専用コマンド
addCommands() {
  return {
    ...createCommands(),
    
    // 太字を保持しながらリンクを適用
    setUnifiedLinkPreservingBold: (attrs) => ({ commands, state }) => {
      const { from, to } = state.selection;
      const isBold = state.doc.rangeHasMark(from, to, state.schema.marks.bold);
      
      // リンクを追加
      commands.setUnifiedLink(attrs);
      
      // 太字が存在した場合、再適用
      if (isBold) {
        commands.toggleBold(); // off
        commands.toggleBold(); // on (再適用)
      }
      
      return true;
    }
  };
}
```

---

#### 解決策 4: `extendMarkRange` を使用

```typescript
// マークの範囲を適切に拡張
addCommands() {
  return {
    setUnifiedLink: (attrs) => ({ tr, state, dispatch }) => {
      const { from, to } = state.selection;
      
      // マークの範囲を拡張（既存マークを考慮）
      const range = extendMarkRange(state.selection.$from, type);
      
      if (dispatch) {
        tr.addMark(range.from, range.to, type.create(attrs));
        dispatch(tr);
      }
      
      return true;
    }
  };
}
```

---

## デバッグ方法

### 1. ブラウザコンソールでのデバッグ

```javascript
// エディタのインスタンスを取得
const editor = window.__TIPTAP_EDITOR__;

// 選択範囲のマークを確認
editor.state.selection.$from.marks();

// トランザクションを監視
editor.on('transaction', ({ transaction }) => {
  console.log('Transaction:', transaction);
  console.log('Steps:', transaction.steps);
  transaction.steps.forEach(step => {
    console.log('Step type:', step.constructor.name);
  });
});
```

### 2. Input Rule のデバッグログ

```typescript
// bracket-input-rule.ts
export function createBracketInputRule(context: InputRuleContext) {
  return markInputRule({
    find: PATTERNS.bracket,
    type: context.type,
    getAttributes: (match) => {
      console.log('🔍 Bracket match:', match);
      console.log('🔍 Current marks:', context.editor.state.selection.$from.marks());
      // ...
    }
  });
}
```

---

## 環境情報

- **ブランチ**: `feature/link-group-network-setup`
- **TipTap**: React版使用
- **関連拡張機能**: 
  - UnifiedLinkMark (カスタム)
  - StarterKit (Bold含む)
  - Highlight (カスタム)

---

## 再現手順

### 準備
1. ページエディタを開く
2. テキストを入力（例: "太字のリンク"）

### 動作しないケース（太字 → リンク）
1. テキスト "太字のリンク" を選択
2. 太字ボタンをクリック（または `Cmd/Ctrl + B`）
3. **確認**: テキストが太字になる ✅
4. そのまま `[` を入力
5. テキストが選択されたまま `]` を入力
6. **結果**: リンクになるが太字が消える ❌
7. **期待**: 太字のままリンクになるべき ⭕

### 動作するケース（リンク → 太字）
1. テキスト "太字のリンク" を入力
2. `[太字のリンク]` として入力
3. **確認**: リンクになる ✅
4. リンクテキストを選択
5. 太字ボタンをクリック（または `Cmd/Ctrl + B`）
6. **結果**: 太字のリンクになる ✅

---

## 参考資料

### TipTap公式ドキュメント
- [Mark Schema](https://tiptap.dev/api/schema#mark-schema)
- [Input Rules](https://tiptap.dev/guide/custom-extensions#input-rules)
- [Commands](https://tiptap.dev/guide/custom-extensions#commands)
- [Priority](https://tiptap.dev/api/schema#priority)

### ProseMirror公式ドキュメント
- [Marks](https://prosemirror.net/docs/guide/#schema.marks)
- [Transactions](https://prosemirror.net/docs/guide/#transform)
- [Commands](https://prosemirror.net/docs/guide/#commands)

### 類似問題の議論
- [TipTap GitHub Issues](https://github.com/ueberdosis/tiptap/issues)
- Stack Overflow: "prosemirror preserve marks when adding new mark"

---

## 更新履歴

| 日付 | 更新内容 | 担当者 |
|------|---------|--------|
| 2025-10-28 | 初版作成、問題の調査と試行錯誤の記録 | AI Assistant |

---

## 次のアクション

1. [ ] Input Rulesの実装を詳細に確認
2. [ ] デバッグログを追加してマークの状態を追跡
3. [ ] 解決策1または2を実装して検証
4. [ ] テストケースを追加
5. [ ] 動作確認後、このissueをcloseする

---

**作成日**: 2025-10-28  
**最終更新**: 2025-10-28
