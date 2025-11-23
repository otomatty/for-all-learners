# Tauri開発モードでのTailwind CSS処理について

## 作業日時
2025年11月23日

## 問題の概要

Tauri開発モードで起動した際に、Tailwind CSSが正しく処理されていない可能性がある。

## 現在の設定

### Tailwind CSS v4の設定

- **PostCSS設定**: `postcss.config.mjs`で`@tailwindcss/postcss`を使用
- **CSSエントリーポイント**: `app/globals.css`で`@import "tailwindcss";`を使用
- **開発モード**: `next dev --turbopack`を使用

### Tauri開発モードの動作

1. `beforeDevCommand`で`bun dev`が実行される
2. `bun dev`は`next dev --turbopack`を実行する
3. Next.js開発サーバーが起動する
4. Tailwind CSSはPostCSSを通じて自動的に処理される

## 確認事項

### 1. Next.js開発モードでの自動処理

Next.jsの開発モードでは、Tailwind CSSは自動的に処理されるはずです：
- PostCSS設定（`postcss.config.mjs`）が読み込まれる
- `@tailwindcss/postcss`プラグインが実行される
- CSSファイルが自動的にコンパイルされる

### 2. Turbopackでの動作

Next.js 16のTurbopackでは、PostCSSプラグインが正しく動作するはずですが、Tailwind CSS v4との互換性に問題がある可能性があります。

### 3. 確認方法

Tauri開発モードで起動した際に、以下を確認してください：

1. **開発者ツールでCSSファイルの読み込みを確認**
   - Networkタブで`/_next/static/css/`のファイルが読み込まれているか確認
   - CSSファイルの内容にTailwind CSSのクラスが含まれているか確認

2. **コンソールエラーの確認**
   - PostCSSやTailwind CSSに関するエラーがないか確認

3. **スタイルの適用確認**
   - Tailwind CSSのクラス（例：`bg-blue-500`）が正しく適用されているか確認

## 解決策

### オプション1: Turbopackを無効化（推奨）

Turbopackで問題が発生している場合、Webpackを使用する：

```json
// package.json
{
  "scripts": {
    "dev": "bun run scripts/build-sandbox-worker.ts && next dev"
  }
}
```

### オプション2: PostCSS設定の確認

`postcss.config.mjs`が正しく読み込まれているか確認：

```javascript
// postcss.config.mjs
const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;
```

### オプション3: Tailwind CSS v4の設定確認

Tailwind CSS v4では、`tailwind.config.js`は不要ですが、`@import "tailwindcss";`が正しく動作しているか確認してください。

## 推奨される確認手順

1. **通常の開発モードで確認**
   ```bash
   bun dev
   ```
   - ブラウザで`http://localhost:3000`にアクセス
   - スタイルが正しく適用されているか確認

2. **Tauri開発モードで確認**
   ```bash
   bunx tauri dev
   ```
   - Tauriアプリが起動したら、開発者ツールを開く
   - NetworkタブでCSSファイルの読み込みを確認
   - スタイルが正しく適用されているか確認

3. **問題が発生している場合**
   - Turbopackを無効化してWebpackを使用
   - PostCSS設定を確認
   - Tailwind CSS v4の設定を確認

## 備考

- Tailwind CSS v4は、Next.jsの開発モードで自動的に処理されるため、追加のビルドステップは通常不要です
- TurbopackとTailwind CSS v4の互換性に問題がある場合は、Webpackを使用することを推奨します

