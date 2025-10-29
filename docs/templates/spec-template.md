# .spec.md 仕様書テンプレート

**対象:** AI + 開発者
**最終更新:** 2025-10-22

---

## 概要

`.spec.md` ファイルは、各コンポーネント・ロジックの**仕様定義**と**テストケース定義**を一箇所に集約したドキュメントです。

テスト駆動開発（TDD）の中心となり、以下の役割を果たします：

1. **実装前の要件定義** → test.tsx が参照
2. **テストケース定義** → test.tsx に実装される TC（Test Case）
3. **実装ガイド** → implementation.tsx の実装基準
4. **変更前の確認ドキュメント** → 機能追加時に既存仕様の確認

---

## ファイル配置

```
src/components/Button/
├── Button.tsx              ← 実装ファイル
├── Button.spec.md          ← このテンプレート
└── Button.test.tsx         ← spec.md に基づくテスト

src/utils/calculateTotal/
├── calculateTotal.ts       ← 実装ファイル
├── calculateTotal.spec.md  ← このテンプレート
└── calculateTotal.test.ts  ← spec.md に基づくテスト
```

---

## テンプレート（完全版）

### セクション 1: ファイルヘッダー

```markdown
# {FileName}.spec.md

**コンポーネント/ロジック**: {Component/Function Name}
**カテゴリ**: {UI Component / Utility / Service / Hook}
**作成日**: YYYY-MM-DD
**最終更新**: YYYY-MM-DD
**ステータス**: Draft / Review / Approved

---

## 関連ドキュメント

- Issue: `docs/01_issues/open/YYYY_MM/YYYYMMDD_{番号}_{名前}.md`
- Design: `docs/03_design/features/{機能名}-design.md`
- Research: `docs/02_research/YYYY_MM/YYYYMMDD_{番号}_{名前}.md`
- Plan: `docs/03_plans/{機能名}/YYYYMMDD_{番号}_{名前}.md`
- Work Log: `docs/05_logs/YYYY_MM/YYYYMMDD_{番号}_{名前}.md`

---
```

### セクション 2: 概要

```markdown
## 1. 概要

### 目的

{このコンポーネント/ロジックの存在理由を記述}

例:
ボタンコンポーネントは UI ライブラリの基礎となり、
アプリケーション全体で統一されたボタン操作を提供します。

### 対象ユーザー / 使用場面

{どこで、誰が使うのか}

例:

- 開発者: UI を構築する際にボタンコンポーネントを使用
- エンドユーザー: ボタンをクリックしてアクションを実行

### 外部依存関係

{このコンポーネント/ロジックが依存するライブラリ・モジュール}

例:

- React 18+
- @testing-library/react (テスト用)
- tailwindcss (スタイリング)

---
```

### セクション 3: 仕様定義

````markdown
## 2. 仕様定義 (Specifications)

### 2.1 機能要件

#### 必須機能

- [ ] 機能①: {説明}
- [ ] 機能②: {説明}
- [ ] 機能③: {説明}

例:

- [ ] テキストのレンダリング: 任意のテキストをボタンラベルとして表示
- [ ] サイズ選択: small, medium, large の 3 サイズをサポート
- [ ] 複数バリアント: primary, secondary, danger など複数のスタイルをサポート

#### オプション機能

- [ ] 機能④: {説明}
- [ ] 機能⑤: {説明}

例:

- [ ] アイコン表示: ボタン内にアイコンを表示可能
- [ ] ローディング状態: 非同期処理中の loading 表示

### 2.2 非機能要件

#### パフォーマンス

| 指標             | 目標値  | 説明               |
| ---------------- | ------- | ------------------ |
| レンダリング時間 | < 16ms  | 60fps 維持         |
| バンドルサイズ   | < 2KB   | gzip 圧縮後        |
| メモリ使用量     | < 100KB | 複数インスタンス時 |

#### セキュリティ

- [ ] XSS 対策: ユーザー入力をサニタイズ
- [ ] CSRF 対策: 必要に応じてトークン検証
- [ ] 外部リンク: rel="noopener noreferrer" を設定

#### アクセシビリティ

- [ ] WCAG 2.1 AA 準拠
- [ ] スクリーンリーダー対応
- [ ] キーボード操作対応（Enter / Space キー）
- [ ] 色のみで判断しない（コントラスト比 4.5:1 以上）

#### ブラウザ互換性

- [ ] Chrome 最新版
- [ ] Firefox 最新版
- [ ] Safari 最新版
- [ ] Edge 最新版

### 2.3 入出力仕様

#### Props インターフェース

```typescript
interface ButtonProps {
  // 必須プロップ
  children: React.ReactNode;

  // オプションプロップ
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
  size?: "small" | "medium" | "large";
  variant?: "primary" | "secondary" | "danger" | "success";
  className?: string;

  // アクセシビリティ
  ariaLabel?: string;
  ariaDisabled?: boolean;
  role?: string;
}
```
````

#### 戻り値

```
React コンポーネント (JSX.Element)
表示: <button> HTML 要素
```

### 2.4 状態遷移図

```
┌─────────────┐
│  Idle       │
└─────┬───────┘
      │ hover
      ▼
┌─────────────┐
│  Hovered    │
└─────┬───────┘
      │ click
      ▼
┌─────────────┐     timeout (例: 300ms)
│  Active     ├──────────────┐
└─────────────┘              │
                             ▼
                         ┌─────────────┐
                         │  Idle       │
                         └─────────────┘

※ disabled=true の場合: すべての遷移がブロック
※ loading=true の場合: Idle ↔ Loading の状態
```

### 2.5 エラーハンドリング

| エラー               | 原因               | 対応                                  |
| -------------------- | ------------------ | ------------------------------------- |
| onClick が関数でない | 実装者の誤り       | console.error でログ、UI は破損しない |
| 無限ループ onClick   | プログラムロジック | 最大実行回数を制限（500ms 間隔）      |
| メモリリーク         | 子要素の参照保持   | cleanup 処理で参照を解放              |

---

````

### セクション 4: テストケース定義

```markdown
## 3. テストケース (Test Cases)

### テスト実行ルール
- **テストの独立性**: 各テストは独立して実行可能
- **テスト順序**: テスト間に依存なし（任意の順序で実行可能）
- **テスト環境**: Node.js + Jest + @testing-library/react
- **アサーション**: テストコード内の expect() が検証基準

### 3.1 正常系テストケース

#### TC-001: 基本レンダリング
````

カテゴリ: 正常系
優先度: 高

````

**前提条件:**
- Button コンポーネントが React でレンダリング可能
- DOM に アクセス可能

**入力:**
```jsx
<Button>Click me</Button>
````

**期待される結果:**

1. button HTML 要素がレンダリング
2. テキスト "Click me" が表示
3. デフォルトスタイル（primary, medium）が適用

**テストコード位置:** `Button.test.tsx` TC-001

**検証項目:**

```javascript
expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
expect(screen.getByRole("button")).toHaveClass("primary", "medium");
```

**備考:** 最も基本的なテスト、ここから開始

---

#### TC-002: サイズバリエーション

```
カテゴリ: 正常系
優先度: 高
```

**前提条件:**

- Button コンポーネントが size プロップをサポート

**入力:**

```jsx
<Button size="small">Small</Button>
<Button size="medium">Medium</Button>
<Button size="large">Large</Button>
```

**期待される結果:**

1. 各ボタンに対応するサイズクラスが付与
2. 視覚的に大きさが変わる
3. アクセシビリティは維持

**検証項目:**

```javascript
// small
expect(screen.getByText("Small")).toHaveClass("size-small");

// medium
expect(screen.getByText("Medium")).toHaveClass("size-medium");

// large
expect(screen.getByText("Large")).toHaveClass("size-large");
```

**備考:** サイズの実装は CSS Modules で管理

---

#### TC-003: バリアント（複数スタイル）

```
カテゴリ: 正常系
優先度: 高
```

**入力:**

```jsx
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="danger">Danger</Button>
```

**期待される結果:**

1. 各バリアントに対応するクラスが付与
2. 色が正しく適用
3. 機能は同じ

**検証項目:**

```javascript
expect(screen.getByText("Primary")).toHaveClass("variant-primary");
expect(screen.getByText("Danger")).toHaveClass("variant-danger");
```

---

#### TC-004: disabled 状態

```
カテゴリ: 正常系
優先度: 高
```

**前提条件:**

- Button コンポーネントが disabled プロップをサポート

**入力:**

```jsx
<Button disabled>Disabled Button</Button>
```

**期待される結果:**

1. button 要素に disabled 属性が設定
2. クリック時に onClick が呼ばれない
3. グレーアウト表示

**検証項目:**

```javascript
const button = screen.getByRole("button", { name: /disabled button/i });
expect(button).toBeDisabled();

// onClick が呼ばれないことを検証
const onClick = jest.fn();
render(
  <Button disabled onClick={onClick}>
    Disabled
  </Button>,
);
fireEvent.click(screen.getByRole("button"));
expect(onClick).not.toHaveBeenCalled();
```

---

#### TC-005: onClick イベントハンドリング

```
カテゴリ: 正常系
優先度: 高
```

**入力:**

```jsx
const onClick = jest.fn();
render(<Button onClick={onClick}>Click me</Button>);
// ボタンをクリック
fireEvent.click(screen.getByRole("button"));
```

**期待される結果:**

1. onClick コールバックが呼ばれる
2. 正確に 1 回呼ばれる
3. イベントオブジェクトが渡される

**検証項目:**

```javascript
expect(onClick).toHaveBeenCalledTimes(1);
expect(onClick).toHaveBeenCalledWith(expect.any(Object));
```

---

#### TC-006: loading 状態

```
カテゴリ: 正常系
優先度: 中
```

**入力:**

```jsx
<Button isLoading>Send</Button>
```

**期待される結果:**

1. ローディングスピナー表示
2. テキスト "Send" は非表示 または 薄い表示
3. onClick が呼ばれない（暗黙の disabled）

**検証項目:**

```javascript
expect(screen.getByRole("button")).toHaveClass("loading");
expect(screen.queryByText("Send")).not.toBeVisible();
```

---

### 3.2 異常系テストケース

#### TC-007: onClick でエラー発生時

```
カテゴリ: 異常系
優先度: 中
```

**入力:**

```jsx
const onClick = jest.fn(() => {
  throw new Error("Request failed");
});
render(<Button onClick={onClick}>Submit</Button>);
fireEvent.click(screen.getByRole("button"));
```

**期待される結果:**

1. エラーがキャッチされ、console.error でログ出力
2. UI が破損しない
3. ボタンは再度クリック可能（状態回復）

**検証項目:**

```javascript
// エラーがログ出力されていることを確認
expect(console.error).toHaveBeenCalled();

// UI が再度クリック可能
fireEvent.click(screen.getByRole("button"));
expect(onClick).toHaveBeenCalledTimes(2);
```

---

#### TC-008: 非同期 onClick

```
カテゴリ: 正常系 (非同期)
優先度: 中
```

**入力:**

```jsx
const onClick = jest.fn(async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
});
render(<Button onClick={onClick}>Async</Button>);
fireEvent.click(screen.getByRole("button"));
```

**期待される結果:**

1. loading 状態に移行（UI が変わる）
2. 非同期処理完了後、元の状態に戻る
3. 処理中は onClick が重複実行されない

**検証項目:**

```javascript
await waitFor(() => {
  expect(onClick).toHaveBeenCalledTimes(1);
});
```

---

### 3.3 アクセシビリティテストケース

#### TC-009: アクセシビリティ属性

```
カテゴリ: 正常系 (A11Y)
優先度: 高
```

**入力:**

```jsx
<Button ariaLabel="Submit form">Submit</Button>
```

**期待される結果:**

1. aria-label 属性が設定
2. スクリーンリーダーが正しく読み上げ
3. キーボード操作（Tab キー）でフォーカス可能

**検証項目:**

```javascript
const button = screen.getByRole("button", { name: /submit form/i });
expect(button).toHaveAttribute("aria-label", "Submit form");

// キーボード操作テスト
fireEvent.keyDown(button, { key: "Enter", code: "Enter" });
expect(onClick).toHaveBeenCalled();
```

---

### 3.4 統合テストケース

#### TC-010: 複数 props 組み合わせ

```
カテゴリ: 正常系 (統合)
優先度: 低
```

**入力:**

```jsx
<Button size="large" variant="danger" disabled onClick={onClick}>
  Delete
</Button>
```

**期待される結果:**

1. すべての props が正しく適用
2. disabled 状態が優先（onClick 呼ばれない）
3. スタイルが正しく合成

**検証項目:**

```javascript
const button = screen.getByRole("button");
expect(button).toHaveClass("size-large", "variant-danger");
expect(button).toBeDisabled();
```

---

````

### セクション 5: 実装ノート

```markdown
## 4. 実装ノート (Implementation Notes)

### 4.1 設計判断と理由

#### 判断 1: Props インターフェースの設計
**決定:** disabled と isLoading を別プロップにする（一つにしない）

**理由:**
- 意味的に明確: disabled は永続的、loading は一時的
- UI 表示が異なる: disabled は グレーアウト、loading はスピナー
- 拡張性: 将来的に状態の組み合わせが必要になる可能性

**代替案と却下理由:**
1. state = 'disabled' | 'loading' | 'idle'
   - 却下: 複数状態の同時成立をサポートできない

---

#### 判断 2: スタイリング手法（Tailwind + CSS Modules）
**決定:** Tailwind でユーティリティクラス、複雑なスタイルは CSS Modules

**理由:**
- 開発速度: Tailwind で素早く実装
- 保守性: CSS Modules で複雑なロジックを分離
- パフォーマンス: 両者とも tree-shaking に対応

**実装例:**
```tsx
// Tailwind で基本スタイル
<button className="px-4 py-2 rounded border">

// CSS Modules で複雑なスタイル
<button className={`${styles.button} ${styles[size]} ${styles[variant]}`}>
````

---

#### 判断 3: onclick エラーハンドリング

**決定:** エラーを try-catch でキャッチし、console.error でログ出力

**理由:**

- UI が破損しない（重要）
- 開発者が問題を診断可能
- ユーザーに適切なフィードバック

**実装例:**

```typescript
const handleClick = async () => {
  try {
    await onClick?.();
  } catch (error) {
    console.error("Button onClick error:", error);
    // UI フィードバック（トースト等）
  }
};
```

---

### 4.2 参考ドキュメント

| ドキュメント                                                                    | 理由             |
| ------------------------------------------------------------------------------- | ---------------- |
| [Button コンポーネント設計書](../03_design/features/button-design.md)           | デザイン詳細     |
| [UI ライブラリ仕様](../03_design/specifications/ui-library-specs.md)            | プロジェクト標準 |
| [アクセシビリティガイド](../03_design/specifications/a11y-guidelines.md)        | WCAG 準拠方法    |
| [React ベストプラクティス](../03_design/specifications/react-best-practices.md) | 実装パターン     |

---

### 4.3 既知の制限事項

| 制限                                    | 理由             | 代替案                                  |
| --------------------------------------- | ---------------- | --------------------------------------- |
| onClick は 1 つのコールバックのみ       | シンプルさを優先 | 複数ハンドラは props オブジェクトで拡張 |
| children は React.ReactNode のみ        | 型安全性         | 複雑な JSX は別コンポーネント化         |
| カスタムスタイルは className で上書き可 | 柔軟性           | CSS Modules の specificity に注意       |

---

### 4.4 将来の拡張ポイント

- [ ] Tooltip サポート
- [ ] Badge 表示
- [ ] Split Button（ドロップダウン）
- [ ] Button Group コンポーネント
- [ ] Link as Button（a タグで button 風表示）

---

## 5. テスト実行手順

```bash
# 単体テスト実行
npm test Button.test.tsx

# watch モード
npm test Button.test.tsx -- --watch

# カバレッジ
npm test Button.test.tsx -- --coverage

# 特定のテストケースのみ実行
npm test Button.test.tsx -t "TC-001"
```

---

## 6. 実装チェックリスト

実装完了時に確認:

- [ ] すべてのテストケース（TC-001～TC-010）がパス
- [ ] コードカバレッジが 90% 以上
- [ ] TypeScript strict モードでエラーなし
- [ ] ESLint / Prettier に対応
- [ ] 実装ノートの設計判断を確認
- [ ] アクセシビリティ（a11y）確認
- [ ] パフォーマンス（バンドルサイズ）確認

---

## 📝 変更履歴

| 日付       | ステータス | 変更内容           |
| ---------- | ---------- | ------------------ |
| 2025-10-22 | Draft      | 初版作成           |
| 2025-10-23 | Review     | 仕様書レビュー実施 |
| 2025-10-24 | Approved   | 承認完了、実装開始 |

---

**ファイルパス:** `src/components/Button/Button.spec.md`
**最終更新:** 2025-10-22
**作成者:** AI (Grok Code Fast 1)
**ステータス:** Draft

```

---

## クイック参考：主要セクション

| セクション | 内容 | 対象者 |
|----------|------|--------|
| 1. ファイルヘッダー | メタ情報、関連ドキュメント | 全員 |
| 2. 仕様定義 | 機能・非機能要件 | 開発者、テスター |
| 3. テストケース | TC-001～TC-010 の詳細 | テスター、実装者 |
| 4. 実装ノート | 設計判断、参考資料 | 実装者 |
| 5-6. 実行・チェック | テスト実行、確認リスト | 全員 |

---

## 🎯 使用フロー

### **実装前:**
1. spec.md を作成（このテンプレートを埋める）
2. レビューを実施（チームで承認）

### **テスト実装:**
1. spec.md の Test Cases セクションを確認
2. test.tsx で各 TC を実装（最初はすべて FAIL）
3. テストが通るまで反復

### **実装:**
1. test.tsx をすべて PASS させるように implementation.tsx を実装
2. 実装ノートの設計判断に従う

### **確認:**
1. すべてのテスト PASS を確認
2. 実装チェックリストをクリア

---

## 🔗 関連ドキュメント

- [AI ドキュメント駆動開発ガイド](./ai-documentation.md)
- [命名規則](./naming-conventions.md)
- [コード品質基準](./code-quality-standards.md)

---

**最終更新:** 2025-10-22
**作成者:** AI (Grok Code Fast 1)
```
