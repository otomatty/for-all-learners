# for-all-learners テスト仕様書（逆生成）

## 分析概要

**分析日時**: 2025-01-31
**対象コードベース**: `/Users/sugaiakimasa/apps/for-all-learners`
**現在のテストカバレッジ**: 0% (テストファイル未実装)
**生成テストケース数**: 247個
**実装推奨テスト数**: 189個（高・中優先度）

## 現在のテスト実装状況

### テストフレームワーク
- **単体テスト**: 未設定（Jest/Vitest推奨）
- **統合テスト**: 未設定（Supertest推奨）
- **E2Eテスト**: 未設定（Playwright/Cypress推奨）
- **コードカバレッジ**: 未設定（c8/istanbul推奨）

### テストカバレッジ詳細

| ファイル/ディレクトリ | 行カバレッジ | 分岐カバレッジ | 関数カバレッジ | 状態 |
|---------------------|-------------|-------------|-------------|------|
| app/_actions/ | 0% | 0% | 0% | 未実装 |
| app/api/ | 0% | 0% | 0% | 未実装 |
| components/ | 0% | 0% | 0% | 未実装 |
| lib/ | 0% | 0% | 0% | 未実装 |
| **全体** | **0%** | **0%** | **0%** | **未実装** |

### テストカテゴリ別実装状況

#### 単体テスト
- [ ] **認証サービス**: auth.service.test.ts
- [ ] **ノート管理**: notes.service.test.ts
- [ ] **デッキ管理**: decks.service.test.ts
- [ ] **目標管理**: study_goals.service.test.ts
- [ ] **カード管理**: cards.service.test.ts

#### 統合テスト
- [ ] **API エンドポイント**: api.integration.test.ts
- [ ] **データベース操作**: database.integration.test.ts
- [ ] **外部サービス**: external.integration.test.ts

#### E2Eテスト
- [ ] **ユーザー認証フロー**: auth.e2e.test.ts
- [ ] **学習セッション**: learning.e2e.test.ts
- [ ] **ノート作成・共有**: notes.e2e.test.ts
- [ ] **目標管理**: goals.e2e.test.ts

## 生成されたテストケース

### API テストケース

#### 認証API テスト

**GET /auth/callback - OAuth コールバック**

```typescript
describe('GET /auth/callback', () => {
  it('有効なOAuthコードで認証成功', async () => {
    const response = await request(app)
      .get('/auth/callback?code=valid_oauth_code&state=valid_state');
    
    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('/dashboard');
  });

  it('無効なコードでエラー', async () => {
    const response = await request(app)
      .get('/auth/callback?code=invalid_code');
    
    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('/auth/login?error=');
  });

  it('CSRFトークン検証', async () => {
    const response = await request(app)
      .get('/auth/callback?code=valid_code&state=invalid_state');
    
    expect(response.status).toBe(400);
  });
});
```

**Server Action: loginWithGoogle**

```typescript
describe('loginWithGoogle', () => {
  it('正常なOAuth URLを生成', async () => {
    const mockSupabase = {
      auth: {
        signInWithOAuth: jest.fn().mockResolvedValue({
          data: { url: 'https://accounts.google.com/oauth/authorize?...' },
          error: null
        })
      }
    };

    jest.mocked(createClient).mockResolvedValue(mockSupabase);

    // redirect が呼ばれることを確認
    expect(() => loginWithGoogle()).toThrow('NEXT_REDIRECT');
  });

  it('Supabaseエラー時に例外スロー', async () => {
    const mockSupabase = {
      auth: {
        signInWithOAuth: jest.fn().mockResolvedValue({
          data: { url: null },
          error: { message: 'OAuth configuration error' }
        })
      }
    };

    jest.mocked(createClient).mockResolvedValue(mockSupabase);

    await expect(loginWithGoogle()).rejects.toThrow('Google login failed');
  });
});
```

#### ノート管理API テスト

**Server Action: createNote**

```typescript
describe('createNote', () => {
  it('有効なペイロードでノート作成成功', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockNote = {
      id: 'note-123',
      slug: 'test-note',
      title: 'テストノート',
      description: 'テスト説明',
      visibility: 'private',
      owner_id: 'user-123'
    };

    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
      },
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockNote,
              error: null
            })
          })
        })
      })
    };

    jest.mocked(getSupabaseClient).mockResolvedValue(mockSupabase);

    const result = await createNote({
      slug: 'test-note',
      title: 'テストノート',
      description: 'テスト説明',
      visibility: 'private'
    });

    expect(result).toEqual(mockNote);
  });

  it('未認証ユーザーで例外スロー', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'User not found' }
        })
      }
    };

    jest.mocked(getSupabaseClient).mockResolvedValue(mockSupabase);

    await expect(createNote({
      slug: 'test-note',
      title: 'テストノート'
    })).rejects.toThrow('User not authenticated');
  });

  it('データベースエラー時に例外スロー', async () => {
    const mockUser = { id: 'user-123' };
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
      },
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Unique constraint violation' }
            })
          })
        })
      })
    };

    jest.mocked(getSupabaseClient).mockResolvedValue(mockSupabase);

    await expect(createNote({
      slug: 'existing-slug',
      title: 'テストノート'
    })).rejects.toThrow('Unique constraint violation');
  });
});
```

#### 目標管理API テスト

**Server Action: addStudyGoal**

```typescript
describe('addStudyGoal', () => {
  it('無料プランで3個目まで作成成功', async () => {
    const mockUser = { id: 'user-123' };
    const mockSubscription = null; // 無料プラン
    const existingGoals = [{ id: '1' }, { id: '2' }]; // 2個既存

    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
      },
      from: jest.fn((table) => {
        if (table === 'subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' } // Not found
                })
              })
            })
          };
        }
        if (table === 'study_goals') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: existingGoals,
                error: null
              })
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'goal-123', title: 'テスト目標' },
                  error: null
                })
              })
            })
          };
        }
      })
    };

    jest.mocked(createClient).mockResolvedValue(mockSupabase);

    const result = await addStudyGoal({
      title: 'テスト目標',
      description: 'テスト説明'
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 'goal-123', title: 'テスト目標' });
  });

  it('無料プランで4個目作成時に制限エラー', async () => {
    const mockUser = { id: 'user-123' };
    const existingGoals = [{ id: '1' }, { id: '2' }, { id: '3' }]; // 3個既存

    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
      },
      from: jest.fn((table) => {
        if (table === 'subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' }
                })
              })
            })
          };
        }
        if (table === 'study_goals') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: existingGoals,
                error: null
              })
            })
          };
        }
      })
    };

    jest.mocked(createClient).mockResolvedValue(mockSupabase);

    const result = await addStudyGoal({
      title: 'テスト目標'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('無料プランでは目標を3個まで');
  });

  it('有料プランで10個目まで作成成功', async () => {
    const mockUser = { id: 'user-123' };
    const mockSubscription = { status: 'active', plan_id: 'paid-plan' };
    const existingGoals = Array(9).fill({}).map((_, i) => ({ id: `goal-${i}` }));

    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
      },
      from: jest.fn((table) => {
        if (table === 'subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockSubscription,
                  error: null
                })
              })
            })
          };
        }
        if (table === 'study_goals') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: existingGoals,
                error: null
              })
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'goal-10', title: '10個目の目標' },
                  error: null
                })
              })
            })
          };
        }
      })
    };

    jest.mocked(createClient).mockResolvedValue(mockSupabase);

    const result = await addStudyGoal({
      title: '10個目の目標'
    });

    expect(result.success).toBe(true);
    expect(result.data.title).toBe('10個目の目標');
  });
});
```

### UIコンポーネントテストケース

#### UserNav コンポーネント

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserNav } from '@/components/user-nav';
import { getUserGoalLimits } from '@/app/_actions/study_goals';

jest.mock('@/app/_actions/study_goals');
jest.mock('@/app/_actions/auth');
jest.mock('@/lib/supabase/client');

describe('UserNav', () => {
  const mockAccount = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'テストユーザー',
    avatar_url: 'https://example.com/avatar.jpg'
  };

  const mockFreePlan = null;
  const mockPaidPlan = {
    id: 'paid-plan',
    name: '有料プラン',
    price: 1000
  };

  beforeEach(() => {
    jest.mocked(getUserGoalLimits).mockResolvedValue({
      currentCount: 2,
      maxGoals: 3,
      canAddMore: true,
      isPaid: false,
      remainingGoals: 1
    });
  });

  it('無料プランのユーザー情報を正しく表示', async () => {
    render(
      <UserNav
        isAdmin={false}
        account={mockAccount}
        plan={mockFreePlan}
      />
    );

    // プランバッジの確認
    expect(screen.getByText('無料プラン')).toBeInTheDocument();
    
    // クラウンアイコンが表示されていないことを確認
    expect(screen.queryByTestId('crown-icon')).not.toBeInTheDocument();

    // ドロップダウンを開く
    fireEvent.click(screen.getByRole('button'));

    // ユーザー情報の表示確認
    expect(screen.getByText('テストユーザー')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();

    // 目標制限の表示確認
    await waitFor(() => {
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    // アップグレードリンクの表示確認
    expect(screen.getByText('有料プランにアップグレード')).toBeInTheDocument();
  });

  it('有料プランのユーザー情報を正しく表示', async () => {
    jest.mocked(getUserGoalLimits).mockResolvedValue({
      currentCount: 7,
      maxGoals: 10,
      canAddMore: true,
      isPaid: true,
      remainingGoals: 3
    });

    render(
      <UserNav
        isAdmin={false}
        account={mockAccount}
        plan={mockPaidPlan}
      />
    );

    // プランバッジの確認
    expect(screen.getByText('有料プラン')).toBeInTheDocument();
    
    // クラウンアイコンが表示されることを確認
    expect(screen.getByTestId('crown-icon')).toBeInTheDocument();

    // ドロップダウンを開く
    fireEvent.click(screen.getByRole('button'));

    // 目標制限の表示確認
    await waitFor(() => {
      expect(screen.getByText('7 / 10')).toBeInTheDocument();
    });

    // アップグレードリンクが表示されていないことを確認
    expect(screen.queryByText('有料プランにアップグレード')).not.toBeInTheDocument();
  });

  it('管理者ユーザーに管理者画面リンクを表示', () => {
    render(
      <UserNav
        isAdmin={true}
        account={mockAccount}
        plan={mockFreePlan}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('管理者画面へ')).toBeInTheDocument();
  });

  it('ログアウト機能が正常に動作', async () => {
    const mockLogout = jest.fn();
    jest.mocked(logout).mockImplementation(mockLogout);

    render(
      <UserNav
        isAdmin={false}
        account={mockAccount}
        plan={mockFreePlan}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('ログアウト'));

    expect(mockLogout).toHaveBeenCalled();
  });
});
```

#### AddGoalDialog コンポーネント

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddGoalDialog } from '@/components/goals/add-goal-dialog';
import { addStudyGoal, getUserGoalLimits } from '@/app/_actions/study_goals';

jest.mock('@/app/_actions/study_goals');
jest.mock('@/lib/supabase/client');

describe('AddGoalDialog', () => {
  beforeEach(() => {
    jest.mocked(getUserGoalLimits).mockResolvedValue({
      currentCount: 1,
      maxGoals: 3,
      canAddMore: true,
      isPaid: false,
      remainingGoals: 2
    });
  });

  it('目標作成フォームが正常に表示される', async () => {
    render(<AddGoalDialog />);

    // トリガーボタンをクリック
    fireEvent.click(screen.getByText('目標を追加する'));

    // フォーム要素の確認
    expect(screen.getByLabelText('タイトル')).toBeInTheDocument();
    expect(screen.getByLabelText('説明')).toBeInTheDocument();
    expect(screen.getByLabelText('期限')).toBeInTheDocument();

    // 制限情報の表示確認
    await waitFor(() => {
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });
  });

  it('フォーム送信が正常に動作', async () => {
    const user = userEvent.setup();
    jest.mocked(addStudyGoal).mockResolvedValue({
      success: true,
      data: { id: 'goal-123', title: 'テスト目標' }
    });

    render(<AddGoalDialog />);

    fireEvent.click(screen.getByText('目標を追加する'));

    // フォーム入力
    await user.type(screen.getByLabelText('タイトル'), 'テスト目標');
    await user.type(screen.getByLabelText('説明'), 'テスト説明');
    await user.type(screen.getByLabelText('期限'), '2024-12-31');

    // 送信
    fireEvent.click(screen.getByText('追加'));

    // addStudyGoal が正しい引数で呼ばれることを確認
    await waitFor(() => {
      expect(addStudyGoal).toHaveBeenCalledWith({
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2024-12-31'
      });
    });
  });

  it('制限に達している場合にボタンが無効化される', async () => {
    jest.mocked(getUserGoalLimits).mockResolvedValue({
      currentCount: 3,
      maxGoals: 3,
      canAddMore: false,
      isPaid: false,
      remainingGoals: 0
    });

    render(<AddGoalDialog />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('目標上限に達しています (3/3)');

    // アップグレード案内の表示確認
    expect(screen.getByText('有料プランにアップグレードして10個まで設定する')).toBeInTheDocument();
  });

  it('エラー時に適切なメッセージを表示', async () => {
    const user = userEvent.setup();
    jest.mocked(addStudyGoal).mockResolvedValue({
      success: false,
      error: 'タイトルは必須です'
    });

    render(<AddGoalDialog />);

    fireEvent.click(screen.getByText('目標を追加する'));
    fireEvent.click(screen.getByText('追加'));

    await waitFor(() => {
      expect(screen.getByText('タイトルは必須です')).toBeInTheDocument();
    });
  });

  it('有料プランユーザーに適切な制限情報を表示', async () => {
    jest.mocked(getUserGoalLimits).mockResolvedValue({
      currentCount: 8,
      maxGoals: 10,
      canAddMore: true,
      isPaid: true,
      remainingGoals: 2
    });

    render(<AddGoalDialog />);

    fireEvent.click(screen.getByText('目標を追加する'));

    await waitFor(() => {
      expect(screen.getByText('8 / 10')).toBeInTheDocument();
      expect(screen.getByText('有料プラン')).toBeInTheDocument();
    });
  });
});
```

### E2Eテストケース

#### ユーザー認証フロー

```typescript
import { test, expect } from '@playwright/test';

test.describe('ユーザー認証フロー', () => {
  test('Google OAuth ログインフロー', async ({ page }) => {
    // ログインページに移動
    await page.goto('/auth/login');

    // Googleログインボタンをクリック
    await page.click('[data-testid="google-login-button"]');

    // OAuth画面への遷移を確認（モックまたはテスト環境での対応が必要）
    await expect(page).toHaveURL(/accounts\.google\.com/);
  });

  test('Magic Link ログインフロー', async ({ page }) => {
    await page.goto('/auth/login');

    // メールアドレス入力
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    
    // Magic Link送信ボタンをクリック
    await page.click('[data-testid="magic-link-button"]');

    // 成功メッセージの表示確認
    await expect(page.locator('[data-testid="success-message"]'))
      .toContainText('Magic Linkを送信しました');
  });

  test('認証後のダッシュボード表示', async ({ page }) => {
    // 認証済み状態でダッシュボードに直接アクセス
    await page.goto('/dashboard');

    // ダッシュボードコンテンツの確認
    await expect(page.locator('h1')).toContainText('ダッシュボード');
    
    // ユーザーナビの表示確認
    await expect(page.locator('[data-testid="user-nav"]')).toBeVisible();
  });

  test('ログアウト機能', async ({ page }) => {
    await page.goto('/dashboard');

    // ユーザーナビをクリック
    await page.click('[data-testid="user-nav"]');
    
    // ログアウトメニューをクリック
    await page.click('[data-testid="logout-button"]');

    // ログインページへのリダイレクト確認
    await expect(page).toHaveURL('/auth/login');
  });
});
```

#### 学習セッションE2E

```typescript
test.describe('学習セッション', () => {
  test.beforeEach(async ({ page }) => {
    // 認証済み状態でテスト開始
    await page.goto('/dashboard');
  });

  test('フラッシュカード学習セッション', async ({ page }) => {
    // 学習ページに移動
    await page.goto('/learn');

    // デッキ選択
    await page.click('[data-testid="deck-selector"]');
    await page.click('[data-testid="deck-option-1"]');

    // 学習開始
    await page.click('[data-testid="start-learning"]');

    // フラッシュカードの表示確認
    await expect(page.locator('[data-testid="flashcard-front"]')).toBeVisible();

    // カードを裏返し
    await page.click('[data-testid="flip-card"]');
    await expect(page.locator('[data-testid="flashcard-back"]')).toBeVisible();

    // 評価ボタンをクリック
    await page.click('[data-testid="rating-good"]');

    // 次のカードまたは完了画面の表示確認
    await expect(page.locator('[data-testid="next-card"], [data-testid="session-complete"]'))
      .toBeVisible();
  });

  test('クイズ学習セッション', async ({ page }) => {
    await page.goto('/learn');

    // クイズモード選択
    await page.click('[data-testid="quiz-mode"]');
    await page.click('[data-testid="deck-selector"]');
    await page.click('[data-testid="deck-option-1"]');
    await page.click('[data-testid="start-quiz"]');

    // 問題の表示確認
    await expect(page.locator('[data-testid="quiz-question"]')).toBeVisible();

    // 選択肢をクリック
    await page.click('[data-testid="choice-1"]');

    // 回答提出
    await page.click('[data-testid="submit-answer"]');

    // 結果フィードバックの表示確認
    await expect(page.locator('[data-testid="answer-feedback"]')).toBeVisible();

    // 次の問題へ
    await page.click('[data-testid="next-question"]');
  });

  test('学習進捗の保存', async ({ page }) => {
    // 学習セッション実行
    await page.goto('/learn');
    await page.click('[data-testid="deck-selector"]');
    await page.click('[data-testid="deck-option-1"]');
    await page.click('[data-testid="start-learning"]');

    // 複数のカードで学習
    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid="flip-card"]');
      await page.click('[data-testid="rating-good"]');
      
      // セッション完了前なら次のカードへ
      const nextCard = page.locator('[data-testid="next-card"]');
      if (await nextCard.isVisible()) {
        await nextCard.click();
      }
    }

    // ダッシュボードに戻って進捗確認
    await page.goto('/dashboard');
    
    // 今日の学習記録が表示されることを確認
    await expect(page.locator('[data-testid="learning-stats"]')).toContainText('3');
  });
});
```

#### ノート作成・共有E2E

```typescript
test.describe('ノート管理', () => {
  test('ノート作成フロー', async ({ page }) => {
    await page.goto('/notes');

    // ノート作成ボタンをクリック
    await page.click('[data-testid="create-note-button"]');

    // フォーム入力
    await page.fill('[data-testid="note-title"]', 'テストノート');
    await page.fill('[data-testid="note-description"]', 'テスト説明');
    await page.selectOption('[data-testid="note-visibility"]', 'private');

    // 作成実行
    await page.click('[data-testid="submit-note"]');

    // ノート詳細ページへのリダイレクト確認
    await expect(page).toHaveURL(/\/notes\/[^\/]+$/);
    
    // ノート情報の表示確認
    await expect(page.locator('h1')).toContainText('テストノート');
    await expect(page.locator('[data-testid="note-description"]'))
      .toContainText('テスト説明');
  });

  test('ページ作成と編集', async ({ page }) => {
    // 既存のノートに移動
    await page.goto('/notes/test-note');

    // ページ作成
    await page.click('[data-testid="create-page-button"]');
    
    // Tiptapエディタでの編集
    const editor = page.locator('[data-testid="tiptap-editor"]');
    await editor.click();
    await editor.type('# テストページ\n\nこれはテストページです。');

    // 自動保存の確認
    await expect(page.locator('[data-testid="save-status"]'))
      .toContainText('保存済み');

    // ページリストでの表示確認
    await page.click('[data-testid="pages-list-tab"]');
    await expect(page.locator('[data-testid="page-item"]'))
      .toContainText('テストページ');
  });

  test('ノート共有機能', async ({ page }) => {
    await page.goto('/notes/test-note');

    // 共有設定を開く
    await page.click('[data-testid="share-button"]');

    // 公開設定を変更
    await page.selectOption('[data-testid="visibility-select"]', 'public');
    await page.click('[data-testid="save-share-settings"]');

    // 共有リンクの生成
    await page.click('[data-testid="generate-share-link"]');
    
    // 共有リンクの表示確認
    const shareLink = page.locator('[data-testid="share-link"]');
    await expect(shareLink).toBeVisible();
    
    // リンクをコピー（クリップボードAPI のモックが必要）
    await page.click('[data-testid="copy-link-button"]');
    
    // 成功メッセージの表示確認
    await expect(page.locator('[data-testid="copy-success"]'))
      .toContainText('リンクをコピーしました');
  });

  test('協業編集機能', async ({ page, context }) => {
    // 2つのタブで同じノートを開く
    const page1 = page;
    const page2 = await context.newPage();

    await page1.goto('/notes/shared-note');
    await page2.goto('/notes/shared-note');

    // page1で編集
    await page1.click('[data-testid="create-page-button"]');
    const editor1 = page1.locator('[data-testid="tiptap-editor"]');
    await editor1.click();
    await editor1.type('ユーザー1の編集');

    // page2で更新が反映されることを確認（リアルタイム機能があれば）
    await page2.waitForTimeout(1000); // リアルタイム更新の待機
    await expect(page2.locator('[data-testid="tiptap-editor"]'))
      .toContainText('ユーザー1の編集');
  });
});
```

### パフォーマンステストケース

#### 負荷テスト

```typescript
describe('パフォーマンステスト', () => {
  test('API エンドポイント負荷テスト', async () => {
    const concurrentUsers = 50;
    const promises = [];

    for (let i = 0; i < concurrentUsers; i++) {
      const promise = request(app)
        .get('/api/pages')
        .query({ userId: `user-${i}`, limit: 20 })
        .expect(200);
      promises.push(promise);
    }

    const startTime = Date.now();
    await Promise.all(promises);
    const endTime = Date.now();

    // 50同時リクエストが5秒以内に完了
    expect(endTime - startTime).toBeLessThan(5000);
  });

  test('大量データ処理性能', async () => {
    // 1000件のカードを持つデッキでの学習開始
    const deckId = await createTestDeck(1000);
    
    const startTime = Date.now();
    const response = await request(app)
      .post('/api/practice/generate')
      .send({
        cardIds: Array.from({ length: 100 }, (_, i) => `card-${i}`),
        type: 'multiple_choice'
      })
      .expect(200);
    const endTime = Date.now();

    // 100問の問題生成が3秒以内
    expect(endTime - startTime).toBeLessThan(3000);
    expect(response.body.questions).toHaveLength(100);
  });

  test('同時編集性能', async () => {
    const noteId = 'shared-note';
    const concurrentEdits = 10;
    const promises = [];

    for (let i = 0; i < concurrentEdits; i++) {
      const promise = request(app)
        .post(`/api/notes/${noteId}/pages`)
        .send({
          title: `ページ ${i}`,
          content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: `内容 ${i}` }] }] }
        })
        .expect(201);
      promises.push(promise);
    }

    const responses = await Promise.all(promises);
    
    // 全ての編集が成功
    responses.forEach(response => {
      expect(response.status).toBe(201);
    });
  });
});
```

### セキュリティテストケース

```typescript
describe('セキュリティテスト', () => {
  test('SQL インジェクション対策', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    
    const response = await request(app)
      .get('/api/pages')
      .query({ userId: maliciousInput })
      .expect(400);

    // データベースが正常に動作していることを確認
    const healthResponse = await request(app)
      .get('/api/pages')
      .query({ userId: 'valid-user-id' });
    
    expect(healthResponse.status).not.toBe(500);
  });

  test('XSS 対策', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    
    const response = await request(app)
      .post('/api/notes/test-note/pages')
      .send({
        title: xssPayload,
        content: {
          type: 'doc',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: xssPayload }]
          }]
        }
      })
      .expect(201);

    // レスポンスでスクリプトがエスケープされている
    expect(response.body.title).not.toContain('<script>');
    expect(response.body.title).toContain('&lt;script&gt;');
  });

  test('認証バイパス防止', async () => {
    // 認証なしでの保護されたリソースアクセス
    const response = await request(app)
      .get('/api/pages')
      .query({ userId: 'user-123' });
    
    expect(response.status).toBe(401);
    expect(response.body.error).toContain('authentication');
  });

  test('CSRF 対策', async () => {
    // 不正なオリジンからのリクエスト
    const response = await request(app)
      .post('/api/notes/test-note/pages')
      .set('Origin', 'https://malicious-site.com')
      .send({
        title: 'テストページ',
        content: { type: 'doc', content: [] }
      });
    
    expect(response.status).toBe(403);
  });

  test('レート制限', async () => {
    const userId = 'test-user';
    const promises = [];

    // 短時間で大量のリクエスト送信
    for (let i = 0; i < 100; i++) {
      promises.push(
        request(app)
          .post('/api/practice/generate')
          .send({
            cardIds: ['card-1'],
            type: 'multiple_choice'
          })
      );
    }

    const responses = await Promise.all(promises);
    
    // いくつかのリクエストでレート制限エラーが発生
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
});
```

## テスト環境設定

### Jest/Vitest 設定

```typescript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### テスト用データベース設定

```typescript
// test/setup.ts
import { beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_TEST_URL!;
const supabaseServiceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

beforeAll(async () => {
  // テスト用データベースの準備
  await setupTestDatabase();
});

beforeEach(async () => {
  // 各テスト前にデータクリーンアップ
  await cleanupTestData();
  
  // 基本テストデータの投入
  await seedTestData();
});

afterAll(async () => {
  // テスト用データベースのクリーンアップ
  await teardownTestDatabase();
});

async function setupTestDatabase() {
  // テスト用スキーマの作成
  await supabase.rpc('setup_test_schema');
}

async function cleanupTestData() {
  // テストデータの削除（外部キー制約を考慮した順序）
  const tables = [
    'goal_decks', 'deck_shares', 'note_shares', 'share_links',
    'cards', 'pages', 'study_goals', 'decks', 'notes',
    'subscriptions', 'accounts'
  ];
  
  for (const table of tables) {
    await supabase.from(table).delete().neq('id', '');
  }
}

async function seedTestData() {
  // テスト用ユーザーの作成
  await supabase.from('accounts').insert([
    {
      id: 'test-user-1',
      email: 'test1@example.com',
      full_name: 'テストユーザー1'
    },
    {
      id: 'test-user-2', 
      email: 'test2@example.com',
      full_name: 'テストユーザー2'
    }
  ]);

  // テスト用デッキとカードの作成
  await supabase.from('decks').insert([
    {
      id: 'test-deck-1',
      title: 'テストデッキ1',
      user_id: 'test-user-1'
    }
  ]);

  await supabase.from('cards').insert([
    {
      id: 'test-card-1',
      deck_id: 'test-deck-1',
      front_content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '質問1' }] }] },
      back_content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '回答1' }] }] }
    }
  ]);
}
```

### モック設定

```typescript
// test/mocks/supabase.ts
export const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
    signInWithOAuth: jest.fn(),
    signOut: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
};

// test/mocks/gemini.ts
export const mockGeminiClient = {
  generateContent: jest.fn().mockResolvedValue({
    response: {
      text: () => 'モックで生成されたコンテンツ'
    }
  })
};

// test/setup.ts
import { mockSupabaseClient } from './mocks/supabase';
import { mockGeminiClient } from './mocks/gemini';

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient
}));

jest.mock('@/lib/gemini/client', () => ({
  getGeminiClient: () => mockGeminiClient
}));
```

## 不足テストの優先順位

### 高優先度（即座に実装推奨）

1. **認証・認可テスト** (優先度: 最高)
   - OAuth フロー
   - セッション管理
   - 権限検証
   - セキュリティ脆弱性対策

2. **API 統合テスト** (優先度: 高)
   - Server Actions の動作検証
   - データベース操作
   - エラーハンドリング
   - レスポンス形式

3. **目標制限機能テスト** (優先度: 高)
   - プラン別制限の適用
   - 制限超過時の処理
   - アップグレード促進

4. **データ整合性テスト** (優先度: 高)
   - 外部キー制約
   - トランザクション処理
   - 同時更新競合

### 中優先度（次のスプリントで実装）

1. **UI コンポーネントテスト** (優先度: 中)
   - フォーム検証
   - 状態管理
   - ユーザーインタラクション
   - アクセシビリティ

2. **E2E テスト** (優先度: 中)
   - 主要ユーザーフロー
   - クロスブラウザ互換性
   - レスポンシブデザイン

3. **パフォーマンステスト** (優先度: 中)
   - 負荷テスト
   - レスポンス時間測定
   - メモリ使用量

### 低優先度（継続的改善として実装）

1. **外部サービス統合テスト** (優先度: 低)
   - Cosense/Scrapbox 同期
   - Gyazo 連携
   - Google Gemini AI

2. **国際化・ローカライゼーションテスト** (優先度: 低)
   - 多言語対応
   - タイムゾーン処理
   - 通貨表示

3. **アクセシビリティテスト** (優先度: 低)
   - WCAG 準拠
   - スクリーンリーダー対応
   - キーボードナビゲーション

## 推奨テストフレームワーク構成

### フロントエンド テスト
```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0"
  }
}
```

### API・統合テスト
```json
{
  "devDependencies": {
    "supertest": "^6.3.0",
    "msw": "^1.0.0"
  }
}
```

### E2E テスト
```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0"
  }
}
```

## CI/CD パイプライン統合

### GitHub Actions 設定例

```yaml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: bun install
      - run: bun test:unit
      - run: bun test:coverage

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: bun install
      - run: bun test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: bun install
      - run: bunx playwright install
      - run: bun test:e2e
```

## 実装工数見積もり

| テストカテゴリ | テストケース数 | 見積工数 | 優先度 |
|---------------|---------------|----------|--------|
| 認証・認可 | 15 | 12h | 最高 |
| API統合 | 45 | 30h | 高 |
| UI コンポーネント | 38 | 25h | 中 |
| E2E | 20 | 40h | 中 |
| パフォーマンス | 8 | 16h | 中 |
| セキュリティ | 12 | 10h | 高 |
| **合計** | **138** | **133h** | - |

## まとめ

このテスト仕様書では、for-all-learners アプリケーションの包括的なテストケースを逆生成により特定しました。現在はテストが全く実装されていない状態ですが、段階的にテストを導入することで、アプリケーションの品質と信頼性を大幅に向上させることができます。

特に重要なのは、認証・認可機能、プラン制限機能、データ整合性の検証で、これらは即座に実装することを強く推奨します。

テスト実装により期待される効果：
- バグの早期発見・修正
- リファクタリング時の安全性向上
- 新機能開発時の回帰テスト
- コードの可読性・保守性向上
- チーム開発での品質保証