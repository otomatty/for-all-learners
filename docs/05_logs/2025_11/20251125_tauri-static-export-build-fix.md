# Tauri 静的エクスポート ビルド修正 - 2025-11-25

## 📍 概要

GitHub ActionsでのTauriビルドにおいて、Next.jsの静的エクスポート時に複数のエラーが発生していた問題を修正しました。

## 🔍 発生した問題

### 問題1: `/notes/[slug]/new`の`generateStaticParams()`エラー

**エラーメッセージ:**
```
Error: Page "/notes/[slug]/new" is missing "generateStaticParams()" so it cannot be used with "output: export" config.
```

**原因:**
- `app/(protected)/notes/[slug]/new/page.tsx`と`app/(protected)/notes/default/new/page.tsx`が`prepare-static-export.ts`の`dynamicPagesToDisable`リストに含まれていなかった
- これらのページは静的エクスポート時に無効化される必要があるが、リストから漏れていた

### 問題2: Admin API Routesのエラー（Windows環境）

**エラーメッセージ:**
```
Error: export const dynamic = "force-static"/export const revalidate not configured on route "/api/admin/batch-update-thumbnails/stats" with "output: export".
```

**原因:**
- `prepare-static-export.ts`でのパスチェックが`/`（スラッシュ）のみを使用していた
- Windows環境ではパス区切り文字が`\`（バックスラッシュ）のため、API Routesが正しく検出・無効化されなかった

### 問題3: Windows環境での環境変数設定エラー

**エラーメッセージ:**
```
'ENABLE_STATIC_EXPORT' is not recognized as an internal or external command, operable program or batch file.
```

**原因:**
- `ENABLE_STATIC_EXPORT=true bun run build`という環境変数設定の構文はUnix/Linux/macOSでのみ有効
- Windows（cmd/PowerShell）ではこの構文は認識されない

### 問題4: `cross-env`コマンドが見つからない

**エラーメッセージ:**
```
cross-env: command not found
```

**原因:**
- `cross-env`は`node_modules/.bin`にインストールされるため、直接コマンドとして実行できない
- PATHに含まれていないため、`bunx`または`npx`を使用する必要がある

## ✅ 実施した修正

### 修正1: `prepare-static-export.ts`に新しいページを追加

**ファイル:** `scripts/prepare-static-export.ts`

```diff
const dynamicPagesToDisable = [
    "app/(protected)/decks/[deckId]/page.tsx",
    // ... 既存のページ ...
    "app/(protected)/notes/[slug]/[id]/generate-cards/page.tsx",
+   // New page routes: These use server-side logic that is incompatible with static export
+   "app/(protected)/notes/[slug]/new/page.tsx",
+   "app/(protected)/notes/default/new/page.tsx",
    // Admin pages: Web app only, excluded from Tauri static export
    "app/admin/inquiries/[id]/page.tsx",
    "app/admin/users/[id]/page.tsx",
];
```

### 修正2: Windows環境でのパス互換性対応

**ファイル:** `scripts/prepare-static-export.ts`

```diff
- import { join } from "node:path";
+ import { join, sep } from "node:path";

// Route Handlerのフィルタリング
const routeFilesToDisable = allRouteFiles.filter((file) => {
-   const isAPIRoute = file.includes("/api/");
-   const isRouteHandler =
-       file.includes("/route.ts") || file.includes("/route.js");
+   // Use platform-independent path check (handles both / and \ separators)
+   const normalizedFile = file.replace(/\\/g, "/");
+   const isAPIRoute = normalizedFile.includes("/api/");
+   const isRouteHandler =
+       normalizedFile.includes("/route.ts") ||
+       normalizedFile.includes("/route.js");
    return isAPIRoute || isRouteHandler;
});

// 動的ページの無効化
for (const file of dynamicPagesToDisable) {
-   if (existsSync(file) && !file.endsWith(".disabled")) {
-       const disabledFile = `${file}.disabled`;
+   // Normalize path for cross-platform compatibility
+   const normalizedPath = file.split("/").join(sep);
+   if (existsSync(normalizedPath) && !normalizedPath.endsWith(".disabled")) {
+       const disabledFile = `${normalizedPath}.disabled`;
        // ...
    }
}
```

### 修正3: クロスプラットフォーム環境変数設定

**追加パッケージ:**
```bash
bun add -d cross-env
```

**ファイル:** `src-tauri/tauri.conf.json`
```diff
- "beforeBuildCommand": "bun run scripts/prepare-static-export.ts prepare && ENABLE_STATIC_EXPORT=true bun run build && bun run scripts/prepare-static-export.ts restore"
+ "beforeBuildCommand": "bun run scripts/prepare-static-export.ts prepare && bunx cross-env ENABLE_STATIC_EXPORT=true bun run build && bun run scripts/prepare-static-export.ts restore"
```

**ファイル:** `.github/workflows/tauri-build.yml`
```diff
- ENABLE_STATIC_EXPORT=true bun run build
+ bunx cross-env ENABLE_STATIC_EXPORT=true bun run build
```

## 📚 技術的背景

### パス区切り文字の違い

| プラットフォーム | パス区切り文字 | 例 |
|-----------------|--------------|-----|
| macOS/Linux | `/` | `app/api/users/route.ts` |
| Windows | `\` | `app\api\users\route.ts` |

Node.jsの`join()`関数はOSに応じたパス区切り文字を使用するため、Windowsでは`\`が使われます。文字列の`includes()`メソッドでパスをチェックする際は、この違いを考慮する必要があります。

### 環境変数設定の構文の違い

| プラットフォーム | 構文 | 例 |
|-----------------|------|-----|
| Unix/Linux/macOS | `VAR=value cmd` | `ENABLE_STATIC_EXPORT=true bun run build` |
| Windows (cmd) | `set VAR=value && cmd` | `set ENABLE_STATIC_EXPORT=true && bun run build` |
| Windows (PowerShell) | `$env:VAR="value"; cmd` | `$env:ENABLE_STATIC_EXPORT="true"; bun run build` |
| クロスプラットフォーム | `cross-env VAR=value cmd` | `cross-env ENABLE_STATIC_EXPORT=true bun run build` |

### `bunx`/`npx`の必要性

`npm`や`bun`でインストールしたパッケージは`node_modules/.bin`にバイナリが配置されますが、このディレクトリはシステムのPATHに含まれていません。`bunx`（Bun）や`npx`（npm）を使用することで、これらのローカルにインストールされたコマンドを実行できます。

## 🔄 コミット履歴

1. **c05d093** - `fix: add notes new pages to static export disable list and fix Windows path handling`
   - `/notes/[slug]/new/page.tsx`と`/notes/default/new/page.tsx`を追加
   - Windowsパス互換性を修正

2. **e61f19b** - `fix: use cross-env for Windows compatibility in Tauri build`
   - `cross-env`パッケージを追加
   - `tauri.conf.json`と`tauri-build.yml`を修正

3. **c19dcd8** - `fix: use bunx to run cross-env from node_modules`
   - `cross-env`を`bunx cross-env`に変更

## 📝 教訓

1. **クロスプラットフォーム開発では、パス処理に注意**
   - 文字列でパスをチェックする際は、`/`と`\`の両方を考慮する
   - `path.sep`を使用してプラットフォームに依存しない処理を行う

2. **環境変数の設定はクロスプラットフォームツールを使用**
   - `cross-env`を使用することで、すべてのプラットフォームで同じ構文が使える
   - CI/CDパイプラインでは特に重要

3. **ローカルパッケージの実行には`bunx`/`npx`を使用**
   - グローバルインストールに依存しない
   - CI環境でも確実に動作する

## 関連ドキュメント

- [Next.js Static Exports](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [cross-env](https://github.com/kentcdodds/cross-env)
- [Tauri Configuration](https://tauri.app/reference/config/)

## 関連Issue/PR

- Issue #186: GitHub Actions による Tauri バイナリビルド自動化
- PR #187: feat: Add GitHub Actions workflow for Tauri binary builds

