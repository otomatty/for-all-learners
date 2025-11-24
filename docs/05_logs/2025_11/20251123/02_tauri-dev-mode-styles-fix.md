# Tauri開発モードでのスタイル適用問題の修正

## 作業日時
2025年11月23日

## 問題の概要

Tauri開発モード（`bunx tauri dev`）で起動した際に、認証ページが表示されるがスタイルが適用されていない状態になっていた。

## 原因分析

### 根本原因

`next.config.ts`で`assetPrefix`が設定されていたため、Next.jsの開発モードでCSSファイルのパスが正しく解決されていなかった。

```typescript
// 問題のあった設定
assetPrefix: process.env.TAURI_ENV
  ? `http://${internalHost}:3000`
  : undefined,
```

### なぜ問題が発生したか

1. **Tauri開発モードの動作**:
   - Tauri開発モードでは、`tauri.conf.json`の`devUrl`（`http://localhost:3000`）を使用してNext.js開発サーバーに直接接続する
   - `beforeDevCommand`で`bun dev`が実行され、Next.js開発サーバーが起動する
   - Tauriアプリは`devUrl`でNext.js開発サーバーに接続する

2. **`assetPrefix`の問題**:
   - `assetPrefix`を設定すると、Next.jsはすべてのアセット（CSS、JS、画像など）のパスにこのプレフィックスを追加する
   - 開発モードでは、Next.js開発サーバーが既に`http://localhost:3000`で動作しているため、`assetPrefix`を設定すると二重にパスが追加される可能性がある
   - これにより、CSSファイルのパスが正しく解決されず、スタイルが適用されない

## 実施した修正

### 修正内容

`next.config.ts`の`assetPrefix`設定を削除し、開発モードでは`assetPrefix`を使用しないように変更。

```typescript
// 修正後の設定
assetPrefix: undefined, // Tauri dev mode uses devUrl, production uses static export
```

### 理由

1. **開発モード**: Tauri開発モードでは`devUrl`を使用するため、`assetPrefix`は不要
2. **本番ビルド**: 静的エクスポート時は、`ENABLE_STATIC_EXPORT=true`が設定され、`output: "export"`が有効になる。この場合、相対パスでアセットが生成されるため、`assetPrefix`は不要

## 動作確認方法

### 1. Tauri開発モードでの確認

```bash
# Tauri開発モードで起動
bunx tauri dev
```

**確認項目**:
- [ ] 認証ページが表示される
- [ ] スタイルが正しく適用されている
- [ ] CSSファイルが正しく読み込まれている（開発者ツールのNetworkタブで確認）
- [ ] 画像が正しく表示される

### 2. ブラウザ開発者ツールでの確認

1. Tauriアプリの開発者ツールを開く（`Cmd+Option+I` / `Ctrl+Shift+I`）
2. NetworkタブでCSSファイルの読み込みを確認
3. Consoleタブでエラーがないか確認

### 3. 通常の開発モードでの確認

```bash
# 通常のNext.js開発モードで起動
bun dev
```

**確認項目**:
- [ ] ブラウザで`http://localhost:3000`にアクセス
- [ ] スタイルが正しく適用されている
- [ ] Service Workerが登録されている（Applicationタブで確認）

## 関連ファイル

- `next.config.ts` - Next.js設定ファイル（修正済み）
- `src-tauri/tauri.conf.json` - Tauri設定ファイル（変更なし）

## 参照ドキュメント

- Issue #157: Phase 6 - Next.js静的化とTauri統合
- Tauri公式ドキュメント: https://v2.tauri.app/ja/develop/
- Next.js公式ドキュメント: https://nextjs.org/docs/api-reference/next.config.js/assetPrefix

## 備考

- 本番ビルド時（静的エクスポート）でも、`assetPrefix`は不要（相対パスで生成されるため）
- 将来的にCDNを使用する場合は、`assetPrefix`を設定する必要があるが、その場合は別途検討が必要

