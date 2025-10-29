# 言語規則

**対象:** 全開発者
**最終更新:** 2025-10-22

---

## 概要

このプロジェクトでは、コードの用途に応じて言語を使い分けることで、以下を実現します：

- グローバルな開発環境での可読性を確保
- 日本語話者チームとの コミュニケーション効率化
- AI モデルとの連携精度向上

---

## 1. コード内コメント（英語）

### 1.1 基本ルール

```typescript
// Use English for code comments
// 英語でコメントを記述してください

// ✅ Good
function calculateTotal(items: Item[]): number {
  // Filter out items with zero price
  const validItems = items.filter((item) => item.price > 0);

  // Sum all item prices
  return validItems.reduce((sum, item) => sum + item.price, 0);
}

// ❌ Bad
function calculateTotal(items: Item[]): number {
  // ゼロ価格の商品をフィルタリング
  const validItems = items.filter((item) => item.price > 0);

  // すべての商品の価格を合計
  return validItems.reduce((sum, item) => sum + item.price, 0);
}
```

### 1.2 何を、なぜ、どうするか

コメントは「なぜ」を説明します。「何を」はコードで表現してください。

```typescript
// ❌ Bad: 何をしているか説明（コードが明確だから不要）
let x = arr.length; // Get array length

// ✅ Good: なぜ必要か説明
let maxRetries = 3;  // Limit retries to prevent infinite loops

// ❌ Bad: 長すぎるコメント
// This function processes user input by validating email format
// and checking if the user exists in the database
function validateUser(email: string): boolean {

// ✅ Good: 簡潔で目的を明確に
function validateUser(email: string): boolean {
  // Return false if email format is invalid
```

### 1.3 コメントの種類と形式

#### 関数・クラスの説明（JSDoc）

```typescript
/**
 * Calculates total price of items after applying discounts.
 *
 * @param items - Array of items to process
 * @param discountRate - Discount rate (0-1)
 * @returns Total price after discount
 * @throws Error if items array is empty
 * @example
 * const total = calculateDiscount([item1, item2], 0.1);
 */
function calculateDiscount(items: Item[], discountRate: number): number {
  if (items.length === 0) {
    throw new Error("Items array must not be empty");
  }

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  return subtotal * (1 - discountRate);
}
```

#### 複雑なロジックの説明

```typescript
// Algorithm explanation when needed
function fibonacci(n: number): number {
  // Base cases: fib(0)=0, fib(1)=1
  if (n <= 1) return n;

  // Use iterative approach instead of recursion to avoid stack overflow
  // Time complexity: O(n), Space complexity: O(1)
  let prev = 0,
    curr = 1;
  for (let i = 2; i <= n; i++) {
    [prev, curr] = [curr, prev + curr];
  }
  return curr;
}
```

#### TODO・FIXME コメント

```typescript
// TODO: Optimize this function to handle large datasets
function processLargeData(data: any[]): any[] {
  // ...
}

// FIXME: Race condition detected when concurrent requests
async function fetchUserData(userId: number): Promise<User> {
  // ...
}

// NOTE: This workaround is needed due to browser compatibility issue
// See: https://github.com/issue/12345
function handleSpecialKeyEvent(e: KeyboardEvent): void {
  // ...
}
```

### 1.4 避けるべきコメント

```typescript
// ❌ 避ける: 日本語コメント
const userName = "John"; // ユーザー名

// ❌ 避ける: 過度に詳細
const x = 5; // Set x to 5

// ❌ 避ける: コードが明確なら不要
const isValid = email.includes("@"); // Check if email contains @

// ❌ 避ける: 古い/廃止予定コード
// const oldFunction = () => { ... };  // Don't use this

// ✅ 代替案: 明確な TODO か削除
// TODO: Remove this function in v2.0
// function oldFunction() { ... }
```

---

## 2. ドキュメント（日本語）

### 2.1 対象ファイル

以下のドキュメントは日本語で記述：

```
docs/
├── README.md                        # 日本語
├── 01_planning/
│   └── *.md                         # 日本語
├── 02_requirements/
│   └── *.md                         # 日本語
├── 03_design/
│   └── *.md                         # 日本語
├── 04_implementation/
│   └── *.md                         # 日本語
├── 07_research/
│   └── *.md                         # 日本語
├── 08_worklogs/
│   └── *.md                         # 日本語
├── issues/
│   └── *.md                         # 日本語
└── rules/
    └── *.md                         # 日本語
```

### 2.2 ドキュメント作成ルール

````markdown
# 機能タイトル（日本語）

**対象:** {対象者}
**最終更新:** YYYY-MM-DD

## セクション1: 概要

内容を日本語で記述します。

### 小セクション

詳細を日本語で記述します。

## セクション2: 実装例

コード例：

```typescript
// Code snippet
const result = calculate();
```
````

## 関連ドキュメント

- [ファイル名](./path/to/file.md)
- [外部リンク](https://example.com)

---

**最終更新:** YYYY-MM-DD

````

### 2.3 技術用語の表記

```markdown
✅ 推奨: 英語技術用語はそのまま使用
- React コンポーネント
- API レスポンス
- Jest テスト
- TypeScript 型定義

✅ 日本語化する場合は統一
- 一度定義したら、ドキュメント全体で同じ表記を使用

❌ 混在させない: 同じドキュメント内での不統一
- API レスポンス vs API 応答（混在させない）
````

### 2.4 ドキュメント例

````markdown
# Button コンポーネント実装計画

## 概要

Button コンポーネントは、ユーザーインタラクションの基本単位です。
複数のサイズとバリアントをサポートします。

## フェーズ1: 基本機能

- テキストレンダリング
- onClick イベントハンドリング
- disabled 状態

## 実装例

src/components/Button/Button.tsx:

```typescript
export const Button: React.FC<ButtonProps> = (props) => {
  return <button {...props}>{props.children}</button>;
};
```
````

````

---

## 3. 関数名・変数名（英語）

### 3.1 基本ルール

```typescript
// ✅ Good: 英語
const userName = 'John';
const calculateTotal = () => { };
class UserManager { }
interface ButtonProps { }

// ❌ Bad: 日本語
const ユーザー名 = 'John';
const 合計を計算 = () => { };
class ユーザー管理 { }
interface ボタンプロップ { }
````

### 3.2 理由

1. **IDE サポート**: 英語の方が autocomplete が優れている
2. **国際的なコラボレーション**: 英語が標準
3. **ライブラリ互換性**: npm パッケージは英語命名が慣例
4. **検索性**: 英語キーワードで検索しやすい

---

## 4. コミットメッセージ（英語）

### 4.1 Conventional Commits 形式

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

### 4.2 例

```
feat(Button): Add loading state support

Add isLoading prop to Button component to display loading spinner
during async operations.

- Add loading animation CSS
- Add TC-006 test case
- Update Button.spec.md

Fixes #123
Related to: docs/issues/open/2025_10/20251022_01_button-component.md
```

### 4.3 Type 一覧

| Type     | 説明               | 例                                           |
| -------- | ------------------ | -------------------------------------------- |
| feat     | 新機能追加         | feat(Button): Add size variant               |
| fix      | バグ修正           | fix(Modal): Fix z-index issue                |
| docs     | ドキュメント修正   | docs: Update naming conventions              |
| test     | テスト追加・修正   | test(Button): Add TC-005                     |
| refactor | リファクタリング   | refactor(utils): Simplify calculate function |
| chore    | ビルド・依存関係   | chore(deps): Update React to 18.2            |
| perf     | パフォーマンス改善 | perf(Button): Reduce bundle size             |
| ci       | CI 設定変更        | ci: Update GitHub Actions workflow           |

### 4.4 コミットメッセージ作成例

```bash
# ✅ Good
git commit -m "feat(Button): Add size variant support

Add small, medium, large size options to Button component.

- Update Button.spec.md with size requirements
- Implement size prop in Button.tsx
- Add TC-002 test cases
- Update CSS Modules

Closes #456"

# ❌ Bad
git commit -m "ボタンを修正した"
git commit -m "update button"
git commit -m "WIP"
```

---

## 5. エラーメッセージ

### 5.1 ユーザー向け（日本語）

エンドユーザーに表示されるメッセージは日本語：

```typescript
if (!isValidEmail(email)) {
  throw new Error("メールアドレスの形式が正しくありません。");
}

showToast("ファイルが正常に保存されました。");

alert("入力内容を確認してください。");
```

### 5.2 開発者向け（英語）

ログ、console.error は英語：

```typescript
console.error("Invalid email format provided: ", email);
console.warn("Deprecated function used. Use newFunction() instead.");
logger.info("User logged in", { userId, timestamp });
```

### 5.3 バランスの取り方

```typescript
// ✅ Good: ユーザーメッセージは日本語、ログは英語
try {
  await saveData(data);
} catch (error) {
  // ユーザーに表示
  showToast("保存に失敗しました。");

  // 開発者向けログ
  console.error("Data save failed:", error);
  logger.error("Save operation failed", {
    userId,
    timestamp,
    error: error.message,
  });
}
```

---

## 6. 複数言語ドキュメント

### 6.1 実装例

プロジェクトに英語版ドキュメントが必要な場合：

```
docs/
├── README.md              # 日本語（メイン）
├── README_en.md           # 英語（参考）
└── rules/
    ├── README.md          # 日本語
    ├── README_en.md       # 英語
```

### 6.2 作成ルール

- メイン言語（日本語）を先に作成
- 英語版は後付け
- ファイル名に `_en` サフィックス

---

## 7. チェックリスト

### コード内コメント

- [ ] すべてのコメントが英語か確認
- [ ] 「なぜ」を説明しているか
- [ ] 古い/廃止予定コメントに FIXME/TODO 表記があるか

### ドキュメント

- [ ] docs/ 配下が日本語か確認
- [ ] 技術用語が統一されているか
- [ ] 関連ドキュメントへのリンクがあるか

### 関数名・変数名

- [ ] すべてが英語か確認
- [ ] キャメルケース / PascalCase が正しいか

### コミット

- [ ] Conventional Commits 形式か確認
- [ ] 本文が英語か確認
- [ ] スコープが記述されているか

---

## 🔗 関連ドキュメント

- [命名規則](./naming-conventions.md)
- [AI ドキュメント駆動開発ガイド](./ai-documentation.md)
- [コード品質基準](./code-quality-standards.md)

---

**最終更新:** 2025-10-22
**作成者:** AI (Grok Code Fast 1)
