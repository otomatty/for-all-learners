# Tauri 2.0 ネイティブアプリ化移行計画

## 概要

**目的**: PWA として運用中の Next.js 16 アプリケーションを Tauri 2.0 を用いてネイティブアプリ化し、デスクトップ（Windows/macOS/Linux）およびモバイル（iOS/Android）で動作させる。

**期待される効果**:
- オフライン時の機能保証
- ネイティブ通知・ファイルシステムアクセス
- 統一された学習体験の提供
- App Store / Play Store での配布

**技術スタック**:
- Frontend: Next.js 16 + React + TypeScript
- Runtime: Bun
- Backend: Tauri 2.0 (Rust)
- Database: Supabase

---

## 現行アプリの制約と移行時の考慮事項

### 1. Next.js の構成
**現状**:
- `output: "export"` を使用していない（動的レンダリング）
- Server Actions を `app/_actions/*` で活用
- App Router (`app/` ディレクトリ) を使用

**Tauri への影響**:
- 静的エクスポートできないため、以下の選択肢から選定が必要：
  1. **Server Actions を廃止** して静的エクスポート化（推奨）
  2. Tauri 内で Node.js サーバーを起動（複雑、非推奨）
  3. Server Actions を API Routes に移行して段階的に対応

**推奨アプローチ**: Server Actions → Client-side data fetching (SWR/TanStack Query) + Supabase Direct Access へ移行

### 2. PWA との競合
**現状**:
- `next-pwa` による Service Worker (`public/sw.js`)

**問題点**:
- iOS の `WKWebView` では Service Worker が制限される
- Tauri の WebView と Service Worker が衝突する可能性

**対応方針**:
```typescript
// Tauri環境を検出してService Workerを無効化
if (typeof window !== 'undefined' && !window.__TAURI__) {
  // PWA版のみService Workerを登録
  registerServiceWorker();
}
```

### 3. Web Worker (Plugin System)
**現状**:
- `scripts/build-sandbox-worker.ts` で Web Worker をビルド
- `lib/plugins/` 配下でプラグインシステムを実装

**対応方針**:
- Web Worker は Tauri の WebView でもサポートされているため、そのまま利用可能
- `public/workers/` の配置パスが Tauri の `frontendDist` で正しく解決されるか検証が必要

### 4. Supabase 認証
**検証事項**:
- OAuth コールバック URL の Tauri カスタムスキーム対応 (`tauri://localhost`)
- セッション管理が WebView でも動作するか
- Deep Link 対応（モバイル）

---

## Next.js + Tauri 統合方法

### 基本セットアップ（デスクトップ）

#### Step 1: Tauri CLI のインストール

```bash
# Rustのインストール（未インストールの場合）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Tauri CLIのインストール
bun add -D @tauri-apps/cli
```

#### Step 2: Tauri プロジェクトの初期化

```bash
bunx tauri init
```

**設定時の入力内容**:
- App name: `For All Learners`
- Window title: `For All Learners`
- Web assets location: `../out` (静的エクスポート時) または `../` (dev server時)
- Dev server URL: `http://localhost:3000`
- Frontend dev command: `bun run dev`
- Frontend build command: `bun run build`

#### Step 3: `next.config.ts` の調整

```typescript
import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';
const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined;

const nextConfig: NextConfig = {
  // Tauri本番ビルド時のみ静的エクスポート
  output: isTauri && isProd ? 'export' : undefined,
  
  // 画像最適化はTauri環境では無効化
  images: {
    unoptimized: isTauri,
  },
  
  // Base pathの設定（必要に応じて）
  basePath: '',
  assetPrefix: '',
};

export default nextConfig;
```

#### Step 4: `src-tauri/tauri.conf.json` の設定

```json
{
  "build": {
    "beforeDevCommand": "bun run dev",
    "beforeBuildCommand": "bun run build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../out"
  },
  "bundle": {
    "active": true,
    "identifier": "com.forallearners.app",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  },
  "app": {
    "windows": [
      {
        "title": "For All Learners",
        "width": 1200,
        "height": 800,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": "default-src 'self'; connect-src 'self' https://*.supabase.co"
    }
  }
}
```

#### Step 5: 開発・ビルドスクリプトの追加

`package.json`:
```json
{
  "scripts": {
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "tauri:build:debug": "tauri build --debug"
  }
}
```

---

## プラットフォーム別の段階的移行計画

### Phase 1: デスクトップ対応（優先度: 高）

**目標**: Windows / macOS / Linux でネイティブアプリとして動作させる

#### タスク
1. **環境構築** (1-2日)
   - [ ] Rust toolchain インストール
   - [ ] Tauri CLI セットアップ
   - [ ] デスクトップ向け `tauri.conf.json` 作成
   - [ ] アイコンアセット準備（`.icns`, `.ico`, `.png`）

2. **Next.js の静的化対応** (3-5日)
   - [ ] Server Actions の棚卸し
   - [ ] Client-side fetching への移行（SWR または TanStack Query）
   - [ ] `output: "export"` の動作確認
   - [ ] 動的ルートの `generateStaticParams` 実装

3. **Tauri API 統合** (2-3日)
   - [ ] `@tauri-apps/api` のインストール
   - [ ] Window 操作（最小化、最大化、閉じる）の実装
   - [ ] ダイアログ機能（`@tauri-apps/api/dialog`）の実装
   - [ ] 通知機能（`@tauri-apps/plugin-notification`）の実装

4. **Service Worker の制御** (1-2日)
   - [ ] Tauri 環境検出ロジック実装
   - [ ] PWA と Tauri の共存テスト
   - [ ] キャッシュ戦略の調整

5. **ビルド・配布** (2-3日)
   - [ ] 各OS向けビルドの動作確認
   - [ ] インストーラー生成テスト（`.dmg`, `.msi`, `.AppImage`）
   - [ ] コード署名の調査・設定
   - [ ] 自動更新機能の検討（`tauri-plugin-updater`）

**完了条件**:
- Windows / macOS / Linux で動作するビルド成果物が生成できる
- PWA版と機能的に同等
- Supabase 認証が正常に動作する

---

### Phase 2: Android 対応（優先度: 中）

**目標**: Google Play Store で配布可能な Android アプリを作成

#### 前提条件
- Android Studio インストール
- Android SDK (API Level 24+)
- Java Development Kit (JDK) 17+

#### タスク

1. **Android プロジェクト初期化** (1-2日)
   - [ ] `bunx tauri android init` 実行
   - [ ] `src-tauri/Cargo.toml` に `crate-type = ["lib", "cdylib", "staticlib"]` 追加
   - [ ] `src-tauri/gen/android/` の生成確認

2. **Android 固有設定** (2-3日)
   - [ ] `AndroidManifest.xml` の権限設定（INTERNET, NOTIFICATIONS など）
   - [ ] アイコン・スプラッシュスクリーンの Android リソース作成
   - [ ] `build.gradle` の依存関係確認
   - [ ] 最小 SDK バージョンの設定（推奨: API 24 / Android 7.0）

3. **UI/UX 調整** (3-5日)
   - [ ] タッチ操作の最適化
   - [ ] 小画面対応の確認（レスポンシブデザイン検証）
   - [ ] ソフトウェアキーボード表示時のレイアウト調整
   - [ ] Back ボタンのハンドリング実装

4. **プラグイン統合** (2-3日)
   - [ ] `@tauri-apps/plugin-notification` の Android 対応確認
   - [ ] プッシュ通知の実装（Firebase Cloud Messaging 検討）
   - [ ] ファイルアクセス権限の実装
   - [ ] Deep Link の設定（`tauri://` スキーム）

5. **ビルド・テスト** (3-5日)
   - [ ] `bunx tauri android dev` での動作確認（エミュレータ）
   - [ ] 実機テスト
   - [ ] リリースビルド生成（`bunx tauri android build --release`）
   - [ ] APK/AAB の署名設定
   - [ ] Google Play Console へのアップロード準備

**完了条件**:
- Android エミュレータおよび実機で動作する
- Play Store の審査要件を満たす
- 署名済み AAB が生成できる

---

### Phase 3: iOS 対応（優先度: 中）

**目標**: App Store で配布可能な iOS アプリを作成

#### 前提条件
- macOS（必須）
- Xcode 14+
- Apple Developer アカウント

#### タスク

1. **iOS プロジェクト初期化** (1-2日)
   - [ ] `bunx tauri ios init` 実行
   - [ ] `src-tauri/Cargo.toml` の `crate-type` 確認
   - [ ] `src-tauri/gen/apple/` の生成確認

2. **iOS 固有設定** (2-3日)
   - [ ] `Info.plist` の設定（権限記述、URL スキーム）
   - [ ] アイコン・スプラッシュスクリーンの iOS リソース作成
   - [ ] プロビジョニングプロファイルの設定
   - [ ] 最小 iOS バージョン設定（推奨: iOS 13.0+）

3. **WKWebView 制約への対応** (2-3日)
   - [ ] Service Worker の完全無効化確認
   - [ ] IndexedDB / LocalStorage の動作検証
   - [ ] Cross-Origin の制約確認（Supabase API アクセス）

4. **UI/UX 調整** (3-5日)
   - [ ] Safe Area の適用（ノッチ・ホームインジケーター対応）
   - [ ] iOS 特有のジェスチャー対応（スワイプバック など）
   - [ ] ダークモード対応の確認
   - [ ] キーボード表示時のレイアウト調整

5. **プラグイン統合** (2-3日)
   - [ ] 通知機能の iOS 実装（APNs 設定）
   - [ ] ファイルアクセス権限の実装
   - [ ] Deep Link / Universal Links の設定
   - [ ] OAuth コールバックの動作確認

6. **ビルド・テスト** (5-7日)
   - [ ] Xcode シミュレータでの動作確認
   - [ ] 実機テスト（TestFlight 配布）
   - [ ] リリースビルド生成
   - [ ] App Store Connect へのアップロード
   - [ ] 審査ガイドライン準拠の確認

**完了条件**:
- iOS シミュレータおよび実機で動作する
- App Store の審査要件を満たす
- TestFlight で配布可能な IPA が生成できる

---

## 共通の技術課題と対応方針

### 1. Supabase 認証の Tauri 対応

**課題**:
- OAuth リダイレクト URL が `http://localhost` ではなくカスタムスキームになる

**対応**:
```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Tauri環境ではカスタムスキームを使用
const isTauri = typeof window !== 'undefined' && window.__TAURI__;
const redirectUrl = isTauri 
  ? 'tauri://localhost/auth/callback' 
  : `${window.location.origin}/auth/callback`;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    redirectTo: redirectUrl,
  },
});
```

### 2. Web Worker のパス解決

**課題**:
- Tauri の `frontendDist` で Web Worker のパスが正しく解決されない可能性

**対応**:
```typescript
// lib/plugins/plugin-loader/worker-manager.ts
const getWorkerPath = () => {
  if (typeof window !== 'undefined' && window.__TAURI__) {
    // Tauri環境
    return new URL('/workers/sandbox-worker.js', window.location.origin);
  }
  // Web環境
  return '/workers/sandbox-worker.js';
};

const worker = new Worker(getWorkerPath());
```

### 3. ビルドスクリプトの調整

**課題**:
- Bun の Web Worker ビルドスクリプトが Tauri ビルドプロセスと統合されていない

**対応**:
```json
// package.json
{
  "scripts": {
    "build:workers": "bun run scripts/build-sandbox-worker.ts",
    "build:next": "next build",
    "build": "bun run build:workers && bun run build:next",
    "tauri:build": "bun run build && tauri build"
  }
}
```

---

## リスク評価と軽減策

| リスク | 影響度 | 発生確率 | 軽減策 |
|--------|--------|----------|--------|
| Server Actions が静的化できない | 高 | 中 | 段階的にクライアント側フェッチに移行 |
| iOS Service Worker 制約 | 中 | 高 | Tauri 環境では Service Worker を無効化 |
| Supabase OAuth がカスタムスキームで動作しない | 高 | 中 | Deep Link 設定とコールバックハンドラの実装 |
| モバイルストア審査で却下 | 中 | 中 | 審査ガイドラインの事前確認と対応 |
| Bun と Rust ビルドツールの競合 | 低 | 低 | ビルドスクリプトの明確な分離 |

---

## 参考資料

### 公式ドキュメント
- [Tauri 2.0 Overview](https://v2.tauri.app/start/overview/)
- [Next.js with Tauri](https://v2.tauri.app/start/frontend/nextjs/)
- [Mobile Development](https://v2.tauri.app/development/mobile/overview/)
- [Security & Allowlist](https://v2.tauri.app/development/security/allowlist/)
- [JavaScript API Reference](https://v2.tauri.app/reference/javascript/)

### プラグイン
- [Notification Plugin](https://v2.tauri.app/plugins/notification/)
- [Dialog Plugin](https://v2.tauri.app/plugins/dialog/)
- [Updater Plugin](https://v2.tauri.app/plugins/updater/)

### プロジェクト内ドキュメント

#### 技術調査
- [Server Actions 移行戦略](../02_research/2025_11/20251109_01_server-actions-migration-strategy.md) - Server Actions を Tauri 環境で動作させるための移行戦略
- [Supabase Tauri 統合戦略](../02_research/2025_11/20251109_02_supabase-tauri-integration.md) - Tauri 環境での Supabase 接続・認証・セッション管理

#### 実装計画・作業ログ
- 実装計画: `docs/03_plans/tauri-migration/`（作成予定）
- 作業ログ: `docs/05_logs/2025_11/`

---

## 次のアクション

1. **Phase 1（デスクトップ）の詳細計画書を作成**
   - ファイル: `docs/03_plans/tauri-migration/01_desktop-migration.md`
   
2. **Server Actions の棚卸し Issue を作成**
   - どの機能がServer Actionsに依存しているか調査
   - クライアント側への移行優先度を決定

3. **プロトタイプの作成**
   - 最小構成での Tauri + Next.js の動作確認
   - Supabase 認証の動作検証


