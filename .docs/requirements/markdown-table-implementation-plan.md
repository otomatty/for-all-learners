# Markdownテーブル自動レンダリング機能 実装計画書

## 1. 概要

### 1.1 機能要件
- Tiptapエディター内でMarkdown形式のテーブル記法（`|列1|列2|`）を自動的にHTMLテーブルに変換
- 既存のLaTeX変換機能（`$...$`）と同様のパターンで実装
- リアルタイムでの変換とプレビュー機能
- 編集可能なテーブル機能の提供

### 1.2 技術要件
- 既存のTiptap拡張機能アーキテクチャとの整合性
- TypeScript完全対応
- 既存のコンポーネントスタイルガイドラインに準拠
- パフォーマンス最適化（React.memo、useMemo等の活用）

## 2. 現在の技術スタック整合性

### 2.1 使用技術
- **フロントエンド**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **エディター**: Tiptap v2.12.0
- **スタイリング**: Tailwind CSS（既存のproseクラス活用）
- **パッケージマネージャー**: Bun
- **コード品質**: Biome (Lint/Format)

### 2.2 既存アーキテクチャとの整合性
- `lib/tiptap-extensions/` ディレクトリ構造に準拠
- `usePageEditorLogic.ts` での拡張機能登録パターンに従う
- 既存の`transformDollarInDoc`パターンを参考にした実装

## 3. 実装対象ファイル詳細

### 3.1 新規作成ファイル

#### 3.1.1 Table拡張機能本体
```
lib/tiptap-extensions/custom-table.ts
```
**目的**: Markdownテーブル記法の検出と自動変換
**機能**:
- Markdown記法（`| 列1 | 列2 |\n|------|------|\n| データ1 | データ2 |`）の検出
- TiptapのTable拡張をベースにしたカスタム拡張
- 入力ルール（inputRules）の定義
- 貼り付けルール（pasteRules）の定義

#### 3.1.2 テーブル用ユーティリティ関数
```
lib/utils/markdownTableParser.ts
```
**目的**: Markdownテーブル記法のパースとバリデーション
**機能**:
- Markdownテーブル記法の構文解析
- TiptapのJSONContent形式への変換
- テーブル構造のバリデーション

#### 3.1.3 テーブル変換関数
```
lib/utils/transformMarkdownTables.ts
```
**目的**: JSONContent内のMarkdownテーブルを検出・変換
**機能**:
- 既存の`transformDollarInDoc`と同様のパターン
- テキストノード内のMarkdownテーブル記法を検出
- Table NodeとしてのJSONContent生成

#### 3.1.4 テーブルコンポーネント（オプション）
```
components/table-editor/
├── table-cell-editor.tsx
├── table-row-editor.tsx
└── table-toolbar.tsx
```
**目的**: リッチなテーブル編集体験の提供
**機能**:
- セル内での編集機能
- 行・列の追加/削除機能
- テーブルツールバー

### 3.2 修正対象ファイル

#### 3.2.1 package.json
**変更内容**: 
```json
{
  "dependencies": {
    "@tiptap/extension-table": "^2.12.0",
    "@tiptap/extension-table-row": "^2.12.0",
    "@tiptap/extension-table-header": "^2.12.0",
    "@tiptap/extension-table-cell": "^2.12.0"
  }
}
```

#### 3.2.2 usePageEditorLogic.ts
**変更箇所**: 
- extensions配列への`CustomTable`追加（192-216行付近）
- `transformMarkdownTables`関数の呼び出し追加（224-238行付近）

**具体的変更**:
```typescript
// インポート追加
import { CustomTable } from "@/lib/tiptap-extensions/custom-table";
import { transformMarkdownTables } from "@/lib/utils/transformMarkdownTables";

// extensions配列に追加
extensions: [
  // ... 既存の拡張機能
  CustomTable,
  // ...
],

// onCreate内での変換処理追加
onCreate({ editor }) {
  const sanitized = sanitizeContent(initialDoc);
  const withLatex = transformDollarInDoc(sanitized);
  const withTables = transformMarkdownTables(withLatex); // 追加
  
  try {
    editor.commands.setContent(withTables); // 変更
  } catch (error) {
    // エラーハンドリング
  }
}
```

#### 3.2.3 edit-page-form.tsx
**変更箇所**: 
- テーブル関連のキーボードショートカット追加（157-180行付近）

**具体的変更**:
```typescript
// handleKeyDown関数内に追加
if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "t") {
  e.preventDefault();
  editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run();
}
```

#### 3.2.4 tiptap-editor.tsx（汎用エディター）
**変更箇所**: 
- extensions配列への`CustomTable`追加（36-63行付近）

## 4. ディレクトリ構造

### 4.1 実装後のディレクトリ構造
```
lib/
├── tiptap-extensions/
│   ├── custom-table.ts          # 新規
│   ├── custom-heading.ts
│   ├── custom-list.ts
│   ├── gyazo-image.ts
│   ├── page-link.ts
│   └── ...
├── utils/
│   ├── markdownTableParser.ts   # 新規
│   ├── transformMarkdownTables.ts # 新規
│   ├── transformPageLinks.ts
│   └── ...
components/
├── table-editor/               # 新規（オプション）
│   ├── table-cell-editor.tsx
│   ├── table-row-editor.tsx
│   └── table-toolbar.tsx
└── ui/
    ├── table.tsx              # 既存（活用）
    └── ...
```

### 4.2 インポート関係図
```mermaid
graph TD
    A[usePageEditorLogic.ts] --> B[custom-table.ts]
    A --> C[transformMarkdownTables.ts]
    B --> D[markdownTableParser.ts]
    C --> D
    B --> E[@tiptap/extension-table]
    F[edit-page-form.tsx] --> A
```

## 5. 実装フェーズ

### 5.1 Phase 1: 基盤実装
**期間**: 1-2日
**内容**:
1. 必要なTiptapパッケージのインストール
2. `markdownTableParser.ts`の実装
3. `transformMarkdownTables.ts`の実装
4. 基本的な単体テストの作成

### 5.2 Phase 2: 拡張機能実装
**期間**: 2-3日
**内容**:
1. `custom-table.ts`の実装
2. `usePageEditorLogic.ts`への統合
3. 基本的な入力ルールの実装
4. 貼り付けルールの実装

### 5.3 Phase 3: エディター統合
**期間**: 1-2日
**内容**:
1. `edit-page-form.tsx`でのキーボードショートカット追加
2. `tiptap-editor.tsx`への統合
3. 汎用エディターでの動作確認

### 5.4 Phase 4: UI強化（オプション）
**期間**: 2-3日
**内容**:
1. テーブル編集用UIコンポーネントの実装
2. ツールバーへのテーブル機能追加
3. UX向上の実装

### 5.5 Phase 5: テスト・最適化
**期間**: 1-2日
**内容**:
1. 統合テストの実装
2. パフォーマンス最適化
3. エラーハンドリングの強化
4. ドキュメント更新

## 6. 技術的実装詳細

### 6.1 Markdownテーブル記法の検出

#### 6.1.1 対応する記法
```markdown
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| A   | B   | C   |
| D   | E   | F   |
```

#### 6.1.2 正規表現パターン
```typescript
const tablePattern = /^\|(.+\|.+)\n\|(:?-+:?\|:?-+:?)+\n(\|.+\|(\n|$))+/gm;
```

### 6.2 変換ロジック

#### 6.2.1 パース処理
```typescript
interface TableData {
  headers: string[];
  alignments: ('left' | 'center' | 'right')[];
  rows: string[][];
}

function parseMarkdownTable(markdown: string): TableData | null {
  // MarkdownテーブルをパースしてTableData形式に変換
}
```

#### 6.2.2 JSONContent変換
```typescript
function tableDataToJSONContent(tableData: TableData): JSONContent {
  return {
    type: "table",
    content: [
      {
        type: "tableRow",
        content: tableData.headers.map(header => ({
          type: "tableHeader",
          content: [{ type: "paragraph", content: [{ type: "text", text: header }] }]
        }))
      },
      ...tableData.rows.map(row => ({
        type: "tableRow",
        content: row.map(cell => ({
          type: "tableCell",
          content: [{ type: "paragraph", content: [{ type: "text", text: cell }] }]
        }))
      }))
    ]
  };
}
```

### 6.3 入力ルールの実装

#### 6.3.1 リアルタイム変換
```typescript
export const CustomTable = Table.extend({
  addInputRules() {
    return [
      // パイプ文字による自動テーブル作成
      textblockTypeInputRule({
        find: /^\|\s*(.+?)\s*\|$/,
        type: this.type,
        getAttributes: (match) => {
          // マッチした内容からテーブル構造を生成
        }
      })
    ];
  }
});
```

### 6.4 スタイリング

#### 6.4.1 Tailwindクラスの活用
```typescript
renderHTML({ HTMLAttributes }) {
  return [
    'table',
    mergeAttributes(HTMLAttributes, {
      class: 'w-full border-collapse border border-border'
    }),
    ['tbody', 0]
  ];
}
```

## 7. 品質保証

### 7.1 テスト戦略

#### 7.1.1 単体テスト（Vitest）
- `markdownTableParser.ts`の関数テスト
- `transformMarkdownTables.ts`の変換テスト
- エッジケースのテスト

#### 7.1.2 統合テスト
- エディター内での実際の動作テスト
- 既存機能との競合テスト
- パフォーマンステスト

### 7.2 エラーハンドリング

#### 7.2.1 想定エラーケース
- 不正なMarkdownテーブル記法
- セル内容の過度な長さ
- ネストしたテーブル構造

#### 7.2.2 フォールバック処理
- パースエラー時はプレーンテキストとして保持
- ユーザーフレンドリーなエラーメッセージ
- 既存コンテンツの保護

## 8. パフォーマンス考慮事項

### 8.1 最適化ポイント
- 大きなテーブルでの変換処理の最適化
- 不要な再レンダリングの防止
- メモ化による計算コストの削減

### 8.2 メモリ管理
- 変換処理の際の一時オブジェクトの適切な管理
- エディター破棄時のクリーンアップ処理

## 9. 将来拡張性

### 9.1 機能拡張の余地
- CSVファイルからのテーブル生成
- Excelファイルの直接インポート
- テーブル内での計算機能
- ソート・フィルター機能

### 9.2 アーキテクチャの拡張性
- プラグイン式のテーブル機能拡張
- カスタムセルタイプの追加
- テーマシステムとの連携

## 10. セキュリティ考慮事項

### 10.1 XSS対策
- ユーザー入力のサニタイゼーション
- HTMLエスケープの確実な実施

### 10.2 コンテンツ保護
- 既存コンテンツの意図しない変更の防止
- バックアップ機能との連携

---

## 実装優先度

1. **P0 (必須)**: Phase 1, 2の基盤機能
2. **P1 (重要)**: Phase 3のエディター統合
3. **P2 (推奨)**: Phase 4のUI強化
4. **P3 (将来)**: 拡張機能と最適化

この計画書に基づいて段階的に実装することで、安全かつ効率的にMarkdownテーブル機能を追加できる。
