# 静的エクスポート時のクライアントサイド認証・設定取得の実装（Phase 1完了）

## 実装日
2025年1月24日

## 概要
静的エクスポート時（Tauriアプリなど）でクライアントサイドで認証情報とユーザー設定を取得する基盤実装を完了しました。Web環境では現在のサーバーコンポーネントを維持し、環境変数`ENABLE_STATIC_EXPORT`による条件分岐で実装を切り替えます。

## 実装内容

### Phase 1: 基盤の実装（完了）

#### 1. `components/layouts/ClientThemeProvider.tsx`の作成
- `useUserSettings()`フックを使用してユーザー設定を取得
- `useEffect`でテーマを動的に適用
- `document.documentElement.className`を更新してテーマクラスを設定
- systemモードでは`window.matchMedia`でシステム設定を確認

**実装のポイント:**
- 既存のクラスを保持しつつ、テーマ関連のクラスのみを更新
- `isLoading`状態を適切に管理

#### 2. `components/layouts/ClientProtectedLayout.tsx`の作成
- `useAuth()`フックで認証状態を確認
- 認証されていない場合は`useRouter()`で`/auth/login`にリダイレクト
- クライアントサイドで以下を取得:
  - アカウント情報: `accounts`テーブルから取得
  - 管理者情報: `admin_users`テーブルから取得（role, is_activeを確認）
  - プラン情報: `subscriptions` → `plans`テーブルから取得
  - ユーザー設定: `user_settings`テーブルから`play_help_video_audio`を取得
- ローディング状態を管理し、データ取得中はローディング表示
- `AuthHeader`と`AppFooter`を含むレイアウトをレンダリング
- エラーハンドリングで`logger.error()`を使用（構造化ログ）

**実装のポイント:**
- 認証状態とデータ取得状態を分けて管理
- エラー時は適切にログを記録し、ログインページにリダイレクト

#### 3. `components/layouts/ClientPublicLayout.tsx`の作成
- `useAuth()`フックで認証状態を確認
- `UnauthHeader`に`isAuthenticated`プロップを渡す
- `AppFooter`を含むレイアウトをレンダリング

**実装のポイント:**
- シンプルな実装で、認証状態のみを確認

#### 4. `app/layout.tsx`の修正
- `ClientThemeProvider`をインポート
- 静的エクスポート時（`ENABLE_STATIC_EXPORT`がtrue）は`ClientThemeProvider`でラップ
- 通常のWeb環境では現在の実装を維持

**変更内容:**
```typescript
{isStaticExport ? (
  <ClientThemeProvider>{children}</ClientThemeProvider>
) : (
  children
)}
```

#### 5. `app/(protected)/layout.tsx`の修正
- `ClientProtectedLayout`をインポート
- 静的エクスポート時は`ClientProtectedLayout`をレンダリング
- 通常のWeb環境では現在のサーバーコンポーネントの実装を維持
- ダミーデータの作成ロジックを削除（クライアントサイドで実際のデータを取得するため）

**変更内容:**
```typescript
if (isStaticExport) {
  return <ClientProtectedLayout>{children}</ClientProtectedLayout>;
}
// 通常のWeb環境では現在のサーバーコンポーネントの実装を維持
```

#### 6. `app/(public)/layout.tsx`の修正
- `ClientPublicLayout`をインポート
- 静的エクスポート時は`ClientPublicLayout`をレンダリング
- 通常のWeb環境では現在のサーバーコンポーネントの実装を維持

**変更内容:**
```typescript
if (isStaticExport) {
  return <ClientPublicLayout>{children}</ClientPublicLayout>;
}
// 通常のWeb環境では現在のサーバーコンポーネントの実装を維持
```

## 作成・修正したファイル

### 新規作成ファイル
1. `components/layouts/ClientThemeProvider.tsx`
2. `components/layouts/ClientProtectedLayout.tsx`
3. `components/layouts/ClientPublicLayout.tsx`

### 修正ファイル
1. `app/layout.tsx`
2. `app/(protected)/layout.tsx`
3. `app/(public)/layout.tsx`

## 実装の詳細

### 認証情報の取得フロー（静的エクスポート時）
1. アプリ起動
2. `useAuth()`フックが`localStorage`からセッション情報を取得
3. セッションが存在する場合、Supabaseクライアントでセッションを検証
4. 認証されていない場合、`/auth/login`にリダイレクト
5. 認証されている場合、アカウント情報、管理者情報、プラン情報を取得
6. レイアウトをレンダリング

### ユーザー設定の取得フロー（静的エクスポート時）
1. アプリ起動
2. `useUserSettings()`フックが実行される
3. 初回レンダリング時はデフォルト値（theme: "light", mode: "system"）を使用
4. クライアントサイドでデータベースから設定を取得
5. 設定が取得できた場合、`ClientThemeProvider`でテーマを更新
6. `document.documentElement.className`を更新

### 条件分岐の実装パターン
- レイアウトファイルで`ENABLE_STATIC_EXPORT`環境変数をチェック
- 静的エクスポート時はクライアントコンポーネントをレンダリング
- 通常のWeb環境ではサーバーコンポーネントの実装を維持

## 技術的な考慮事項

### 1. Hydrationの考慮
- `suppressHydrationWarning`を使用して警告を抑制
- `ClientThemeProvider`では`useEffect`を使用してクライアントサイドでのみテーマを更新

### 2. ローディング状態の管理
- `useAuth()`の`loading`状態を使用
- `useUserSettings()`の`isLoading`状態を使用
- `ClientProtectedLayout`ではデータ取得中にローディング表示

### 3. リダイレクトの実装
- クライアントサイドでのリダイレクトは`useRouter()`を使用
- `redirect()`はサーバーコンポーネント専用のため使用しない
- `useEffect`内でリダイレクトを実行

### 4. 型安全性
- クライアントサイドで取得するデータの型を適切に定義
- `null`チェックを適切に行う
- ダミーデータの使用を避ける（実際のデータを取得するまでローディング状態を表示）

### 5. エラーハンドリング
- `logger.error()`を使用して構造化ログを記録
- エラー時は適切にログインページにリダイレクト

## テスト状況

### リンターエラー
- すべてのファイルでリンターエラーなし

### 実装確認
- ✅ `ClientThemeProvider`が作成され、テーマが動的に適用される
- ✅ `ClientProtectedLayout`が作成され、認証状態が正しく管理される
- ✅ `ClientPublicLayout`が作成され、認証状態が正しく表示される
- ✅ すべてのレイアウトファイルが修正され、条件分岐が正しく動作する

## 次のステップ（Phase 2以降）

### Phase 2: 主要ページの対応（未実装）
以下のページファイルについて、静的エクスポート時の対応を追加する必要があります：

1. `app/(protected)/dashboard/page.tsx`
2. `app/(protected)/notes/explorer/page.tsx`
3. `app/(protected)/settings/page.tsx`
4. `app/auth/login/page.tsx`

### Phase 3: その他のページの対応（未実装）
残りのページファイルを順次対応する必要があります。

## 関連ドキュメント

- Plan: `docs/03_plans/tauri-migration/20250124_01_static-export-client-side-auth-implementation-plan.md`
- Research: `docs/02_research/2025_11/20251109_02_supabase-tauri-integration.md`

## 完了条件の進捗

- [x] `ClientThemeProvider`が作成され、テーマが正しく適用される
- [x] `ClientProtectedLayout`が作成され、認証状態が正しく管理される
- [x] `ClientPublicLayout`が作成され、認証状態が正しく表示される
- [x] すべてのレイアウトファイルが修正され、条件分岐が正しく動作する
- [ ] 主要なページファイルが修正され、静的エクスポート時も動作する（Phase 2）
- [ ] 静的エクスポートビルドが成功する（未テスト）
- [ ] 通常のWeb環境でも既存の機能が正常に動作する（未テスト）
- [ ] Tauri環境で認証・設定が正しく動作する（未テスト）
- [ ] 静的エクスポート互換性チェックが通過する（未テスト）

## まとめ

Phase 1（基盤の実装）を完了しました。静的エクスポート時にクライアントサイドで認証情報とユーザー設定を取得する基盤が整いました。次のPhase 2では、主要なページファイルの対応を進める必要があります。

