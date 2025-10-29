# 命名規則

**対象:** 全開発者・AI
**最終更新:** 2025-10-22

---

## 概要

このプロジェクトでは、以下の命名規則に従い、ファイル・ディレクトリ・変数・関数・クラスの名前を付けます。

命名の一貫性により、コード理解の効率化、IDE 検索性能の向上、AI との連携精度の向上を実現します。

---

## 1. ファイル・ディレクトリの命名規則

### 1.1 TypeScript / JavaScript ファイル

#### コンポーネントファイル

```
PascalCase を使用
例:
  - Button.tsx
  - Modal.tsx
  - UserProfile.tsx
```

**理由**: React コンポーネントは PascalCase が慣例

#### ユーティリティ / サービスファイル

```
camelCase を使用
例:
  - calculateTotal.ts
  - apiClient.ts
  - validateEmail.ts
```

**理由**: 関数・ロジックは camelCase が慣例

#### テストファイル

```
{FileName}.test.tsx または {FileName}.test.ts
例:
  - Button.test.tsx
  - calculateTotal.test.ts
```

**ルール**:

- テスト対象のファイル名と同じ
- 拡張子は `.test.tsx` / `.test.ts`
- Jest / Vitest の自動検出に対応

#### 仕様書ファイル（重要）

```
{FileName}.spec.md
例:
  - Button.spec.md
  - calculateTotal.spec.md
  - apiClient.spec.md
```

**配置**: テスト対象のコンポーネント・ロジックと同じディレクトリ
**内容**: 仕様定義 + テストケース定義（詳細は [`.spec.md` テンプレート](./spec-template.md)）

#### 依存関係ファイル（NEW）

```
{FileName}.dependency.md
例:
  - Button.dependency.md
  - calculateTotal.dependency.md
  - useAuth.dependency.md
```

**配置**: テスト対象のコンポーネント・ロジックと同じディレクトリ
**内容**: 親子関係・使用先・依存先の詳細マップ（詳細は [依存関係追跡ガイド](./dependency-mapping.md)）
**用途**: 修正時の影響範囲判定、リファクタリングのリスク評価

#### その他のファイル

```
ファイルタイプに応じた拡張子を使用
- .ts: TypeScript (コンポーネント以外)
- .tsx: React コンポーネント
- .css: スタイル
- .json: 設定・データ
```

### 1.2 ディレクトリ（フォルダ）

#### コンポーネントディレクトリ

```
PascalCase + 機能単位でグループ化
例:
  src/components/
    ├── Button/
    │   ├── Button.tsx
    │   ├── Button.spec.md
    │   ├── Button.test.tsx
    │   ├── Button.dependency.md
    │   └── Button.module.css
    ├── Modal/
    ├── Form/
    │   ├── Input/
    │   ├── Select/
    │   └── Checkbox/
    └── Layout/
        ├── Header/
        └── Footer/
```

**ルール**:

- 1 コンポーネント = 1 ディレクトリ（の原則）
- 関連コンポーネントは親ディレクトリでグループ化
- ディレクトリ名 = export するコンポーネント名
- 大規模コンポーネントには `.dependency.md` を配置

#### ロジック・サービスディレクトリ

```
camelCase + 機能単位
例:
  src/
    ├── services/
    │   ├── api/
    │   ├── auth/
    │   └── storage/
    ├── utils/
    │   ├── validation/
    │   └── formatting/
    └── hooks/
        ├── useAuth/
        └── useFetch/
```

#### ドキュメントディレクトリ

```
snake_case + 日付（作業ログ等）
例:
  docs/
    ├── 01_planning/
    ├── 02_requirements/
    ├── 03_design/
    ├── 04_implementation/
    │   └── plans/
    │       └── button-component/
    ├── 07_research/
    │   └── 2025_10/
    ├── 08_worklogs/
    │   └── 2025_10/
    │       └── 20251022_01_button-implementation.md
    └── issues/
        ├── open/
        │   └── 2025_10/
        │       └── 20251022/
        └── resolved/
```

---

## 2. 変数の命名規則

### 2.1 基本ルール

```
camelCase を使用（定数は UPPER_SNAKE_CASE）
例:
  let userName = "John";
  let isActive = true;
  let itemCount = 5;
  const API_BASE_URL = "https://api.example.com";
  const MAX_RETRY_COUNT = 3;
```

### 2.2 真偽値

```
is, has, can, should で始める
例:
  const isVisible = true;
  const hasError = false;
  const canEdit = true;
  const shouldRefresh = false;
```

### 2.3 配列

```
複数形または Array suffix
例:
  const users = [];
  const buttonIds = [1, 2, 3];
  const itemsArray = [];
```

### 2.4 コールバック関数

```
on{EventName} または handle{EventName}
例:
  const onClickButton = () => {};
  const handleFormSubmit = () => {};
  const onUserLogin = () => {};
```

### 2.5 列挙値（Enum）

```
PascalCase、値は UPPER_SNAKE_CASE
例:
  enum ButtonVariant {
    PRIMARY = 'PRIMARY',
    SECONDARY = 'SECONDARY',
    DANGER = 'DANGER',
  }
```

### 2.6 ループ変数

```
シンプルな変数名を使用
ただし、意味のあるスコープなら descriptive に
例:
  // 短いループ
  for (let i = 0; i < 10; i++) { }

  // 意味のあるループ
  users.forEach(user => {
    console.log(user.name);
  });

  // 複数レベルのループ避ける
  // 避ける:
  // for (let i = 0; i < 10; i++) {
  //   for (let j = 0; j < 10; j++) {
  //     // ここで i, j の意味が不明確
  //   }
  // }
```

---

## 3. 関数・メソッドの命名規則

### 3.1 基本ルール

```
camelCase を使用
動詞で始まる場合が多い
例:
  function calculateTotal() {}
  function validateEmail() {}
  function fetchUserData() {}
```

### 3.2 関数の種類別

#### データ取得

```
get{DataName} または fetch{DataName}
例:
  function getUsername() { }
  function fetchUserList() { }
  function getUserById(id) { }
```

#### データ変換

```
{verb}{NounType} または convert, transform, format
例:
  function formatDate(date) { }
  function parseJSON(json) { }
  function normalizeUrl(url) { }
  function convertToArray(data) { }
```

#### 検証

```
is{Condition} または validate, check
例:
  function isValidEmail(email) { }
  function validateUserInput(input) { }
  function checkPermission(user) { }
```

#### 状態更新（React Hooks）

```
set{StateName}
例:
  const [count, setCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
```

#### カスタム Hooks

```
use{FunctionalityName}
例:
  function useAuth() { }
  function useFetch(url) { }
  function useLocalStorage(key) { }
  function useToggle(initialValue) { }
```

#### プライベートメソッド

```
# プレフィックス（TypeScript では private キーワード推奨）
例:
  private _internalCalculation() { }
  private handleInternalError() { }
```

#### 非同期関数

```
async 関数は await を使う側で明確になるため、
特別なプレフィックスは不要
例:
  async function fetchUser(id) { }
  async function saveData(data) { }
```

### 3.3 単語の選択

**推奨する動詞**:

| 操作         | 関数名                            |
| ------------ | --------------------------------- |
| データ取得   | get, fetch, load                  |
| データ作成   | create, make, build               |
| データ更新   | update, set, modify               |
| データ削除   | delete, remove, clear             |
| データ検証   | validate, check, is, has          |
| データ変換   | convert, transform, format, parse |
| イベント処理 | handle, on                        |
| エラー処理   | catch, handle                     |

---

## 4. クラス・インターフェースの命名規則

### 4.1 クラス

```
PascalCase を使用
名詞で表現（〇〇Manager, 〇〇Service など）
例:
  class UserManager { }
  class ApiClient { }
  class ValidationService { }
```

### 4.2 インターフェース

```
PascalCase を使用
I プレフィックスは不要（慣例に基づき、必要に応じて付与）
例:
  interface User { }
  interface ButtonProps { }
  interface ApiResponse { }
```

### 4.3 型定義

```
PascalCase を使用
interface は値を持たない型定義に使用
type は Union, Tuple などに使用
例:
  type ButtonSize = 'small' | 'medium' | 'large';
  type EventHandler = (event: Event) => void;
  interface ComponentProps { }
```

---

## 5. React コンポーネントプロップ命名規則

### 5.1 基本ルール

```
camelCase で命名
boolean プロップは is, has で始める
例:
  interface ButtonProps {
    label: string;
    onClick: () => void;
    isDisabled: boolean;
    hasIcon: boolean;
    size: 'small' | 'medium' | 'large';
  }
```

### 5.2 React の組み込みプロップ名に合わせる

```
標準的な HTML 属性と一致させる
例:
  // 推奨
  <input
    className={styles.input}
    placeholder="Enter name"
    disabled={isDisabled}
  />

  // カスタムプロップ
  <Button
    label="Submit"
    onClick={handleSubmit}
    isLoading={isSubmitting}
  />
```

---

## 6. ドキュメント（マークダウン）ファイル命名規則

### 6.1 日付を含むドキュメント

```
YYYYMMDD_{2桁番号}_{説明}.md
例:
  20251022_01_button-implementation.md
  20251022_02_button-styling-plan.md
  20251021_01_ui-research.md
```

**ルール**:

- すべてのドキュメントに日付を付ける（例外: README.md）
- 同日複数ドキュメント: 02, 03, ... と連番
- 2 桁ゼロパディングで統一（検索・ソート時の可読性）

### 6.2 カテゴリ別

```
docs/ 配下のカテゴリ別命名

設計書:
  docs/03_design/features/
    - button-component-design.md
    - modal-design.md

実装計画:
  docs/03_plans/{機能名}/
    - 20251022_01_implementation-plan.md
    - README.md

調査レポート:
  docs/02_research/YYYY_MM/
    - 20251022_01_ui-library-research.md
    - 20251022_02_state-management-research.md

作業ログ:
  docs/05_logs/YYYY_MM/YYYYMMDD/
    - 20251022_01_button-implementation.md
    - 20251022_02_testing-phase.md

問題管理:
  docs/01_issues/open|resolved/YYYY_MM/YYYYMMDD/
    - 20251022_01_unused-import-in-button.md
    - 20251022_02_performance-issue.md
```

### 6.3 README.md

```
特別な場合を除き、日付不要
配置:
  - docs/README.md (ドキュメント全体の説明)
  - docs/{category}/README.md (カテゴリの説明)
  - docs/03_plans/{機能名}/README.md (実装計画の概要)
  - docs/05_logs/YYYY_MM/README.md (月別ログの概要)
```

---

## 7. .spec.md ファイルの位置付け（重要）

### ファイル構造

```
src/
├── components/
│   ├── Button/
│   │   ├── index.ts
│   │   ├── Button.tsx              ← 実装ファイル
│   │   ├── Button.module.css       ← スタイル
│   │   ├── Button.spec.md          ← 仕様書 (AIが参照)
│   │   └── Button.test.tsx         ← テストコード
│
├── utils/
│   ├── calculateTotal.ts           ← 実装ファイル
│   ├── calculateTotal.spec.md      ← 仕様書 (AIが参照)
│   └── calculateTotal.test.ts      ← テストコード
```

### 命名規則

```
{FileName}.spec.md

例:
  Button.spec.md              ← Button.tsx の仕様書
  calculateTotal.spec.md      ← calculateTotal.ts の仕様書
  apiClient.spec.md           ← apiClient.ts の仕様書
  useAuth.spec.md             ← useAuth.ts (Hook) の仕様書
```

### spec.md ファイルの役割

| ファイル          | 役割                    | 作成者                               |
| ----------------- | ----------------------- | ------------------------------------ |
| `{File}.spec.md`  | 仕様定義 + テストケース | AI / 開発者（設計段階）              |
| `{File}.test.tsx` | テストコード実装        | AI / 開発者（spec.md に基づく）      |
| `{File}.tsx`      | 実装コード              | AI / 開発者（test.tsx をパスさせる） |

### 依存関係マップファイル

```
{File}.dependency.md

Button.dependency.md            ← Button.tsx の依存関係詳細
calculateTotal.dependency.md    ← calculateTotal.ts の依存関係詳細
useAuth.dependency.md           ← useAuth.ts (Hook) の依存関係詳細
```

**役割**: 親子関係・使用先・依存先の詳細マップ
**詳細**: [依存関係追跡ガイド](./dependency-mapping.md) を参照

### spec.md + dependency.md ファイルの役割

| ファイル               | 役割                    | 作成者                               |
| ---------------------- | ----------------------- | ------------------------------------ |
| `{File}.spec.md`       | 仕様定義 + テストケース | AI / 開発者（設計段階）              |
| `{File}.dependency.md` | 親子関係・影響範囲      | 開発者（修正時に更新）               |
| `{File}.test.tsx`      | テストコード実装        | AI / 開発者（spec.md に基づく）      |
| `{File}.tsx`           | 実装コード              | AI / 開発者（test.tsx をパスさせる） |

### spec.md 内容

```markdown
# Button.spec.md

## Specifications (仕様)

- 要件①
- 要件②

## Test Cases (テストケース)

### TC-001: 基本レンダリング

...

### TC-002: disabled 状態

...

## Implementation Notes (実装ノート)

- 設計判断
- 参考ドキュメント
```

詳細は [`.spec.md` テンプレート](./spec-template.md) を参照。

---

## 8. 命名規則チェックリスト

### ✅ ファイル名

- [ ] TypeScript コンポーネント: PascalCase (Button.tsx)
- [ ] TypeScript ロジック: camelCase (calculateTotal.ts)
- [ ] テストファイル: {FileName}.test.tsx
- [ ] 仕様書ファイル: {FileName}.spec.md
- [ ] ドキュメント: YYYYMMDD*{番号}*{説明}.md

### ✅ ディレクトリ名

- [ ] コンポーネント: PascalCase (src/components/Button/)
- [ ] ロジック: camelCase (src/utils/validation/)
- [ ] ドキュメント: snake_case (docs/02_research/2025_10/)

### ✅ 変数名

- [ ] 標準: camelCase (userName)
- [ ] 定数: UPPER_SNAKE_CASE (API_BASE_URL)
- [ ] 真偽値: is/has/can/should 接頭辞 (isVisible, hasError)
- [ ] コールバック: on/handle (onClick, handleSubmit)

### ✅ 関数名

- [ ] 標準: camelCase (calculateTotal)
- [ ] データ取得: get/fetch (getUser, fetchData)
- [ ] 検証: is/validate/check (isValidEmail)
- [ ] Custom Hook: use (useAuth, useFetch)

### ✅ クラス・インターフェース名

- [ ] PascalCase (UserManager, ButtonProps)

---

## 9. 他のプロジェクトとの互換性

### ESLint 設定との整合

```json
// .eslintrc.json の相関確認
{
  "rules": {
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": "variable",
        "format": ["camelCase", "UPPER_SNAKE_CASE"]
      },
      {
        "selector": "function",
        "format": ["camelCase"]
      },
      {
        "selector": "typeLike",
        "format": ["PascalCase"]
      }
    ]
  }
}
```

---

## 🔗 関連ドキュメント

- [AI ドキュメント駆動開発ガイド](./ai-documentation.md)
- [`.spec.md` テンプレート](./spec-template.md)
- [コンポーネント・ロジック依存関係追跡ガイド](./dependency-mapping.md)
- [ドキュメント管理ガイド](./documentation-management.md)

---

**最終更新**: 2025-10-22
**作成者**: AI (Grok Code Fast 1)
