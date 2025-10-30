# テーブル編集UI実装ログ

**日付**: 2025-10-30
**対応Issue**: Tiptapエディターのテーブル編集機能強化
**ブランチ**: fix/markdown-editor-issues

## 実施内容

### 1. スタイル更新: shadcn/ui準拠

#### 修正ファイル: `lib/tiptap-extensions/custom-table.ts`

**変更内容**:
- `CustomTableRow`: shadcn/uiのホバー効果とトランジション追加
- `CustomTableHeader`: shadcn/uiのヘッダースタイル適用（高さ、パディング、配置）
- `CustomTableCell`: shadcn/uiのセルスタイル適用（パディング、配置）
- `CustomTable`: テーブル全体を`<div>`でラップし、オーバーフロー対応

**適用されたshadcn/uiスタイル**:
```tsx
// TableRow
class: "border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"

// TableHeader
class: "h-12 px-4 align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0"

// TableCell
class: "p-4 align-middle [&:has([role=checkbox])]:pr-0"

// Table wrapper
<div class="relative w-full overflow-auto my-4">
  <table class="w-full caption-bottom text-sm border-collapse">
```

### 2. 新規コンポーネント作成: テーブル編集用BubbleMenu

#### 新規ファイル: `components/pages/table-bubble-menu.tsx`

**機能**:
- テーブル内にカーソルがある時のみ表示
- 行操作: 上に追加、下に追加、削除
- 列操作: 左に追加、右に追加、削除
- セル操作: 結合、分割（可能な場合のみ有効）
- テーブル削除（破壊的操作なので赤色表示）

**使用しているTiptapコマンド**:
```typescript
editor.chain().focus().addRowBefore().run()
editor.chain().focus().addRowAfter().run()
editor.chain().focus().deleteRow().run()
editor.chain().focus().addColumnBefore().run()
editor.chain().focus().addColumnAfter().run()
editor.chain().focus().deleteColumn().run()
editor.chain().focus().mergeCells().run()
editor.chain().focus().splitCell().run()
editor.chain().focus().deleteTable().run()
```

**UIコンポーネント**:
- Lucideアイコン: `Columns3`, `Rows3`, `Trash2`, `ArrowLeftToLine`, `ArrowRightToLine`, `ArrowUpToLine`, `ArrowDownToLine`, `Merge`, `Split`
- shadcn/ui: `Button`, `Separator`, `Tooltip`

### 3. 既存BubbleMenuの更新

#### 修正ファイル: `components/pages/edit-page-bubble-menu.tsx`

**変更内容**:
1. **表示条件の変更**:
   - テーブル内では表示しない（`!editor.isActive("table")`）
   - テーブル編集は専用のBubbleMenuで処理

2. **テーブル作成ボタン追加**（デスクトップのみ）:
   - アイコン: `Table`
   - ショートカット: `Cmd/Ctrl + Shift + T`
   - 動作: 3×3のテーブル（ヘッダー行あり）を挿入

3. **フックの順序修正**:
   - `if (!editor) return null` を `useEffect` の後に移動
   - 条件付きフック呼び出しのエラーを解消

### 4. EditPageFormへの統合

#### 修正ファイル: `components/pages/EditPageForm.tsx`

**変更内容**:
- `TableBubbleMenu` コンポーネントをインポート
- エディター領域に追加:
```tsx
<EditPageBubbleMenu
  editor={editor}
  wrapSelectionWithPageLink={wrapSelectionWithPageLink}
  splitPage={splitPage}
/>
<TableBubbleMenu editor={editor} />
```

### 5. グローバルスタイル追加

#### 修正ファイル: `app/globals.css`

**追加内容**:
```css
/* Tiptap Table Styles (shadcn/ui compatible) */
.ProseMirror table {
  border-collapse: collapse;
  margin: 1rem 0;
  overflow: hidden;
  table-layout: fixed;
  width: 100%;
}

.ProseMirror table td,
.ProseMirror table th {
  border: 1px solid hsl(var(--border));
  box-sizing: border-box;
  min-width: 1em;
  padding: 0.75rem 1rem;
  position: relative;
  vertical-align: top;
}

.ProseMirror table th {
  background-color: hsl(var(--muted) / 0.5);
  font-weight: 600;
  text-align: left;
}

.ProseMirror table .selectedCell {
  background-color: hsl(var(--accent));
}

.ProseMirror table .column-resize-handle {
  background-color: hsl(var(--primary));
  bottom: -2px;
  pointer-events: none;
  position: absolute;
  right: -2px;
  top: 0;
  width: 4px;
}

.ProseMirror table p {
  margin: 0;
}
```

**ポイント**:
- CSS変数を使用してテーマ対応
- `hsl(var(--border))`, `hsl(var(--muted))`, `hsl(var(--accent))`, `hsl(var(--primary))`
- ダークモード自動対応

## 実現できた機能

### ✅ テーブル作成

**方法1**: Markdownテーブル記法
```markdown
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| A   | B   | C   |
```

**方法2**: キーボードショートカット
- `Cmd/Ctrl + Shift + T`: 3×3テーブルを挿入

**方法3**: テキスト選択時のBubbleMenu
- テーブルボタンをクリック（デスクトップのみ）

### ✅ テーブル編集

**テーブル選択時に専用BubbleMenuが表示される**

#### 行操作
- 上に行を追加
- 下に行を追加
- 行を削除

#### 列操作
- 左に列を追加
- 右に列を追加
- 列を削除

#### セル操作
- セルを結合（複数セル選択時のみ有効）
- セルを分割（結合済みセルのみ有効）

#### テーブル全体
- テーブルを削除

### ✅ スタイリング

- shadcn/uiのテーブルスタイルに準拠
- ダークモード自動対応
- ホバー効果
- セル選択時のハイライト
- レスポンシブ対応（オーバーフロー時にスクロール）

## 使用方法

### テーブルの作成

1. **Markdownで作成**:
   ```markdown
   | 名前 | 年齢 | 職業 |
   |------|------|------|
   | 太郎 | 25   | エンジニア |
   | 花子 | 30   | デザイナー |
   ```

2. **ショートカットで作成**:
   - テキストエリア内で `Cmd+Shift+T` (Mac) または `Ctrl+Shift+T` (Windows/Linux)

3. **BubbleMenuから作成**:
   - テキストを選択 → テーブルボタンをクリック

### テーブルの編集

1. **テーブル内にカーソルを置く**
   - 自動的にテーブル編集用BubbleMenuが表示される

2. **行/列の追加**:
   - 上矢印ボタン: 上に行を追加
   - 下矢印ボタン: 下に行を追加
   - 左矢印ボタン: 左に列を追加
   - 右矢印ボタン: 右に列を追加

3. **行/列の削除**:
   - 行アイコン: 現在の行を削除
   - 列アイコン: 現在の列を削除

4. **セルの結合/分割**:
   - 複数セルを選択 → 結合ボタン
   - 結合済みセルを選択 → 分割ボタン

5. **テーブルの削除**:
   - ゴミ箱ボタンをクリック（赤色で強調表示）

## 技術的なポイント

### BubbleMenuの表示制御

```typescript
shouldShow={({ editor }) => {
  // テーブル内にカーソルがある場合のみ表示
  return editor.isActive("table");
}}
```

### 条件付きボタンの有効/無効化

```typescript
<Button
  onClick={() => editor.chain().focus().mergeCells().run()}
  disabled={!editor.can().mergeCells()}
>
  <Merge className="h-4 w-4" />
</Button>
```

### 複数BubbleMenuの共存

- `EditPageBubbleMenu`: テキスト選択時（テーブル外）
- `TableBubbleMenu`: テーブル選択時

相互に干渉しないように、`shouldShow` で表示条件を明確に分離。

## テスト項目

### 基本動作
- [ ] Markdownテーブル記法からの変換
- [ ] キーボードショートカット（Cmd/Ctrl+Shift+T）
- [ ] BubbleMenuからのテーブル作成

### 行操作
- [ ] 上に行を追加
- [ ] 下に行を追加
- [ ] 行を削除

### 列操作
- [ ] 左に列を追加
- [ ] 右に列を追加
- [ ] 列を削除

### セル操作
- [ ] セルを結合（複数セル選択時）
- [ ] セルを分割（結合済みセルのみ）

### スタイリング
- [ ] ライトモードでの表示
- [ ] ダークモードでの表示
- [ ] ホバー効果
- [ ] セル選択時のハイライト
- [ ] モバイル表示（オーバーフロー時のスクロール）

### UX
- [ ] テーブル外のテキスト選択時はEditPageBubbleMenuが表示
- [ ] テーブル内にカーソル移動時はTableBubbleMenuが表示
- [ ] 2つのBubbleMenuが同時に表示されない
- [ ] ツールチップが正しく表示される
- [ ] 無効化されたボタンが適切に表示される

## 次のステップ（オプション）

### 今後追加可能な機能

1. **テーブルプロパティダイアログ**
   - 行数・列数の一括変更
   - ボーダースタイルの変更
   - セルの幅調整

2. **コンテキストメニュー（右クリックメニュー）**
   - テーブル上で右クリックした際のメニュー表示
   - より直感的な操作

3. **ヘッダー行の切り替え**
   - 既存のテーブルに対してヘッダー行を追加/削除

4. **セル内のリッチテキスト編集**
   - 太字、イタリック、リンクなどのフォーマット

5. **テーブルのエクスポート**
   - CSV形式でのエクスポート
   - Markdown形式でのエクスポート

## 関連ファイル

### 新規作成
- `components/pages/table-bubble-menu.tsx`

### 修正
- `lib/tiptap-extensions/custom-table.ts`
- `components/pages/edit-page-bubble-menu.tsx`
- `components/pages/EditPageForm.tsx`
- `app/globals.css`

### 参照
- `components/ui/table.tsx` (shadcn/ui)
- `components/ui/separator.tsx` (shadcn/ui)
- `components/ui/button.tsx` (shadcn/ui)
- `components/ui/tooltip.tsx` (shadcn/ui)

## まとめ

- ✅ shadcn/uiのテーブルスタイルに準拠
- ✅ テーブル作成は既存のBubbleMenuから
- ✅ テーブル編集は専用のBubbleMenuで実施
- ✅ 2つのBubbleMenuを適切に分離
- ✅ ダークモード対応
- ✅ ツールチップでユーザビリティ向上
- ✅ 条件付きボタンの有効/無効化

**結論**: テーブルの作成・編集機能が完全に実装され、ユーザーは直感的にテーブルを操作できるようになりました。
