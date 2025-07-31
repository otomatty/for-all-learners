# for-all-learners テストケース一覧（逆生成）

## テストケース概要

| ID | テスト名 | カテゴリ | 優先度 | 実装状況 | 推定工数 |
|----|----------|----------|--------|----------|----------|
| TC-001 | Google OAuth ログイン | 認証 | 最高 | ❌ | 2h |
| TC-002 | Magic Link ログイン | 認証 | 最高 | ❌ | 2h |
| TC-003 | ログアウト機能 | 認証 | 最高 | ❌ | 1h |
| TC-004 | 認証後リダイレクト | 認証 | 最高 | ❌ | 1h |
| TC-005 | セッション期限切れ処理 | 認証 | 最高 | ❌ | 2h |
| TC-006 | ノート作成（正常系） | API | 高 | ❌ | 1h |
| TC-007 | ノート作成（異常系） | API | 高 | ❌ | 2h |
| TC-008 | ノート更新 | API | 高 | ❌ | 1h |
| TC-009 | ノート削除 | API | 高 | ❌ | 1h |
| TC-010 | ノート共有設定 | API | 高 | ❌ | 2h |
| TC-011 | 目標作成（無料プラン制限） | API | 最高 | ❌ | 3h |
| TC-012 | 目標作成（有料プラン制限） | API | 最高 | ❌ | 2h |
| TC-013 | 目標制限超過エラー | API | 最高 | ❌ | 2h |
| TC-014 | デッキ作成 | API | 高 | ❌ | 1h |
| TC-015 | カード作成・更新 | API | 高 | ❌ | 2h |
| TC-016 | 学習セッション開始 | API | 高 | ❌ | 2h |
| TC-017 | 進捗記録保存 | API | 高 | ❌ | 2h |
| TC-018 | AI問題生成 | API | 中 | ❌ | 3h |
| TC-019 | Cosense同期 | API | 中 | ❌ | 4h |
| TC-020 | Gyazo連携 | API | 中 | ❌ | 3h |
| TC-021 | UserNav コンポーネント | UI | 中 | ❌ | 2h |
| TC-022 | AddGoalDialog コンポーネント | UI | 中 | ❌ | 2h |
| TC-023 | TiptapEditor コンポーネント | UI | 中 | ❌ | 3h |
| TC-024 | フォーム検証 | UI | 中 | ❌ | 2h |
| TC-025 | ローディング状態 | UI | 中 | ❌ | 1h |
| TC-026 | エラー状態表示 | UI | 中 | ❌ | 1h |
| TC-027 | レスポンシブデザイン | UI | 中 | ❌ | 3h |
| TC-028 | ダークモード切り替え | UI | 低 | ❌ | 2h |
| TC-029 | 認証フロー完全版 | E2E | 中 | ❌ | 4h |
| TC-030 | 学習セッション完全版 | E2E | 中 | ❌ | 6h |
| TC-031 | ノート作成・編集・共有 | E2E | 中 | ❌ | 5h |
| TC-032 | 目標管理フロー | E2E | 中 | ❌ | 4h |
| TC-033 | デッキ管理フロー | E2E | 中 | ❌ | 4h |
| TC-034 | 管理者機能 | E2E | 低 | ❌ | 3h |
| TC-035 | API負荷テスト | パフォーマンス | 中 | ❌ | 4h |
| TC-036 | 大量データ処理 | パフォーマンス | 中 | ❌ | 3h |
| TC-037 | 同時編集性能 | パフォーマンス | 中 | ❌ | 4h |
| TC-038 | メモリ使用量 | パフォーマンス | 低 | ❌ | 3h |
| TC-039 | SQL インジェクション対策 | セキュリティ | 高 | ❌ | 2h |
| TC-040 | XSS 対策 | セキュリティ | 高 | ❌ | 2h |
| TC-041 | CSRF 対策 | セキュリティ | 高 | ❌ | 2h |
| TC-042 | 認証バイパス防止 | セキュリティ | 最高 | ❌ | 2h |
| TC-043 | レート制限 | セキュリティ | 中 | ❌ | 2h |

## 詳細テストケース

### 認証関連テストケース

#### TC-001: Google OAuth ログイン

**テスト目的**: Google OAuth を使用したログイン機能の検証

**事前条件**: 
- アプリケーションが起動している
- Google OAuth が適切に設定されている
- テストユーザーが存在する

**テスト手順**:
1. `/auth/login` ページにアクセス
2. "Googleでログイン" ボタンをクリック
3. Google OAuth 認証を完了
4. アプリケーションにリダイレクトされる

**期待結果**:
- Google OAuth ページへの正しいリダイレクト
- 認証成功後 `/dashboard` へのリダイレクト
- ユーザーセッションの正常な作成
- ユーザー情報の正確な取得

**テストデータ**:
```json
{
  "testUser": {
    "email": "test@example.com",
    "name": "Test User",
    "googleId": "test-google-id"
  }
}
```

**実装ファイル**: `auth.integration.test.ts`

---

#### TC-002: Magic Link ログイン

**テスト目的**: Magic Link を使用したログイン機能の検証

**事前条件**:
- メール送信機能が設定されている
- テスト用メールアドレスが利用可能

**テスト手順**:
1. `/auth/login` ページにアクセス
2. メールアドレスを入力
3. "Magic Link を送信" ボタンをクリック
4. 送信確認メッセージの表示を確認
5. (E2Eテストでは) メール内のリンクをクリック

**期待結果**:
- Magic Link 送信成功メッセージの表示
- 適切なリダイレクト（`/auth/login?message=magic_link_sent`）
- メール送信の実行（モックで確認）

**異常系テスト**:
- 無効なメールアドレス形式
- 空文字入力
- 存在しないメールアドレス

**実装ファイル**: `auth.integration.test.ts`

---

#### TC-011: 目標作成（無料プラン制限）

**テスト目的**: 無料プランユーザーの目標作成制限（3個まで）の検証

**事前条件**:
- 無料プランのテストユーザーが認証済み
- 既存目標数が把握されている

**テスト手順**:
1. 既存目標数を確認
2. 新しい目標作成を試行
3. 制限に応じた結果を確認

**期待結果**:

**ケース1: 制限内（0-2個既存）**
```typescript
// 2個既存の場合
const result = await addStudyGoal({
  title: "3個目の目標",
  description: "制限内作成"
});

expect(result).toEqual({
  success: true,
  data: expect.objectContaining({
    title: "3個目の目標"
  })
});
```

**ケース2: 制限超過（3個既存）**
```typescript
// 3個既存の場合
const result = await addStudyGoal({
  title: "4個目の目標"
});

expect(result).toEqual({
  success: false,
  error: "無料プランでは目標を3個まで設定できます。有料プランにアップグレードして10個まで設定しましょう。"
});
```

**テストデータ**:
```json
{
  "freeUser": {
    "id": "free-user-123",
    "subscription": null,
    "existingGoals": [
      {"id": "goal-1", "title": "目標1"},
      {"id": "goal-2", "title": "目標2"}
    ]
  }
}
```

**実装ファイル**: `study_goals.test.ts`

---

#### TC-012: 目標作成（有料プラン制限）

**テスト目的**: 有料プランユーザーの目標作成制限（10個まで）の検証

**テスト手順**:
1. 有料プランユーザーでログイン
2. 既存目標数を確認（9個想定）
3. 10個目の目標作成を試行
4. 11個目の目標作成を試行（制限超過）

**期待結果**:

**ケース1: 制限内（9個既存）**
```typescript
const result = await addStudyGoal({
  title: "10個目の目標"
});

expect(result.success).toBe(true);
expect(result.data.title).toBe("10個目の目標");
```

**ケース2: 制限超過（10個既存）**
```typescript
const result = await addStudyGoal({
  title: "11個目の目標"
});

expect(result).toEqual({
  success: false,
  error: "有料プランでも目標は10個まで設定可能です。"
});
```

**実装ファイル**: `study_goals.test.ts`

---

### API統合テストケース

#### TC-006: ノート作成（正常系）

**テスト目的**: ノート作成APIの正常動作確認

**テスト手順**:
```typescript
describe('createNote - 正常系', () => {
  it('有効なデータでノート作成成功', async () => {
    const payload = {
      slug: 'test-note-123',
      title: 'テストノート',
      description: 'これはテスト用のノートです',
      visibility: 'private' as const
    };

    const result = await createNote(payload);

    expect(result).toMatchObject({
      slug: 'test-note-123',
      title: 'テストノート',
      description: 'これはテスト用のノートです',
      visibility: 'private',
      owner_id: expect.any(String)
    });
  });

  it('最小限のデータでノート作成成功', async () => {
    const payload = {
      slug: 'minimal-note',
      title: 'ミニマルノート'
    };

    const result = await createNote(payload);

    expect(result.title).toBe('ミニマルノート');
    expect(result.description).toBeNull();
    expect(result.visibility).toBe('private'); // デフォルト値
  });
});
```

**実装ファイル**: `notes.integration.test.ts`

---

#### TC-007: ノート作成（異常系）

**テスト目的**: ノート作成APIのエラーハンドリング確認

**テスト手順**:
```typescript
describe('createNote - 異常系', () => {
  it('未認証ユーザーでエラー', async () => {
    // 認証情報をクリア
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('User not found')
    });

    await expect(createNote({
      slug: 'test-note',
      title: 'テスト'
    })).rejects.toThrow('User not authenticated');
  });

  it('重複スラグでエラー', async () => {
    mockSupabase.from().insert().select().single.mockResolvedValue({
      data: null,
      error: { 
        code: '23505',
        message: 'duplicate key value violates unique constraint'
      }
    });

    await expect(createNote({
      slug: 'existing-slug',
      title: 'テスト'
    })).rejects.toThrow('duplicate key');
  });

  it('無効な可視性設定でエラー', async () => {
    await expect(createNote({
      slug: 'test-note',
      title: 'テスト',
      visibility: 'invalid' as any
    })).rejects.toThrow();
  });
});
```

**バリデーションテスト**:
```typescript
describe('入力値バリデーション', () => {
  const validationCases = [
    { field: 'slug', value: '', error: 'スラグは必須' },
    { field: 'slug', value: 'a'.repeat(101), error: 'スラグは100文字以下' },
    { field: 'title', value: '', error: 'タイトルは必須' },
    { field: 'title', value: 'a'.repeat(256), error: 'タイトルは255文字以下' },
    { field: 'description', value: 'a'.repeat(1001), error: '説明は1000文字以下' }
  ];

  test.each(validationCases)('$field: $error', async ({ field, value, error }) => {
    const payload = {
      slug: 'test-slug',
      title: 'テストタイトル',
      [field]: value
    };

    await expect(createNote(payload)).rejects.toThrow(error);
  });
});
```

**実装ファイル**: `notes.integration.test.ts`

---

### UIコンポーネントテストケース

#### TC-021: UserNav コンポーネント

**テスト目的**: ユーザーナビゲーションコンポーネントの表示・動作確認

**テスト手順**:
```typescript
describe('UserNav Component', () => {
  const mockAccount = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'テストユーザー',
    avatar_url: 'https://example.com/avatar.jpg'
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

  it('基本情報が正しく表示される', () => {
    render(
      <UserNav
        isAdmin={false}
        account={mockAccount}
        plan={null}
      />
    );

    // アバター画像の確認
    const avatar = screen.getByRole('img');
    expect(avatar).toHaveAttribute('src', mockAccount.avatar_url);
    expect(avatar).toHaveAttribute('alt', mockAccount.email);

    // プランバッジの確認
    expect(screen.getByText('無料プラン')).toBeInTheDocument();
  });

  it('ドロップダウンメニューの内容確認', async () => {
    render(
      <UserNav
        isAdmin={false}
        account={mockAccount}
        plan={null}
      />
    );

    // ドロップダウンを開く
    fireEvent.click(screen.getByRole('button'));

    // ユーザー情報の表示
    expect(screen.getByText('テストユーザー')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();

    // メニュー項目の確認
    expect(screen.getByText('プロフィール')).toBeInTheDocument();
    expect(screen.getByText('設定')).toBeInTheDocument();
    expect(screen.getByText('お問い合わせ')).toBeInTheDocument();
    expect(screen.getByText('ログアウト')).toBeInTheDocument();

    // 目標制限情報の確認
    await waitFor(() => {
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });
  });

  it('無料プランユーザーにアップグレードリンクが表示', () => {
    render(
      <UserNav
        isAdmin={false}
        account={mockAccount}
        plan={null}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('有料プランにアップグレード')).toBeInTheDocument();
    expect(screen.getByText('有料プランで目標10個まで設定可能')).toBeInTheDocument();
  });

  it('有料プランユーザーの表示確認', async () => {
    const paidPlan = { id: 'paid', name: 'プロプラン', price: 1000 };
    
    jest.mocked(getUserGoalLimits).mockResolvedValue({
      currentCount: 5,
      maxGoals: 10,
      canAddMore: true,
      isPaid: true,
      remainingGoals: 5
    });

    render(
      <UserNav
        isAdmin={false}
        account={mockAccount}
        plan={paidPlan}
      />
    );

    // プランバッジにクラウンアイコンが表示
    expect(screen.getByTestId('crown-icon')).toBeInTheDocument();
    expect(screen.getByText('プロプラン')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));

    // アップグレードリンクが非表示
    expect(screen.queryByText('有料プランにアップグレード')).not.toBeInTheDocument();

    // 有料プランの目標制限表示
    await waitFor(() => {
      expect(screen.getByText('5 / 10')).toBeInTheDocument();
    });
  });

  it('管理者権限の表示確認', () => {
    render(
      <UserNav
        isAdmin={true}
        account={mockAccount}
        plan={null}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('管理者画面へ')).toBeInTheDocument();
  });

  it('ログアウト機能のテスト', async () => {
    const mockLogout = jest.fn();
    jest.mocked(logout).mockImplementation(mockLogout);

    render(
      <UserNav
        isAdmin={false}
        account={mockAccount}
        plan={null}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('ログアウト'));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
```

**レスポンシブテスト**:
```typescript
describe('UserNav - レスポンシブ', () => {
  it('モバイル表示での動作確認', () => {
    // ビューポートをモバイルサイズに設定
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<UserNav {...defaultProps} />);

    // モバイル専用の表示要素があれば確認
    // 例: アバターのサイズ、テキストの省略など
  });
});
```

**実装ファイル**: `components/user-nav.test.tsx`

---

#### TC-022: AddGoalDialog コンポーネント

**テスト目的**: 目標追加ダイアログの表示・操作・バリデーション確認

**テスト手順**:
```typescript
describe('AddGoalDialog Component', () => {
  beforeEach(() => {
    jest.mocked(getUserGoalLimits).mockResolvedValue({
      currentCount: 1,
      maxGoals: 3,
      canAddMore: true,
      isPaid: false,
      remainingGoals: 2
    });

    jest.mocked(addStudyGoal).mockResolvedValue({
      success: true,
      data: { id: 'goal-123', title: 'テスト目標' }
    });
  });

  it('トリガーボタンの表示確認', async () => {
    render(<AddGoalDialog />);

    const button = screen.getByText('目標を追加する');
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();

    // 制限情報の表示
    await waitFor(() => {
      expect(screen.getByText('有料プランにアップグレードして10個まで設定する'))
        .toBeInTheDocument();
    });
  });

  it('ダイアログの開閉動作', () => {
    render(<AddGoalDialog />);

    // ダイアログが閉じている状態
    expect(screen.queryByText('学習目標を追加する')).not.toBeInTheDocument();

    // ダイアログを開く
    fireEvent.click(screen.getByText('目標を追加する'));
    expect(screen.getByText('学習目標を追加する')).toBeInTheDocument();

    // フォーム要素の確認
    expect(screen.getByLabelText('タイトル')).toBeInTheDocument();
    expect(screen.getByLabelText('説明')).toBeInTheDocument();
    expect(screen.getByLabelText('期限')).toBeInTheDocument();
  });

  it('フォーム送信の正常動作', async () => {
    const user = userEvent.setup();
    render(<AddGoalDialog />);

    fireEvent.click(screen.getByText('目標を追加する'));

    // フォーム入力
    await user.type(screen.getByLabelText('タイトル'), 'TOEIC 800点取得');
    await user.type(screen.getByLabelText('説明'), '2024年内にTOEIC 800点を目指す');
    await user.type(screen.getByLabelText('期限'), '2024-12-31');

    // 送信ボタンをクリック
    fireEvent.click(screen.getByText('追加'));

    // API呼び出しの確認
    await waitFor(() => {
      expect(addStudyGoal).toHaveBeenCalledWith({
        title: 'TOEIC 800点取得',
        description: '2024年内にTOEIC 800点を目指す',
        deadline: '2024-12-31'
      });
    });
  });

  it('バリデーションエラーの表示', async () => {
    const user = userEvent.setup();
    render(<AddGoalDialog />);

    fireEvent.click(screen.getByText('目標を追加する'));

    // タイトル未入力で送信
    fireEvent.click(screen.getByText('追加'));

    // バリデーションエラーの確認
    await waitFor(() => {
      expect(screen.getByText('タイトルは必須です')).toBeInTheDocument();
    });

    // APIが呼ばれていないことを確認
    expect(addStudyGoal).not.toHaveBeenCalled();
  });

  it('サーバーエラーの表示', async () => {
    const user = userEvent.setup();
    jest.mocked(addStudyGoal).mockResolvedValue({
      success: false,
      error: 'サーバーエラーが発生しました'
    });

    render(<AddGoalDialog />);

    fireEvent.click(screen.getByText('目標を追加する'));
    await user.type(screen.getByLabelText('タイトル'), 'テスト目標');
    fireEvent.click(screen.getByText('追加'));

    // エラーメッセージの表示確認
    await waitFor(() => {
      expect(screen.getByText('サーバーエラーが発生しました')).toBeInTheDocument();
    });
  });

  it('制限到達時のボタン無効化', async () => {
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

    // 制限メッセージの確認
    expect(screen.getByText('有料プランにアップグレードして10個まで設定する'))
      .toBeInTheDocument();
  });

  it('有料プランユーザーの表示', async () => {
    jest.mocked(getUserGoalLimits).mockResolvedValue({
      currentCount: 7,
      maxGoals: 10,
      canAddMore: true,
      isPaid: true,
      remainingGoals: 3
    });

    render(<AddGoalDialog />);

    fireEvent.click(screen.getByText('目標を追加する'));

    // 有料プランの制限情報表示
    await waitFor(() => {
      expect(screen.getByText('7 / 10')).toBeInTheDocument();
      expect(screen.getByText('有料プラン')).toBeInTheDocument();
    });

    // 無料プラン向けメッセージが非表示
    expect(screen.queryByText('有料プランにアップグレードして'))
      .not.toBeInTheDocument();
  });
});
```

**アクセシビリティテスト**:
```typescript
describe('AddGoalDialog - アクセシビリティ', () => {
  it('キーボードナビゲーション', async () => {
    render(<AddGoalDialog />);

    // Enterキーでダイアログを開く
    const button = screen.getByText('目標を追加する');
    button.focus();
    fireEvent.keyDown(button, { key: 'Enter' });

    expect(screen.getByText('学習目標を追加する')).toBeInTheDocument();

    // Tabキーでフォーカス移動
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    expect(screen.getByLabelText('タイトル')).toHaveFocus();

    // Escapeキーでダイアログを閉じる
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByText('学習目標を追加する')).not.toBeInTheDocument();
  });

  it('スクリーンリーダー対応', () => {
    render(<AddGoalDialog />);

    fireEvent.click(screen.getByText('目標を追加する'));

    // ARIA属性の確認
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');

    // フォーム要素のラベル関連付け
    const titleInput = screen.getByLabelText('タイトル');
    expect(titleInput).toHaveAttribute('aria-required', 'true');
  });
});
```

**実装ファイル**: `components/goals/add-goal-dialog.test.tsx`

---

### E2Eテストケース

#### TC-029: 認証フロー完全版

**テスト目的**: ユーザー認証の全フローをブラウザで検証

**テスト手順**:
```typescript
test.describe('認証フロー完全版', () => {
  test('Google OAuth ログインからダッシュボードまで', async ({ page }) => {
    // ログインページに移動
    await page.goto('/auth/login');

    // ページタイトルの確認
    await expect(page).toHaveTitle(/ログイン/);

    // Googleログインボタンをクリック
    await page.click('[data-testid="google-login-button"]');

    // OAuth画面への遷移確認（テスト環境での対応）
    await page.waitForURL(/auth\/callback/);

    // ダッシュボードへのリダイレクト確認
    await expect(page).toHaveURL('/dashboard');

    // ダッシュボードコンテンツの表示確認
    await expect(page.locator('h1')).toContainText('ダッシュボード');
    
    // ユーザーナビの表示確認
    const userNav = page.locator('[data-testid="user-nav"]');
    await expect(userNav).toBeVisible();
    
    // プランバッジの確認
    await expect(userNav.locator('[data-testid="plan-badge"]')).toBeVisible();
  });

  test('認証エラーハンドリング', async ({ page }) => {
    // 無効な認証情報でのアクセス
    await page.goto('/auth/callback?error=access_denied');

    // エラーメッセージの表示確認
    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('認証に失敗しました');

    // ログインページへの自動リダイレクト
    await expect(page).toHaveURL('/auth/login');
  });

  test('セッション期限切れ処理', async ({ page, context }) => {
    // 認証済み状態でダッシュボードに移動
    await page.goto('/dashboard');

    // セッションを無効化（Cookieの削除）
    await context.clearCookies();

    // 保護されたページにアクセス
    await page.goto('/goals');

    // ログインページへのリダイレクト確認
    await expect(page).toHaveURL('/auth/login');
    
    // リダイレクト理由のメッセージ確認
    await expect(page.locator('[data-testid="redirect-message"]'))
      .toContainText('セッションが期限切れです');
  });

  test('ログアウト機能', async ({ page }) => {
    // 認証済み状態でダッシュボードに移動
    await page.goto('/dashboard');

    // ユーザーナビをクリック
    await page.click('[data-testid="user-nav"]');

    // ドロップダウンメニューの表示確認
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    // ログアウトボタンをクリック
    await page.click('[data-testid="logout-button"]');

    // ログインページへのリダイレクト確認
    await expect(page).toHaveURL('/auth/login');

    // セッションクリアの確認（保護されたページにアクセス）
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/auth/login');
  });
});
```

**実装ファイル**: `e2e/auth-flow.test.ts`

---

#### TC-030: 学習セッション完全版

**テスト手順**:
```typescript
test.describe('学習セッション完全版', () => {
  test.beforeEach(async ({ page }) => {
    // テストデータの準備
    await setupTestData();
    
    // 認証済み状態でテスト開始
    await page.goto('/dashboard');
  });

  test('フラッシュカード学習フロー', async ({ page }) => {
    // 学習ページに移動
    await page.goto('/learn');

    // デッキ選択ダイアログを開く
    await page.click('[data-testid="select-deck-button"]');

    // デッキリストの表示確認
    await expect(page.locator('[data-testid="deck-list"]')).toBeVisible();

    // テスト用デッキを選択
    await page.click('[data-testid="deck-item"]:first-child');

    // 学習設定の確認
    await expect(page.locator('[data-testid="learning-settings"]')).toBeVisible();
    
    // 学習開始ボタンをクリック
    await page.click('[data-testid="start-learning"]');

    // ローディング表示の確認
    await expect(page.locator('[data-testid="loading"]')).toBeVisible();

    // フラッシュカードの表示確認
    await expect(page.locator('[data-testid="flashcard"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-front"]')).toBeVisible();

    // カードをクリックして裏面を表示
    await page.click('[data-testid="flashcard"]');
    await expect(page.locator('[data-testid="card-back"]')).toBeVisible();

    // 評価ボタンの表示確認
    const ratingButtons = page.locator('[data-testid^="rating-"]');
    await expect(ratingButtons).toHaveCount(4); // Again, Hard, Good, Easy

    // "Good" で評価
    await page.click('[data-testid="rating-good"]');

    // 次のカードまたは完了画面の確認
    const nextCard = page.locator('[data-testid="card-front"]');
    const completionScreen = page.locator('[data-testid="session-complete"]');
    
    await expect(nextCard.or(completionScreen)).toBeVisible();
  });

  test('学習セッション完了と統計', async ({ page }) => {
    await page.goto('/learn');
    
    // 短いセッション用のデッキを選択
    await page.click('[data-testid="select-deck-button"]');
    await page.click('[data-testid="deck-item"][data-card-count="3"]');
    await page.click('[data-testid="start-learning"]');

    // 3枚のカードを学習
    for (let i = 0; i < 3; i++) {
      await expect(page.locator('[data-testid="card-front"]')).toBeVisible();
      await page.click('[data-testid="flashcard"]');
      await expect(page.locator('[data-testid="card-back"]')).toBeVisible();
      await page.click('[data-testid="rating-good"]');
    }

    // 完了画面の表示確認
    await expect(page.locator('[data-testid="session-complete"]')).toBeVisible();
    
    // 学習統計の確認
    await expect(page.locator('[data-testid="cards-studied"]')).toContainText('3');
    await expect(page.locator('[data-testid="study-time"]')).toBeVisible();
    
    // ダッシュボードに戻るボタン
    await page.click('[data-testid="back-to-dashboard"]');
    await expect(page).toHaveURL('/dashboard');

    // ダッシュボードでの学習記録確認
    await expect(page.locator('[data-testid="today-study-count"]')).toContainText('3');
  });

  test('クイズモード学習', async ({ page }) => {
    await page.goto('/learn');

    // クイズモードを選択
    await page.click('[data-testid="quiz-mode-tab"]');
    await page.click('[data-testid="select-deck-button"]');
    await page.click('[data-testid="deck-item"]:first-child');

    // クイズ設定
    await page.selectOption('[data-testid="question-type"]', 'multiple_choice');
    await page.fill('[data-testid="question-count"]', '5');
    await page.click('[data-testid="start-quiz"]');

    // 問題の表示確認
    await expect(page.locator('[data-testid="quiz-question"]')).toBeVisible();
    await expect(page.locator('[data-testid="question-number"]')).toContainText('1 / 5');

    // 選択肢の表示確認
    const choices = page.locator('[data-testid^="choice-"]');
    await expect(choices).toHaveCount(4);

    // 回答選択
    await page.click('[data-testid="choice-0"]');
    
    // 回答ボタンの活性化確認
    const submitButton = page.locator('[data-testid="submit-answer"]');
    await expect(submitButton).toBeEnabled();
    
    // 回答提出
    await submitButton.click();

    // フィードバックの表示確認
    await expect(page.locator('[data-testid="answer-feedback"]')).toBeVisible();
    
    // 次の問題へ
    await page.click('[data-testid="next-question"]');
    await expect(page.locator('[data-testid="question-number"]')).toContainText('2 / 5');
  });

  test('学習の中断・再開', async ({ page }) => {
    await page.goto('/learn');
    
    // 学習開始
    await page.click('[data-testid="select-deck-button"]');
    await page.click('[data-testid="deck-item"]:first-child');
    await page.click('[data-testid="start-learning"]');

    // 2枚学習
    for (let i = 0; i < 2; i++) {
      await page.click('[data-testid="flashcard"]');
      await page.click('[data-testid="rating-good"]');
    }

    // 学習を中断
    await page.click('[data-testid="pause-session"]');
    await expect(page.locator('[data-testid="pause-dialog"]')).toBeVisible();
    await page.click('[data-testid="save-and-exit"]');

    // ダッシュボードに戻る
    await expect(page).toHaveURL('/dashboard');

    // 中断した学習の表示確認
    await expect(page.locator('[data-testid="paused-session"]')).toBeVisible();
    
    // 学習再開
    await page.click('[data-testid="resume-session"]');
    await expect(page).toHaveURL('/learn');
    
    // 続きから開始されることを確認
    await expect(page.locator('[data-testid="session-progress"]')).toContainText('2');
  });
});
```

**実装ファイル**: `e2e/learning-session.test.ts`

---

### パフォーマンステストケース

#### TC-035: API負荷テスト

**テスト目的**: API エンドポイントの負荷耐性確認

**テスト手順**:
```typescript
describe('API負荷テスト', () => {
  test('同時ユーザー学習セッション', async () => {
    const concurrentUsers = 50;
    const promises: Promise<any>[] = [];

    // 50人の同時学習セッション開始
    for (let i = 0; i < concurrentUsers; i++) {
      const promise = request(app)
        .post('/api/practice/generate')
        .set('Authorization', `Bearer ${getUserToken(i)}`)
        .send({
          cardIds: [`card-${i}-1`, `card-${i}-2`, `card-${i}-3`],
          type: 'flashcard'
        })
        .expect(200);
      
      promises.push(promise);
    }

    const startTime = Date.now();
    const responses = await Promise.allSettled(promises);
    const endTime = Date.now();

    // パフォーマンス要件
    expect(endTime - startTime).toBeLessThan(5000); // 5秒以内

    // 成功率の確認
    const successfulResponses = responses.filter(r => r.status === 'fulfilled');
    const successRate = successfulResponses.length / responses.length;
    expect(successRate).toBeGreaterThan(0.95); // 95%以上の成功率
  });

  test('ページ検索性能', async () => {
    // 大量のページデータを作成
    await createTestPages(1000);

    const searchQueries = [
      '学習', 'テスト', 'プログラミング', '英語', '数学'
    ];

    for (const query of searchQueries) {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/search-suggestions')
        .query({ q: query })
        .expect(200);
      
      const endTime = Date.now();

      // 検索時間が1秒以内
      expect(endTime - startTime).toBeLessThan(1000);
      
      // 結果の妥当性確認
      expect(response.body).toHaveLength.lessThanOrEqual(10);
      expect(response.body.every((item: any) => 
        item.text.toLowerCase().includes(query.toLowerCase())
      )).toBe(true);
    }
  });

  test('メモリ使用量テスト', async () => {
    const initialMemory = process.memoryUsage();

    // 大量のデータ処理を実行
    for (let i = 0; i < 100; i++) {
      await request(app)
        .post('/api/practice/generate')
        .send({
          cardIds: Array.from({ length: 100 }, (_, j) => `card-${i}-${j}`),
          type: 'multiple_choice'
        });
    }

    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

    // メモリ増加が100MB以下
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

    // ガベージコレクションを実行
    if (global.gc) {
      global.gc();
    }

    const afterGCMemory = process.memoryUsage();
    const memoryAfterGC = afterGCMemory.heapUsed - initialMemory.heapUsed;

    // GC後のメモリ増加が50MB以下
    expect(memoryAfterGC).toBeLessThan(50 * 1024 * 1024);
  });
});
```

**実装ファイル**: `performance/api-load.test.ts`

---

### セキュリティテストケース

#### TC-039: SQL インジェクション対策

**テスト手順**:
```typescript
describe('セキュリティテスト', () => {
  const sqlInjectionPayloads = [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "1; SELECT * FROM accounts",
    "admin'--",
    "' UNION SELECT * FROM subscriptions --"
  ];

  test.each(sqlInjectionPayloads)('SQLインジェクション対策: %s', async (payload) => {
    // ユーザーID検索での攻撃
    const response1 = await request(app)
      .get('/api/pages')
      .query({ userId: payload })
      .expect(400);

    expect(response1.body.error).toContain('Invalid user ID');

    // ノート検索での攻撃
    const response2 = await request(app)
      .get('/api/search-suggestions')
      .query({ q: payload })
      .expect(200);

    // 結果が適切にエスケープされていることを確認
    expect(response2.body).toEqual([]);

    // データベースが正常に動作していることを確認
    const healthCheck = await request(app)
      .get('/api/pages')
      .query({ userId: 'valid-user-id' })
      .set('Authorization', 'Bearer valid-token');

    expect(healthCheck.status).not.toBe(500);
  });

  test('パラメータ化クエリの確認', async () => {
    // 正常なクエリが動作することを確認
    const validResponse = await request(app)
      .post('/api/notes/test-note/pages')
      .set('Authorization', 'Bearer valid-token')
      .send({
        title: "正常なタイトル",
        content: { type: 'doc', content: [] }
      })
      .expect(201);

    expect(validResponse.body.title).toBe("正常なタイトル");

    // SQLキーワードを含む正当なデータが正しく処理されることを確認
    const sqlKeywordResponse = await request(app)
      .post('/api/notes/test-note/pages')
      .set('Authorization', 'Bearer valid-token')
      .send({
        title: "SELECT文の学習",
        content: { 
          type: 'doc', 
          content: [{ 
            type: 'paragraph', 
            content: [{ type: 'text', text: 'SELECT * FROM users WHERE active = true' }] 
          }] 
        }
      })
      .expect(201);

    expect(sqlKeywordResponse.body.title).toBe("SELECT文の学習");
  });
});
```

#### TC-040: XSS 対策

**テスト手順**:
```typescript
describe('XSS対策テスト', () => {
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src="x" onerror="alert(1)">',
    'javascript:alert(1)',
    '<svg onload="alert(1)">',
    '"><script>alert(1)</script>',
    "'; alert('XSS'); //",
    '<iframe src="javascript:alert(1)"></iframe>'
  ];

  test.each(xssPayloads)('XSS対策: %s', async (payload) => {
    // ノート作成でのXSS攻撃
    const noteResponse = await request(app)
      .post('/api/notes/test-note/pages')
      .set('Authorization', 'Bearer valid-token')
      .send({
        title: payload,
        content: {
          type: 'doc',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: payload }]
          }]
        }
      })
      .expect(201);

    // HTMLタグがエスケープされていることを確認
    expect(noteResponse.body.title).not.toContain('<script>');
    expect(noteResponse.body.title).toContain('&lt;script&gt;');

    // 目標作成でのXSS攻撃
    const goalResponse = await addStudyGoal({
      title: payload,
      description: payload
    });

    expect(goalResponse.success).toBe(true);
    expect(goalResponse.data?.title).not.toContain('<script>');
  });

  test('コンテンツセキュリティポリシー', async ({ page }) => {
    await page.goto('/dashboard');

    // CSPヘッダーの確認
    const response = await page.evaluate(() => {
      return fetch('/dashboard').then(r => r.headers.get('Content-Security-Policy'));
    });

    expect(response).toContain("default-src 'self'");
    expect(response).toContain("script-src 'self'");
    expect(response).toContain("style-src 'self' 'unsafe-inline'");
  });

  test('DOM-based XSS 対策', async ({ page }) => {
    await page.goto('/pages/new');

    // Tiptapエディタでのスクリプト挿入試行
    const editor = page.locator('[data-testid="tiptap-editor"]');
    await editor.click();
    await editor.type('<script>window.xssTest = true;</script>');

    // スクリプトが実行されていないことを確認
    const xssExecuted = await page.evaluate(() => (window as any).xssTest);
    expect(xssExecuted).toBeUndefined();

    // エスケープされたテキストとして表示されていることを確認
    await expect(editor).toContainText('&lt;script&gt;');
  });
});
```

**実装ファイル**: `security/xss-prevention.test.ts`

---

## テスト実行コマンド

### 推奨 package.json スクリプト

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:security": "jest --testPathPattern=security",
    "test:performance": "jest --testPathPattern=performance",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
```

### CI/CD での実行順序

1. **並列実行可能**:
   - 単体テスト
   - セキュリティテスト
   - パフォーマンステスト（軽量）

2. **順次実行**:
   - 統合テスト（データベース操作）
   - E2Eテスト（ブラウザ操作）

3. **最終確認**:
   - カバレッジレポート生成
   - テスト結果サマリー

## 今後の改善計画

### Phase 1 (高優先度 - 2週間)
- 認証・認可テストの実装
- 基本的なAPIテストの実装
- 重要UIコンポーネントのテスト

### Phase 2 (中優先度 - 4週間)
- E2Eテストの実装
- パフォーマンステストの導入
- セキュリティテストの充実

### Phase 3 (低優先度 - 継続的)
- 外部サービス統合テスト
- アクセシビリティテスト
- 国際化対応テスト

このテストケース一覧により、for-all-learners アプリケーションの品質向上と安定性確保を段階的に実現できます。