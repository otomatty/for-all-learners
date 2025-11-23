# SSLエラー修正 - Tailwind CSS読み込み問題の解決

## 作業日時
2025年11月23日

## 問題の概要

Tauri開発モードで起動した際に、`layout.css`ファイルの読み込み時に以下のSSLエラーが発生：

```
Failed to load resource: An SSL error has occurred and a secure connection to the server cannot be made.
```

## 原因

Tauri WebViewがHTTPSでCSSファイルを読み込もうとしているが、Next.js開発サーバーはHTTP（`http://localhost:3000`）で動作しているため、SSLエラーが発生していました。

## 解決策

CSP設定の`upgrade-insecure-requests`ディレクティブがHTTPリクエストをHTTPSにアップグレードしようとしているため、SSLエラーが発生していました。Tauri開発モードでは、HTTPリソースを許可する必要があります。

### 変更内容

`lib/utils/csp.ts`の`buildCSPHeader`関数を修正し、Tauri開発モードでは以下の変更を実施：

1. **`upgrade-insecure-requests`を無効化**: Tauri開発モードでは、HTTPリソースを許可するため、このディレクティブを削除
2. **`style-src`にHTTP localhostを追加**: CSSファイルをHTTPで読み込むため、`http://localhost:3000`を追加
3. **`connect-src`にHTTP localhostを追加**: HTTPリクエストを許可するため、`http://localhost:3000`を追加

### 説明

- `isTauriDev`: `process.env.TAURI_ENV`をチェックしてTauri環境を検出
- `upgrade-insecure-requests`: Tauri開発モードでは無効化（HTTPを許可）
- `style-src`: Tauri開発モードでは`http://localhost:3000`を追加
- `connect-src`: Tauri開発モードでは`http://localhost:3000`を追加

## 確認方法

1. Tauriアプリを再起動
   ```bash
   bunx tauri dev
   ```

2. 開発者ツールで確認
   - Networkタブで`layout.css`が正常に読み込まれているか確認
   - SSLエラーが発生していないか確認

3. スタイルの適用確認
   - Tailwind CSSのスタイルが正しく適用されているか確認

## 注意事項

- `dangerousRemoteDomainIpcAccess`は開発環境でのみ使用してください
- 本番環境では、静的エクスポートを使用するため、この設定は不要です
- セキュリティ上の理由から、本番環境ではHTTPではなくHTTPSを使用してください

## 参照

- Issue #157: Phase 6 - Next.js静的化とTauri統合
- Tauri v2 Security Documentation: https://tauri.app/v2/guides/security/

