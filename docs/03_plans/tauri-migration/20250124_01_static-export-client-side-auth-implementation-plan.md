# 静的エクスポート時のクライアントサイド認証・設定取得の実装計画

## 概要

Web環境では現在のサーバーコンポーネントを維持し、静的エクスポート時（Tauriデスクトップアプリなど）ではクライアントサイドで認証情報とユーザー設定を取得する実装を追加します。

## 背景・目的

### 現状の問題

1. **静的エクスポート時の制約**
   - Next.jsの静的エクスポート（`output: "export"`）では`cookies()`が使用できない
   - サーバーコンポーネントで認証情報やユーザー設定を取得できない
   - 現在の実装では静的エクスポート時にデフォルト値のみ使用される

2. **ユーザー体験への影響**
   - 静的エクスポート時（Tauriアプリ）でユーザー設定が反映されない
   - 認証状態が正しく管理されない可能性がある

### 目的

- Web環境では現在のサーバーコンポーネントの実装を維持（パフォーマンスとSEOの利点を保持）
- 静的エクスポート時はクライアントサイドで認証・設定を取得し、ユーザー体験を向上
- 環境変数`ENABLE_STATIC_EXPORT`による条件分岐で実装を切り替え

## 実装方針

### アーキテクチャ

```
┌─────────────────────────────────────────┐
│         app/layout.tsx                   │
│  (Server Component - 常にサーバー)      │
│                                         │
│  if (ENABLE_STATIC_EXPORT)              │
│    → デフォルト値を使用                 │
│    → ClientThemeProvider を追加         │
│  else                                   │
│    → サーバーサイドで設定取得           │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐    ┌─────────▼──────────┐
│ (protected)/   │    │ (public)/          │
│ layout.tsx     │    │ layout.tsx         │
│                │    │                     │
│ if (STATIC)    │    │ if (STATIC)        │
│  → Client      │    │  → Client          │
│     Protected  │    │     Public         │
│     Layout     │    │     Layout         │
│ else           │    │ else               │
│  → Server      │    │  → Server          │
│     Component  │    │     Component      │
└────────────────┘    └────────────────────┘
```

### 認証情報の保持方法

#### クライアントサイド（静的エクスポート時）
- **Supabaseクライアント**: `lib/supabase/client.ts`が`localStorage`にセッション情報を保存
- **Tauri環境**: `lib/supabase/tauri-client.ts`で`localStorage`を明示的に使用
- **認証状態管理**: `lib/hooks/use-auth.ts`の`useAuth()`フックを使用
- **セッション永続化**: `persistSession: true`で自動的に永続化

#### サーバーサイド（通常のWeb環境）
- 現在の実装を維持（`cookies()`を使用）

### ユーザー設定の反映方法

#### クライアントサイド（静的エクスポート時）
- **取得**: `hooks/user_settings/useUserSettings.ts`の`useUserSettings()`フックを使用
- **適用**: `ThemeProvider`でテーマを動的に適用
- **初期値**: 初回レンダリング時はデフォルト値を使用し、取得後に更新

#### サーバーサイド（通常のWeb環境）
- 現在の実装を維持（サーバーサイドで取得してpropsとして渡す）

## 実装詳細

### Phase 1: クライアントサイドテーマプロバイダーの作成

#### 1.1 `components/layouts/ClientThemeProvider.tsx`の作成

**責務**:
- 静的エクスポート時用のクライアントコンポーネント
- `useUserSettings()`フックを使用してユーザー設定を取得
- テーマを動的に適用

**実装内容**:
```typescript
"use client";

import { useEffect } from "react";
import { useUserSettings } from "@/hooks/user_settings/useUserSettings";

export function ClientThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: settings, isLoading } = useUserSettings();
  
  useEffect(() => {
    if (!isLoading && settings) {
      // テーマを動的に適用
      const themeClass = `theme-${settings.theme}`;
      const darkClass = settings.mode === "dark" ? "dark" : "";
      document.documentElement.className = `${darkClass} ${themeClass}`;
    }
  }, [settings, isLoading]);
  
  return <>{children}</>;
}
```

**DEPENDENCY MAP**:
- Parents: `app/layout.tsx`
- Dependencies: `hooks/user_settings/useUserSettings.ts`

### Phase 2: クライアントサイドレイアウトコンポーネントの作成

#### 2.1 `components/layouts/ClientProtectedLayout.tsx`の作成

**責務**:
- 静的エクスポート時用の保護されたレイアウト
- `useAuth()`フックを使用して認証状態を確認
- 認証されていない場合はログインページにリダイレクト
- クライアントサイドでアカウント情報、管理者情報、プラン情報を取得

**実装内容**:
```typescript
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { useUserSettings } from "@/hooks/user_settings/useUserSettings";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AppFooter } from "@/components/layouts/AppFooter";
import { navigationConfig } from "@/lib/navigation/config";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type Plan = Database["public"]["Tables"]["plans"]["Row"];

export function ClientProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: userSettings } = useUserSettings();
  const [account, setAccount] = useState<Database["public"]["Tables"]["accounts"]["Row"] | null>(null);
  const [admin, setAdmin] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [playAudio, setPlayAudio] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push("/auth/login");
      return;
    }
    
    // アカウント情報、管理者情報、プラン情報を取得
    // ... 実装詳細
  }, [user, authLoading, router]);
  
  if (loading || !account) {
    return <div>読み込み中...</div>;
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <AuthHeader
        version={version}
        isAdmin={admin}
        appNavItems={navigationConfig.desktop}
        playAudio={playAudio}
        account={account}
        plan={plan}
      />
      <main className="bg-secondary min-h-screen">{children}</main>
      <AppFooter version={version} appName="For All Learners" />
    </div>
  );
}
```

**DEPENDENCY MAP**:
- Parents: `app/(protected)/layout.tsx`
- Dependencies:
  - `lib/hooks/use-auth.ts`
  - `hooks/user_settings/useUserSettings.ts`
  - `lib/supabase/client.ts`
  - `components/auth/AuthHeader.tsx`

#### 2.2 `components/layouts/ClientPublicLayout.tsx`の作成

**責務**:
- 静的エクスポート時用の公開レイアウト
- `useAuth()`フックを使用して認証状態を確認
- 認証状態を`UnauthHeader`に渡す

**実装内容**:
```typescript
"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { UnauthHeader } from "@/components/auth/UnauthHeader";
import { AppFooter } from "@/components/layouts/AppFooter";
import pkg from "../../../package.json";

const version = pkg.version;

export function ClientPublicLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col">
      <UnauthHeader version={version} isAuthenticated={!!user} />
      <main>{children}</main>
      <AppFooter version={version} appName="For All Learners" />
    </div>
  );
}
```

**DEPENDENCY MAP**:
- Parents: `app/(public)/layout.tsx`
- Dependencies:
  - `lib/hooks/use-auth.ts`
  - `components/auth/UnauthHeader.tsx`

### Phase 3: レイアウトファイルの修正

#### 3.1 `app/layout.tsx`の修正

**変更内容**:
- `ClientThemeProvider`を追加
- 静的エクスポート時はクライアントサイドでテーマを更新

**実装内容**:
```typescript
// 既存のコードに追加
import { ClientThemeProvider } from "@/components/layouts/ClientThemeProvider";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);
  // ... 既存のコード ...
  
  return (
    <html lang="ja" className={`${darkClass} ${themeClass}`} suppressHydrationWarning>
      {/* ... 既存のhead ... */}
      <body className={inter.className} suppressHydrationWarning>
        <Providers theme={theme} mode={mode as "light" | "dark" | "system"}>
          {isStaticExport ? (
            <ClientThemeProvider>{children}</ClientThemeProvider>
          ) : (
            children
          )}
        </Providers>
      </body>
    </html>
  );
}
```

#### 3.2 `app/(protected)/layout.tsx`の修正

**変更内容**:
- 静的エクスポート時は`ClientProtectedLayout`をレンダリング
- 通常のWeb環境では現在のサーバーコンポーネントの実装を維持

**実装内容**:
```typescript
import { ClientProtectedLayout } from "@/components/layouts/ClientProtectedLayout";

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);
  
  // 静的エクスポート時はクライアントコンポーネントを使用
  if (isStaticExport) {
    return <ClientProtectedLayout>{children}</ClientProtectedLayout>;
  }
  
  // 通常のWeb環境では現在の実装を維持
  // ... 既存のコード ...
}
```

#### 3.3 `app/(public)/layout.tsx`の修正

**変更内容**:
- 静的エクスポート時は`ClientPublicLayout`をレンダリング
- 通常のWeb環境では現在のサーバーコンポーネントの実装を維持

**実装内容**:
```typescript
import { ClientPublicLayout } from "@/components/layouts/ClientPublicLayout";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);
  
  // 静的エクスポート時はクライアントコンポーネントを使用
  if (isStaticExport) {
    return <ClientPublicLayout>{children}</ClientPublicLayout>;
  }
  
  // 通常のWeb環境では現在の実装を維持
  // ... 既存のコード ...
}
```

### Phase 4: ページファイルの対応

#### 4.1 既存のクライアントコンポーネントの活用

多くのページでは既に`*Client.tsx`コンポーネントが存在するため、それらを活用します。

**例**: `app/(protected)/dashboard/page.tsx`
- 静的エクスポート時は`DashboardPageClient`コンポーネントを作成し、クライアントサイドでデータを取得
- 通常のWeb環境では現在のサーバーコンポーネントの実装を維持

#### 4.2 修正が必要なページファイル

以下のページファイルについて、静的エクスポート時の対応を追加：

1. `app/auth/login/page.tsx`
2. `app/admin/page.tsx`
3. `app/admin/users/page.tsx`
4. `app/admin/layout.tsx`
5. `app/(protected)/settings/page.tsx`
6. `app/(protected)/learn/page.tsx`
7. `app/(protected)/goals/page.tsx`
8. `app/(protected)/decks/page.tsx`
9. `app/(protected)/decks/[deckId]/page.tsx`
10. `app/(protected)/decks/[deckId]/ocr/page.tsx`
11. `app/(protected)/decks/[deckId]/pdf/page.tsx`
12. `app/(protected)/decks/[deckId]/audio/page.tsx`
13. `app/(protected)/notes/[slug]/page.tsx`
14. `app/(protected)/notes/[slug]/[id]/page.tsx`
15. `app/(protected)/notes/[slug]/[id]/generate-cards/page.tsx`
16. `app/(protected)/notes/default/new/route.ts`
17. `app/(protected)/notes/[slug]/new/route.ts`
18. `app/(protected)/profile/page.tsx`
19. `app/(public)/inquiry/page.tsx`
20. `app/auth/callback/route.ts`

## ファイル一覧

### 新規作成ファイル

1. `components/layouts/ClientThemeProvider.tsx`
   - クライアントサイドテーマプロバイダー
   - `useUserSettings()`を使用してテーマを動的に適用

2. `components/layouts/ClientProtectedLayout.tsx`
   - クライアントサイド保護レイアウト
   - `useAuth()`を使用して認証状態を管理
   - クライアントサイドでアカウント情報、管理者情報、プラン情報を取得

3. `components/layouts/ClientPublicLayout.tsx`
   - クライアントサイド公開レイアウト
   - `useAuth()`を使用して認証状態を確認

### 修正ファイル

1. `app/layout.tsx`
   - `ClientThemeProvider`を追加
   - 静的エクスポート時の条件分岐を追加

2. `app/(protected)/layout.tsx`
   - 静的エクスポート時の条件分岐を追加
   - `ClientProtectedLayout`を使用

3. `app/(public)/layout.tsx`
   - 静的エクスポート時の条件分岐を追加
   - `ClientPublicLayout`を使用

4. 各ページファイル（上記リスト参照）
   - 静的エクスポート時の条件分岐を追加
   - クライアントコンポーネントのラッパーを作成または既存のものを活用

## 実装の詳細

### 認証情報の取得フロー（静的エクスポート時）

```
1. アプリ起動
   ↓
2. useAuth()フックがlocalStorageからセッション情報を取得
   ↓
3. セッションが存在する場合
   → Supabaseクライアントでセッションを検証
   → 有効な場合、ユーザー情報を取得
   ↓
4. 認証されていない場合
   → /auth/loginにリダイレクト
   ↓
5. 認証されている場合
   → アカウント情報、管理者情報、プラン情報を取得
   → レイアウトをレンダリング
```

### ユーザー設定の取得フロー（静的エクスポート時）

```
1. アプリ起動
   ↓
2. useUserSettings()フックが実行される
   ↓
3. 初回レンダリング時
   → デフォルト値（theme: "light", mode: "system"）を使用
   ↓
4. クライアントサイドでデータベースから設定を取得
   ↓
5. 設定が取得できた場合
   → ThemeProviderでテーマを更新
   → document.documentElement.classNameを更新
```

### 条件分岐の実装パターン

```typescript
// パターン1: レイアウトでの条件分岐
export default async function Layout({ children }: { children: React.ReactNode }) {
  const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);
  
  if (isStaticExport) {
    return <ClientLayout>{children}</ClientLayout>;
  }
  
  // サーバーコンポーネントの実装
  const supabase = await createClient();
  // ...
}

// パターン2: ページでの条件分岐
export default async function Page() {
  const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);
  
  if (isStaticExport) {
    return <PageClient />;
  }
  
  // サーバーコンポーネントの実装
  const supabase = await createClient();
  // ...
}
```

## 注意事項

### 1. Hydrationの考慮

- クライアントサイドでテーマを更新する際、サーバーとクライアントの初期レンダリングが異なる可能性がある
- `suppressHydrationWarning`を使用して警告を抑制
- `ClientThemeProvider`では`useEffect`を使用してクライアントサイドでのみテーマを更新

### 2. ローディング状態の管理

- クライアントサイドで認証情報を取得する間、ローディング状態を表示
- `useAuth()`の`loading`状態を使用
- `useUserSettings()`の`isLoading`状態を使用

### 3. リダイレクトの実装

- クライアントサイドでのリダイレクトは`useRouter()`を使用
- `redirect()`はサーバーコンポーネント専用のため使用しない
- `useEffect`内でリダイレクトを実行

### 4. 型安全性

- クライアントサイドで取得するデータの型を適切に定義
- `null`チェックを適切に行う
- ダミーデータの使用を避ける（実際のデータを取得するまでローディング状態を表示）

### 5. パフォーマンス

- クライアントサイドでのデータ取得はReact Queryを使用してキャッシュ
- 不要な再レンダリングを避ける
- `useMemo`や`useCallback`を適切に使用

## テスト方法

### 1. 通常のWeb環境でのテスト

```bash
# 開発サーバーを起動
bun run dev

# 以下を確認:
# - サーバーサイドで認証情報が取得されること
# - サーバーサイドでユーザー設定が取得されること
# - テーマが正しく適用されること
# - 認証が必要なページでリダイレクトが動作すること
```

### 2. 静的エクスポート環境でのテスト

```bash
# 静的エクスポートビルドを実行
bun run build:static

# outディレクトリを確認
# - ビルドが成功すること
# - 静的ファイルが生成されること

# ローカルサーバーで確認（例: serve）
npx serve out

# 以下を確認:
# - クライアントサイドで認証情報が取得されること
# - クライアントサイドでユーザー設定が取得されること
# - テーマが正しく適用されること
# - 認証が必要なページでリダイレクトが動作すること
```

### 3. Tauri環境でのテスト

```bash
# Tauri開発モードで起動
bun run tauri:dev

# 以下を確認:
# - 認証情報がlocalStorageに保存されること
# - ユーザー設定が正しく取得されること
# - テーマが正しく適用されること
# - 認証が必要なページでリダイレクトが動作すること
```

### 4. 静的エクスポート互換性チェック

```bash
# 静的エクスポート互換性チェックを実行
bun run check:static-export

# 以下を確認:
# - 新しい問題が検出されないこと
# - 既存の問題が解決されていること
```

## 実装の優先順位

### Phase 1: 基盤の実装（最優先）
1. `ClientThemeProvider`の作成
2. `ClientProtectedLayout`の作成
3. `ClientPublicLayout`の作成
4. `app/layout.tsx`の修正
5. `app/(protected)/layout.tsx`の修正
6. `app/(public)/layout.tsx`の修正

### Phase 2: 主要ページの対応
1. `app/(protected)/dashboard/page.tsx`
2. `app/(protected)/notes/explorer/page.tsx`
3. `app/(protected)/settings/page.tsx`
4. `app/auth/login/page.tsx`

### Phase 3: その他のページの対応
1. 残りのページファイルを順次対応

## 関連ドキュメント

- Issue: `docs/01_issues/`（該当するIssueがあれば）
- Research: `docs/02_research/2025_11/20251109_02_supabase-tauri-integration.md`
- Plan: `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md`
- Log: `docs/05_logs/`（実装後に作成）

## 完了条件

- [ ] `ClientThemeProvider`が作成され、テーマが正しく適用される
- [ ] `ClientProtectedLayout`が作成され、認証状態が正しく管理される
- [ ] `ClientPublicLayout`が作成され、認証状態が正しく表示される
- [ ] すべてのレイアウトファイルが修正され、条件分岐が正しく動作する
- [ ] 主要なページファイルが修正され、静的エクスポート時も動作する
- [ ] 静的エクスポートビルドが成功する
- [ ] 通常のWeb環境でも既存の機能が正常に動作する
- [ ] Tauri環境で認証・設定が正しく動作する
- [ ] 静的エクスポート互換性チェックが通過する

