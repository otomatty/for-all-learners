# for-all-learners テストケース一覧

## 概要

**プロジェクト名**: for-all-learners  
**作成日**: 2025-08-03  
**テスト対象**: 学習支援プラットフォーム全機能  
**テストレベル**: 単体・統合・E2E・非機能テスト

このドキュメントは、for-all-learnersプラットフォームの包括的なテストケースを定義し、品質保証のための詳細なテスト手順を提供します。

## テスト戦略

### テストピラミッド構成
```
        /\
       /  \
      /E2E \     <- 20% (主要フロー、クリティカルパス)
     /______\
    /        \
   /統合テスト \   <- 30% (API、外部サービス連携)
  /____________\
 /              \
/   単体テスト   \  <- 50% (関数、コンポーネント、ビジネスロジック)
/________________\
```

### テスト環境
- **単体テスト**: Jest + Testing Library
- **統合テスト**: Supertest + Test Database
- **E2Eテスト**: Playwright + Test Environment
- **非機能テスト**: K6 + Lighthouse

## 単体テスト（Unit Tests）

### UT-001: 認証機能

#### UT-001-01: Google OAuth認証
```typescript
describe('Google OAuth Authentication', () => {
  test('正常なOAuth認証フローでユーザー情報を取得', async () => {
    // Given: 有効なOAuthレスポンス
    // When: OAuth認証を実行
    // Then: ユーザー情報が正しく取得される
  });
  
  test('無効なトークンでエラーハンドリング', async () => {
    // Given: 無効なOAuthトークン
    // When: 認証を試行
    // Then: 適切なエラーが返される
  });
});
```

#### UT-001-02: マジックリンク認証
```typescript
describe('Magic Link Authentication', () => {
  test('有効なメールアドレスでマジックリンク送信', async () => {
    // Given: 有効なメールアドレス
    // When: マジックリンクを送信
    // Then: 送信成功レスポンスを受け取る
  });
  
  test('無効なメールアドレス形式でエラー', async () => {
    // Given: 無効なメールアドレス形式
    // When: マジックリンクを送信
    // Then: バリデーションエラーが返される
  });
});
```

### UT-002: フラッシュカード機能

#### UT-002-01: FSRSアルゴリズム
```typescript
describe('FSRS Algorithm', () => {
  test('初回学習でのパラメータ計算', () => {
    // Given: 新規カード
    // When: 初回評価（Good）を実行
    // Then: 適切な次回復習日が計算される
  });
  
  test('繰り返し学習での難易度・安定性更新', () => {
    // Given: 学習履歴のあるカード
    // When: 評価（Hard）を実行
    // Then: 難易度と安定性が適切に更新される
  });
});
```

#### UT-002-02: SM2アルゴリズム
```typescript
describe('SM2 Algorithm', () => {
  test('評価に基づくEFactor計算', () => {
    // Given: EFactor 2.5のカード
    // When: 評価（Easy）を実行
    // Then: EFactorが増加する
  });
  
  test('最小間隔の適用', () => {
    // Given: 短期間で学習したカード
    // When: 次回復習日を計算
    // Then: 最小間隔（1日）が適用される
  });
});
```

### UT-003: AI統合機能

#### UT-003-01: Google Gemini統合
```typescript
describe('Google Gemini Integration', () => {
  test('テキストからフラッシュカード生成', async () => {
    // Given: 学習コンテンツテキスト
    // When: AI生成APIを呼び出し
    // Then: 構造化されたフラッシュカードが返される
  });
  
  test('APIレート制限エラーハンドリング', async () => {
    // Given: レート制限に達した状態
    // When: AI生成APIを呼び出し
    // Then: 適切なエラーレスポンスを処理
  });
});
```

#### UT-003-02: 音声・OCR処理
```typescript
describe('Audio & OCR Processing', () => {
  test('音声ファイルの文字起こし', async () => {
    // Given: 有効な音声ファイル
    // When: 文字起こしAPIを呼び出し
    // Then: 正確なテキストが返される
  });
  
  test('画像からのテキスト抽出', async () => {
    // Given: テキストを含む画像
    // When: OCR APIを呼び出し
    // Then: 抽出されたテキストが返される
  });
});
```

### UT-004: データベース操作

#### UT-004-01: RLSポリシー
```typescript
describe('Row Level Security', () => {
  test('ユーザーは自分のデータのみアクセス可能', async () => {
    // Given: 2人のユーザー
    // When: ユーザーAがユーザーBのデータにアクセス
    // Then: アクセスが拒否される
  });
  
  test('共有データへの適切なアクセス制御', async () => {
    // Given: 共有されたデッキ
    // When: 権限のあるユーザーがアクセス
    // Then: データが取得できる
  });
});
```

## 統合テスト（Integration Tests）

### IT-001: 認証フロー統合

#### IT-001-01: 完全な認証フロー
```typescript
describe('Complete Authentication Flow', () => {
  test('OAuth認証からダッシュボード表示まで', async () => {
    // Given: 未認証状態
    // When: OAuth認証を完了
    // Then: ダッシュボードが表示される
  });
  
  test('マジックリンク認証からプロファイル設定まで', async () => {
    // Given: マジックリンクをクリック
    // When: 認証を完了
    // Then: プロファイル設定ページが表示される
  });
});
```

### IT-002: フラッシュカード学習フロー

#### IT-002-01: デッキ作成から学習完了まで
```typescript
describe('Deck Creation to Study Completion', () => {
  test('デッキ作成→カード追加→学習セッション実行', async () => {
    // Given: 認証済みユーザー
    // When: デッキを作成し、カードを追加し、学習を実行
    // Then: 学習結果が正しく保存される
  });
});
```

### IT-003: AI統合フロー

#### IT-003-01: AIを使用したカード生成フロー
```typescript
describe('AI-Powered Card Generation Flow', () => {
  test('テキスト入力→AI処理→カード生成→デッキ保存', async () => {
    // Given: 学習テキスト
    // When: AI生成を実行し、結果をデッキに保存
    // Then: 適切なフラッシュカードが生成・保存される
  });
});
```

### IT-004: 外部サービス統合

#### IT-004-01: Cosense同期
```typescript
describe('Cosense Integration', () => {
  test('Scrapboxプロジェクト同期フロー', async () => {
    // Given: Cosenseプロジェクト
    // When: 同期を実行
    // Then: ページが正しく同期される
  });
});
```

#### IT-004-02: Gyazo統合
```typescript
describe('Gyazo Integration', () => {
  test('OAuth認証→画像取得→エディタ表示', async () => {
    // Given: Gyazoアカウント
    // When: OAuth認証後、画像を選択
    // Then: エディタに画像が表示される
  });
});
```

## E2Eテスト（End-to-End Tests）

### E2E-001: 新規ユーザーオンボーディング

#### E2E-001-01: 完全なユーザージャーニー
```typescript
describe('New User Onboarding Journey', () => {
  test('ランディングページから初回学習完了まで', async ({ page }) => {
    // Step 1: ランディングページにアクセス
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('for-all-learners');
    
    // Step 2: 新規登録
    await page.click('[data-testid="signup-button"]');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.click('[data-testid="magic-link-button"]');
    
    // Step 3: ダッシュボード確認
    await page.waitForURL('/dashboard');
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
    
    // Step 4: 初回デッキ作成
    await page.click('[data-testid="create-deck-button"]');
    await page.fill('[data-testid="deck-title"]', 'My First Deck');
    await page.click('[data-testid="save-deck"]');
    
    // Step 5: カード追加
    await page.click('[data-testid="add-card-button"]');
    await page.fill('[data-testid="card-front"]', 'What is TypeScript?');
    await page.fill('[data-testid="card-back"]', 'A typed superset of JavaScript');
    await page.click('[data-testid="save-card"]');
    
    // Step 6: 学習セッション実行
    await page.click('[data-testid="start-study"]');
    await expect(page.locator('[data-testid="study-card"]')).toBeVisible();
    await page.click('[data-testid="show-answer"]');
    await page.click('[data-testid="rating-good"]');
    
    // Step 7: 結果確認
    await expect(page.locator('[data-testid="study-complete"]')).toBeVisible();
  });
});
```

### E2E-002: 高度機能利用フロー

#### E2E-002-01: AI機能を使った学習フロー
```typescript
describe('AI-Enhanced Learning Flow', () => {
  test('AI生成→学習→進捗確認の完全フロー', async ({ page }) => {
    // Step 1: ログイン
    await loginAsUser(page, 'advanced@example.com');
    
    // Step 2: AI生成ページにアクセス
    await page.click('[data-testid="ai-generation"]');
    
    // Step 3: テキスト入力とAI生成実行
    await page.fill('[data-testid="content-input"]', sampleLearningText);
    await page.click('[data-testid="generate-cards"]');
    
    // Step 4: 生成結果確認
    await page.waitForSelector('[data-testid="generated-cards"]');
    const cardCount = await page.locator('[data-testid="card-item"]').count();
    expect(cardCount).toBeGreaterThan(0);
    
    // Step 5: デッキに保存
    await page.fill('[data-testid="deck-name"]', 'AI Generated Deck');
    await page.click('[data-testid="save-to-deck"]');
    
    // Step 6: 学習実行
    await page.click('[data-testid="start-learning"]');
    await performStudySession(page, cardCount);
    
    // Step 7: 進捗確認
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="recent-activity"]')).toContainText('AI Generated Deck');
  });
});
```

### E2E-003: コラボレーション機能

#### E2E-003-01: 共有とコラボレーション
```typescript
describe('Sharing and Collaboration', () => {
  test('デッキ共有→協同編集→権限管理', async ({ browser }) => {
    // 2つのブラウザコンテキストを作成（異なるユーザー）
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // User 1: デッキ作成と共有
    await loginAsUser(page1, 'user1@example.com');
    await createDeck(page1, 'Shared Deck');
    await shareDeck(page1, 'user2@example.com', 'edit');
    
    // User 2: 共有デッキアクセス
    await loginAsUser(page2, 'user2@example.com');
    await page2.goto('/decks/shared');
    await expect(page2.locator('[data-testid="shared-deck"]')).toContainText('Shared Deck');
    
    // User 2: カード追加
    await page2.click('[data-testid="edit-deck"]');
    await addCard(page2, 'Front 2', 'Back 2');
    
    // User 1: 変更確認
    await page1.reload();
    await expect(page1.locator('[data-testid="card-count"]')).toContainText('2');
    
    await context1.close();
    await context2.close();
  });
});
```

### E2E-004: モバイル対応

#### E2E-004-01: モバイル端末での学習フロー
```typescript
describe('Mobile Learning Experience', () => {
  test('スマートフォンでの完全学習フロー', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
    });
    const page = await context.newPage();
    
    // モバイル環境での基本操作テスト
    await page.goto('/');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // タッチ操作での学習フロー
    await loginAsUser(page, 'mobile@example.com');
    await performMobileStudySession(page);
    
    await context.close();
  });
});
```

## 非機能テスト（Non-Functional Tests）

### NFT-001: パフォーマンステスト

#### NFT-001-01: ページ読み込み性能
```javascript
import { check } from 'k6';
import http from 'k6/http';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
};

export default function () {
  // ダッシュボード読み込み
  let response = http.get('https://for-all-learners.com/dashboard');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 3s': (r) => r.timings.duration < 3000,
  });
  
  // 学習セッション開始
  response = http.post('https://for-all-learners.com/api/study/start');
  check(response, {
    'study session starts < 1s': (r) => r.timings.duration < 1000,
  });
}
```

#### NFT-001-02: データベース性能
```javascript
export default function () {
  // 大量データクエリ性能テスト
  let response = http.get('https://for-all-learners.com/api/cards?limit=1000');
  check(response, {
    'large query < 2s': (r) => r.timings.duration < 2000,
    'memory usage acceptable': (r) => r.body.length < 10000000, // 10MB
  });
}
```

### NFT-002: セキュリティテスト

#### NFT-002-01: 認証・認可テスト
```javascript
describe('Security Tests', () => {
  test('未認証アクセスの拒否', async () => {
    const response = await fetch('/api/decks', {
      headers: { 'Authorization': 'Bearer invalid-token' }
    });
    expect(response.status).toBe(401);
  });
  
  test('他ユーザーデータへの不正アクセス防止', async () => {
    const response = await fetch('/api/decks/other-user-deck-id', {
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    expect(response.status).toBe(403);
  });
});
```

#### NFT-002-02: 入力検証テスト
```javascript
describe('Input Validation Security', () => {
  test('SQLインジェクション防止', async () => {
    const maliciousInput = "'; DROP TABLE cards; --";
    const response = await createCard({ front: maliciousInput });
    expect(response.status).toBe(400);
  });
  
  test('XSS防止', async () => {
    const xssInput = '<script>alert("xss")</script>';
    const response = await createCard({ front: xssInput });
    const savedCard = await getCard(response.id);
    expect(savedCard.front).not.toContain('<script>');
  });
});
```

### NFT-003: アクセシビリティテスト

#### NFT-003-01: WCAG準拠テスト
```javascript
describe('Accessibility Tests', () => {
  test('WCAG 2.1 AA準拠チェック', async ({ page }) => {
    await page.goto('/dashboard');
    
    const accessibilityResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    expect(accessibilityResults.violations).toEqual([]);
  });
  
  test('キーボードナビゲーション', async ({ page }) => {
    await page.goto('/learn');
    
    // Tab キーでナビゲーション
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Enter キーでアクション実行
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="study-card"]')).toBeVisible();
  });
});
```

#### NFT-003-02: スクリーンリーダー対応
```javascript
describe('Screen Reader Support', () => {
  test('適切なARIAラベルの存在', async ({ page }) => {
    await page.goto('/decks');
    
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      
      expect(ariaLabel || textContent).toBeTruthy();
    }
  });
});
```

## テストデータ管理

### 基本テストデータ

#### ユーザーデータ
```json
{
  "users": [
    {
      "id": "test-user-1",
      "email": "test1@example.com",
      "plan": "free",
      "created_at": "2025-01-01T00:00:00Z"
    },
    {
      "id": "test-user-2", 
      "email": "test2@example.com",
      "plan": "premium",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### デッキ・カードデータ
```json
{
  "decks": [
    {
      "id": "test-deck-1",
      "title": "Test Deck 1",
      "user_id": "test-user-1",
      "is_public": false
    }
  ],
  "cards": [
    {
      "id": "test-card-1",
      "deck_id": "test-deck-1",
      "front": "Test Question",
      "back": "Test Answer",
      "due_date": "2025-08-03T00:00:00Z"
    }
  ]
}
```

### パフォーマンステスト用大量データ

#### 大量カードデータ生成
```javascript
function generateTestCards(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `perf-card-${i}`,
    deck_id: 'perf-deck-1',
    front: `Question ${i}`,
    back: `Answer ${i}`,
    due_date: new Date(Date.now() + i * 86400000).toISOString()
  }));
}
```

## テスト実行環境

### CI/CD統合

#### GitHub Actions設定
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: bun install
      - run: bun test:unit
      
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v3
      - run: bun test:integration
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: bun install
      - run: bunx playwright install
      - run: bun test:e2e
```

### テスト環境設定

#### 環境変数
```bash
# テスト環境用
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/test
TEST_SUPABASE_URL=https://test.supabase.co
TEST_SUPABASE_ANON_KEY=test-key
TEST_GEMINI_API_KEY=test-gemini-key
```

## テスト成功基準

### カバレッジ目標
- **単体テスト**: 80%以上のコードカバレッジ
- **統合テスト**: 主要APIエンドポイント100%カバー
- **E2Eテスト**: クリティカルユーザーフロー100%カバー

### パフォーマンス基準
- **ページ読み込み**: 3秒以内
- **API応答**: 1秒以内
- **データベースクエリ**: 500ms以内

### 品質基準
- **不具合密度**: 10件/1000行以下
- **重要度High以上のバグ**: 0件
- **アクセシビリティ違反**: 0件

## テスト保守・更新

### 定期見直し
- **月次**: テストケース実行結果レビュー
- **四半期**: テスト戦略見直し
- **機能追加時**: 対応テストケース追加

### メトリクス監視
- テスト実行時間
- 失敗率推移
- カバレッジ推移
- パフォーマンス指標推移

---

**文書作成日**: 2025-08-03  
**バージョン**: 1.0  
**テスト責任者**: QAチーム  
**次回レビュー日**: 2025-11-03