# Tauri 2.0 環境構築作業ログ

## 作業日時
2025年11月16日

## 作業概要
GitHub Issue #120（Tauri 2.0 ネイティブアプリ化）の Phase 0（準備・環境構築）を実施。Tauri開発環境のセットアップと基本設定を完了し、Next.jsアプリケーションがTauri内で正常に動作することを確認。

## 関連Issue/Plan
- **親Issue**: #120 - Tauri 2.0 ネイティブアプリ化実装
- **サブIssue**: #145 - Phase 0 - 準備・環境構築
- **実装計画**: `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md`

## 作業内容

### 1. Rust toolchain の確認

**実施内容:**
- rustc と cargo のインストール状況を確認
- 既にインストール済みであることを確認

**結果:**
```
rustc 1.85.0 (4d91de4e4 2025-02-17)
cargo 1.85.0 (d73d2caf9 2024-12-31)
```

### 2. Tauri パッケージのインストール

**実施内容:**
```bash
bun add -D @tauri-apps/cli
bun add @tauri-apps/api
```

**インストールされたバージョン:**
- `@tauri-apps/cli@2.9.4` (devDependencies)
- `@tauri-apps/api@2.9.0` (dependencies)

### 3. Tauri プロジェクトの初期化

**実施内容:**
```bash
bunx tauri init --ci
```

**作成されたファイル:**
- `src-tauri/tauri.conf.json` - Tauri設定ファイル
- `src-tauri/Cargo.toml` - Rustの依存関係
- `src-tauri/src/main.rs` - Tauriアプリケーションのエントリーポイント
- `src-tauri/src/lib.rs` - アプリケーションライブラリ
- `src-tauri/build.rs` - ビルドスクリプト
- `src-tauri/icons/*` - アプリケーションアイコン一式

### 4. tauri.conf.json の設定

**設定内容:**
```json
{
  "productName": "For All Learners",
  "version": "0.3.0",
  "identifier": "com.saedgewell.for-all-learners",
  "build": {
    "frontendDist": "../out",
    "devUrl": "http://localhost:3000",
    "beforeDevCommand": "bun dev",
    "beforeBuildCommand": "bun build"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "For All Learners",
        "url": "dashboard",
        "width": 1400,
        "height": 900,
        "resizable": true,
        "fullscreen": false,
        "center": true
      }
    ],
    "security": {
      "csp": null
    }
  }
}
```

**設定のポイント:**
- 初期表示URL: `/dashboard`
- ウィンドウサイズ: 1400x900
- 開発環境: Next.js開発サーバー（http://localhost:3000）に接続

### 5. package.json へのスクリプト追加

**追加したスクリプト:**
```json
{
  "tauri:dev": "bunx tauri dev",
  "tauri:build": "bunx tauri build"
}
```

### 6. Next.js 設定の調整（方針転換）

#### 6.1 最初の試み：静的エクスポート方式

**実施内容:**
Tauri公式ドキュメントに従い、`next.config.ts` に以下を設定：
- `output: "export"` - 静的エクスポートモード
- `images.unoptimized: true` - 画像最適化を無効化
- `assetPrefix` - アセットパス設定

**発生した問題:**
```
⨯ Middleware cannot be used with "output: export"
⨯ Error: Route / with `dynamic = "error"` couldn't be rendered statically because it used `cookies()`
```

**問題の原因:**
- 静的エクスポートはMiddlewareをサポートしない
- Server Actionsが大量に存在し、`cookies()`を使用している
- サーバーサイド認証が動作しない

#### 6.2 方針転換：Next.js開発サーバーモード

**新しいアプローチ:**
- `output: "export"` を削除
- Tauri内でNext.js開発サーバーを動作させる
- Server Actions、Middleware、認証をそのまま維持
- Phase 1-6で段階的にクライアントサイドへ移行

**修正後の `next.config.ts`:**
```typescript
const nextConfig: NextConfig = {
  // NOTE: Static export (output: "export") is NOT used for now
  // Current app structure uses Server Actions, middleware, and server-side auth
  // Will gradually migrate to client-side in Phase 1-6 of Tauri migration
  // For now, Tauri runs Next.js dev server internally
  images: {
    unoptimized: false,
    domains: [/* existing domains */],
  },
  assetPrefix: process.env.TAURI_ENV ? `http://${internalHost}:3000` : undefined,
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  // ... webpack config
};
```

### 7. middleware.ts の復元

**問題:**
`middleware.ts` が `middleware.ts.disabled` にリネームされていた

**実施内容:**
```bash
mv middleware.ts.disabled middleware.ts
```

**middleware.ts の役割:**
- 認証チェック（未認証ユーザーをログインページへリダイレクト）
- CSPヘッダーの設定（プラグインシステムのセキュリティ）
- ルートリダイレクト処理
- セキュリティヘッダーの設定

**復元が必要だった理由:**
- 既存のWebアプリ（PWA版）で必須の機能
- 削除するとPWA版が正常に動作しなくなる
- Tauri版でも同じMiddlewareロジックが必要

## 最終的な動作確認

**起動コマンド:**
```bash
bun run tauri:dev
```

**確認結果:**
- ✅ Next.js開発サーバーが起動
- ✅ Tauriアプリケーションウィンドウが開く
- ✅ スタイルが正常に適用される
- ✅ ダッシュボードページが表示される
- ✅ ページ遷移が動作する
- ✅ Middlewareによる認証チェックが動作する
- ✅ Server Actionsが動作する

## 実装方針の重要な変更

### 変更前（Tauri公式ドキュメント通り）
- 静的エクスポート（`output: "export"`）を使用
- すべてをクライアントサイドに移行してからTauri化

### 変更後（段階的移行アプローチ）
- Next.js開発サーバーをTauri内で動作させる
- 既存のServer Actions、Middlewareをそのまま維持
- Phase 1-6で段階的にクライアントサイドへ移行
- 最終的（Phase 6）に静的エクスポート化

### この方針転換の利点
1. ✅ 既存の機能を壊さない
2. ✅ PWA版とTauri版が並行開発できる
3. ✅ 段階的な移行が可能
4. ✅ 各Phaseで動作確認しながら進められる
5. ✅ リスクを分散できる

## 作成・更新されたファイル

### 新規作成
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `src-tauri/src/main.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/build.rs`
- `src-tauri/icons/*`
- `src-tauri/capabilities/default.json`

### 更新
- `package.json` - Tauriパッケージとスクリプトを追加
- `next.config.ts` - Tauri環境対応（開発サーバーモード）

### 復元
- `middleware.ts` - `.disabled`から復元

## 次のステップ（Phase 1以降）

### Phase 1: CRUD操作の移行（2週間予定）
- Server Actions → TanStack Query への移行
- Notes、Decks、Pages、Cards関連の移行
- クライアントサイドでのSupabase直接アクセス

### Phase 2: 認証・セッション管理の移行（1週間予定）
- Deep Link対応
- OAuth認証フローの実装
- セッション管理のlocalStorage移行

### Phase 3-6
- ファイルアップロード機能の移行
- バッチ処理・AI処理の移行
- その他の機能の移行
- 最終的な静的エクスポート化

## 技術的な学び

### 1. Tauriの2つの統合方式
- **静的エクスポート方式**: 公式推奨だが、既存のNext.jsアプリには大規模な変更が必要
- **開発サーバー方式**: 段階的移行が可能、既存機能を維持しながら移行できる

### 2. Next.js 16の変更点
- Middlewareが非推奨予定（"proxy"への移行が推奨）
- 静的エクスポート時の制約が明確化

### 3. 移行戦略の重要性
- 一気に移行するのではなく、段階的なアプローチが現実的
- 既存機能を維持しながら新機能を追加する方式が安全

## 参考資料

- [Tauri公式ドキュメント - Next.js統合](https://v2.tauri.app/ja/start/frontend/nextjs/)
- GitHub Issue #120: Tauri 2.0 ネイティブアプリ化実装
- GitHub Issue #145: Phase 0 - 準備・環境構築
- `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md`

## まとめ

Phase 0（準備・環境構築）を完了し、Tauri環境でNext.jsアプリケーションが正常に動作することを確認しました。当初は静的エクスポート方式を試みましたが、現在のアプリケーション構造との互換性の問題から、開発サーバー方式に方針転換しました。

この方針転換により、既存のPWA版を維持しながら、段階的にTauri版へ移行できる基盤が整いました。次のPhase 1では、CRUD操作をクライアントサイド（TanStack Query）へ移行していきます。

---

**作業者**: AI Assistant  
**作業日**: 2025年11月16日  
**ステータス**: Phase 0 完了 ✅

