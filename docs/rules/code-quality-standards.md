# コード品質基準

**対象:** 全開発者
**最終更新:** 2025-10-22

---

## 概要

このドキュメントは、このプロジェクトにおけるコード品質の基準を定めます。

すべての新規機能・修正は、以下の基準を満たす必要があります。

---

## 1. エラーハンドリング

### 1.1 基本原則

```
すべての外部 API・ネットワーク通信は失敗する可能性を考慮
エラー発生時は clear, actionable なメッセージを提供
エラーは抑制（@ts-ignore, try-catch で握りつぶす）ではなく、根本原因を修正
```

### 1.2 必須要件

#### ✅ 非同期処理は必ず error handling

```typescript
// ❌ Bad: エラーハンドリングなし
async function fetchUser(userId: number) {
  const response = await fetch(`/api/users/${userId}`);
  const data = await response.json();
  return data;
}

// ✅ Good: 適切なエラーハンドリング
async function fetchUser(userId: number): Promise<User | null> {
  try {
    const response = await fetch(`/api/users/${userId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: User = await response.json();

    if (!data || typeof data !== "object") {
      throw new Error("Invalid user data format");
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch user:", { userId, error });
    // ユーザーフレンドリーなエラーメッセージ
    if (error instanceof NetworkError) {
      throw new Error("ネットワーク接続に問題があります。");
    }
    throw new Error("ユーザー情報の取得に失敗しました。");
  }
}
```

#### ❌ @ts-ignore は使用禁止

```typescript
// ❌ Bad: 型エラーを無視
// @ts-ignore
const result = unknownFunction();

// ✅ Good: 根本原因を修正
function unknownFunction(): unknown {
  // ...
}
const result = unknownFunction();

// または型安全に使用
if (typeof result === "string") {
  console.log(result.toUpperCase());
}
```

#### ✅ タイムアウト処理

```typescript
// ✅ Good: タイムアウト設定
async function fetchWithTimeout(url: string, timeout = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("リクエストがタイムアウトしました。");
    }
    throw error;
  }
}
```

#### ✅ リトライ機構

```typescript
// ✅ Good: 指数バックオフでリトライ
async function fetchWithRetry(url: string, maxRetries = 3, initialDelay = 1000): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;

      // 4xx エラーはリトライしない
      if (response.status < 500) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      lastError = error as Error;

      if (i < maxRetries - 1) {
        // 指数バックオフ
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Retry in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} retries: ${lastError?.message}`);
}
```

### 1.3 エラーログの構造化

```typescript
// ❌ Bad: 情報が少ない
console.error("Failed");

// ✅ Good: コンテキスト情報を含める
console.error("API request failed", {
  url,
  method,
  status: response.status,
  timestamp: new Date().toISOString(),
  userId: getCurrentUserId(),
  error: error.message,
});

// Sentry 等のエラートラッキングサービスに送信
captureException(error, {
  tags: { component: "UserForm" },
  contexts: { http: { url, method, status } },
});
```

---

## 2. テスト要件

### 2.1 カバレッジ目標

```
行カバレッジ:     ≥ 80%
分岐カバレッジ:   ≥ 75%
関数カバレッジ:   ≥ 85%
ステートメント:   ≥ 80%
```

### 2.2 テスト対象

#### ✅ 必須（常にテスト）

```typescript
// 1. ロジック関数・ユーティリティ
function calculateTotal(items: Item[]): number { }

// 2. React コンポーネント（正常系・異常系）
<Button onClick={handleClick}>Submit</Button>

// 3. カスタム Hooks
function useAuth() { }

// 4. API クライアント
class ApiClient { }

// 5. エラーハンドリング
try { ... } catch (error) { ... }
```

#### ⚠️ テスト困難（最小限の coverage）

```typescript
// 1. 外部ライブラリの wrapper
// （ライブラリ自体はテスト済み）
export const useLocalStorage = (key: string) => {
  return localStorage.getItem(key);
};

// 2. UI フレームワーク内部
// （React.FC の型チェック等）
```

### 2.3 テスト種別

#### ユニットテスト

```typescript
describe("calculateTotal", () => {
  test("should return sum of item prices", () => {
    const items = [{ price: 10 }, { price: 20 }];
    expect(calculateTotal(items)).toBe(30);
  });

  test("should return 0 for empty array", () => {
    expect(calculateTotal([])).toBe(0);
  });

  test("should ignore items with negative price", () => {
    const items = [{ price: 10 }, { price: -5 }];
    expect(calculateTotal(items)).toBe(10);
  });
});
```

#### 統合テスト

```typescript
describe("User registration flow", () => {
  test("should create user and send email", async () => {
    const { user } = await registerUser({
      email: "test@example.com",
      password: "secure123",
    });

    expect(user.email).toBe("test@example.com");
    expect(sendEmailMock).toHaveBeenCalled();
  });
});
```

#### E2E テスト

```typescript
describe("User login flow", () => {
  test("should login and redirect to dashboard", async () => {
    await page.goto("http://localhost:3000/login");
    await page.fill('[data-testid="email-input"]', "user@example.com");
    await page.fill('[data-testid="password-input"]', "password123");
    await page.click('[data-testid="submit-button"]');

    await page.waitForURL("**/dashboard");
    expect(page.url()).toContain("/dashboard");
  });
});
```

### 2.4 テストの品質

#### ✅ Good なテスト

```typescript
describe('Button', () => {
  // テスト名が明確
  test('should call onClick handler exactly once when clicked', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click</Button>);

    // Arrange: 準備
    // Act: 実行
    fireEvent.click(screen.getByRole('button'));

    // Assert: 検証
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

#### ❌ Bad なテスト

```typescript
describe('Button', () => {
  // テスト名が曖昧
  test('works correctly', () => {
    // 複数の機能をテスト（テスト間に依存）
    const component = render(<Button>Test</Button>);
    fireEvent.click(component.getByRole('button'));
    // 複数の expect が混在
    expect(component).toBeTruthy();
    expect(true).toBe(true);
  });
});
```

### 2.5 テスト間の独立性

```typescript
// ❌ Bad: テスト間に依存
let globalState = 0;

test("test A", () => {
  globalState = 10;
  expect(globalState).toBe(10);
});

test("test B", () => {
  // globalState が前のテストに依存
  expect(globalState).toBe(10);
});

// ✅ Good: 各テストが独立
beforeEach(() => {
  setupTestState();
});

test("test A", () => {
  const state = 10;
  expect(state).toBe(10);
});

test("test B", () => {
  const state = 10;
  expect(state).toBe(10);
});
```

---

## 3. パフォーマンス指標

### 3.1 バンドルサイズ

```
JavaScript: < 500KB (gzip 圧縮後)
CSS: < 100KB (gzip 圧縮後)
コンポーネント単体: < 10KB
```

### 3.2 レンダリングパフォーマンス

```
First Paint (FP):         < 1s
First Contentful Paint:   < 1.5s
Largest Contentful Paint: < 2.5s
Cumulative Layout Shift:  < 0.1

React render:             < 16ms (60fps)
```

### 3.3 測定方法

```typescript
// React DevTools Profiler
// Performance API
const start = performance.now();
// ... 処理 ...
const duration = performance.now() - start;
console.log(`Operation took ${duration}ms`);

// Web Vitals ライブラリ
import { getCLS, getFID, getFCP } from "web-vitals";
getCLS(console.log);
```

### 3.4 最適化チェック

- [ ] コンポーネントが不必要に再レンダリング
- [ ] memo / useMemo / useCallback が適切に使用されている
- [ ] 大規模配列が効率的に処理されている
- [ ] N+1 クエリ問題がない

---

## 4. セキュリティガイドライン

### 4.1 入力検証

```typescript
// ❌ Bad: ユーザー入力を直接使用
function processUserInput(input: string) {
  return eval(input); // XSS 脆弱性
}

// ✅ Good: 入力を検証・サニタイズ
function processUserInput(input: string) {
  const sanitized = DOMPurify.sanitize(input);

  // バリデーション
  if (!isValidEmail(sanitized)) {
    throw new Error("メールアドレスが正しくありません。");
  }

  return sanitized;
}
```

### 4.2 環境変数・シークレット

```typescript
// ❌ Bad: API キーをハードコード
const API_KEY = "sk-1234567890";

// ✅ Good: 環境変数を使用
const API_KEY = process.env.REACT_APP_API_KEY;

if (!API_KEY) {
  throw new Error("REACT_APP_API_KEY is not set");
}
```

### 4.3 CORS・認証

```typescript
// ✅ Good: CORS ヘッダー設定
const response = await fetch(url, {
  credentials: 'include',  // Cookie を送信
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

// ✅ Good: 外部リンクは安全に
<a
  href={externalUrl}
  rel="noopener noreferrer"
  target="_blank"
>
  External Link
</a>
```

### 4.4 チェック項目

- [ ] API キーが環境変数で管理されている
- [ ] ユーザー入力が検証・サニタイズされている
- [ ] XSS 対策（HTML エスケープ等）が実装
- [ ] CSRF トークンが設定されている
- [ ] 外部リンクに rel="noopener noreferrer"
- [ ] 最小権限の原則に従っている

---

## 5. 型安全性（TypeScript）

### 5.1 Strict Mode 必須

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### 5.2 型定義要件

```typescript
// ❌ Bad: any 型の使用
function processData(data: any) {
  return data.value;
}

// ✅ Good: 具体的な型定義
interface DataItem {
  value: string;
}

function processData(data: DataItem): string {
  return data.value;
}
```

### 5.3 Union / Intersection 型

```typescript
// ✅ Good: Union で複数型を許可
type Response = Success | Error;

interface Success {
  status: "success";
  data: User[];
}

interface Error {
  status: "error";
  message: string;
}

function handleResponse(response: Response) {
  if (response.status === "success") {
    // data へアクセス可能
    console.log(response.data);
  }
}
```

---

## 6. 依存関係管理

### 6.1 新規依存関係の追加

追加前にチェック：

- [ ] ライセンスが許可的か（MIT, Apache 2.0 等）
- [ ] メンテナンス状況は良好か
- [ ] バンドルサイズは許容範囲か
- [ ] セキュリティ脆弱性がないか

```bash
# ライセンス確認
npm view {package} license

# セキュリティチェック
npm audit

# バンドルサイズ確認
npm info {package} dist.tarball | tar xz -O package/package.json | grep main
```

### 6.2 依存関係の更新

```bash
# セキュリティアップデート
npm audit fix

# マイナーアップデート
npm update

# 定期的な確認（月1回推奨）
npm outdated
```

### 6.3 package-lock.json

```
必ずコミット
ローカル・CI 環境で一貫した依存関係を確保
```

---

## 7. 実装チェックリスト

新規機能・修正完了時：

### コード品質

- [ ] ESLint エラーなし
- [ ] Prettier でフォーマット済
- [ ] TypeScript strict モードでエラーなし
- [ ] コメントは英語

### テスト

- [ ] ユニットテスト実装済み
- [ ] 行カバレッジ ≥ 80%
- [ ] エッジケースをテスト
- [ ] テスト間に依存なし

### エラーハンドリング

- [ ] 非同期処理に error handling
- [ ] @ts-ignore がない
- [ ] タイムアウト処理あり
- [ ] ユーザーフレンドリーなエラーメッセージ

### パフォーマンス

- [ ] バンドルサイズを確認
- [ ] 不必要な再レンダリングなし
- [ ] N+1 問題がない
- [ ] ログが過剰でない

### セキュリティ

- [ ] 入力検証がある
- [ ] API キーが環境変数
- [ ] XSS 対策実装済
- [ ] 外部リンクが安全

### ドキュメント

- [ ] 仕様書（.spec.md）作成済
- [ ] 関数に JSDoc コメント
- [ ] 設計判断を記録
- [ ] 作業ログ記録済

---

## 🔗 関連ドキュメント

- [言語規則](./language-rules.md)
- [命名規則](./naming-conventions.md)
- [`.spec.md` テンプレート](./spec-template.md)

---

**最終更新:** 2025-10-22
**作成者:** AI (Grok Code Fast 1)
