# Tauri認証Deep Link問題 - 試行錯誤と現状まとめ

**作成日**: 2025-11-23  
**問題**: TauriアプリでのGoogle OAuth認証が完了しない  
**参考リポジトリ**: https://github.com/JeaneC/tauri-oauth-supabase
**状態**: ✅ 解決済み（Loopback Server方式へ移行）
**解決ログ**: `docs/05_logs/2025_11/20251123/10_tauri-auth-migration-to-loopback.md`

---

## 📋 問題の概要

### 症状

1. TauriアプリでGoogleログインボタンをクリック
2. 外部ブラウザで認証を完了
3. **ブラウザで「Failed to launch 'tauri://localhost/auth/callback?code=...' because the scheme does not have a registered handler」エラーが表示される**
4. Tauriアプリがローディング状態のままになる
5. 認証が完了しない

### 根本原因

開発モード（macOS）では、`tauri://` スキームがOSに登録されていないため、外部ブラウザから直接Deep Linkを開くことができない。

---

## 🔄 試行した解決策の変遷

### 試行1: Deep Linkスキームの修正

**変更内容**:
- `redirectTo` を `tauri://auth/callback` から `tauri://localhost/auth/callback` に変更
- 参考リポジトリに合わせてスキームを修正

**結果**: ❌ 失敗
- 同じエラーが発生
- macOSの開発モードでは `tauri://` スキームがOSに登録されていない

**関連ファイル**:
- `lib/auth/tauri-login.ts`
- `lib/auth/tauri-auth-handler.ts`

---

### 試行2: 開発モードでHTTPコールバックを使用

**変更内容**:
- 開発モードでは `redirectTo` を `http://localhost:3000/auth/callback` に設定
- 通常のWeb版の認証フローを使用

**結果**: ❌ 却下
- ユーザーからの指摘: 「それだと既存の認証コールバックを使用するのでWeb版のリダイレクトになりませんか？」
- Web版のコールバックはTauriアプリに戻らない

**関連ファイル**:
- `lib/auth/tauri-login.ts`

---

### 試行3: Tauri専用コールバックページへのリダイレクト

**変更内容**:
- 開発モードでは `redirectTo` を `http://localhost:3000/auth/callback?tauri=true` に設定
- `app/auth/callback/route.ts` で `tauri=true` パラメータを検出
- `/auth/callback/tauri` ページにリダイレクト
- `/auth/callback/tauri` ページで `processAuthCallbackUrl` を呼び出し

**実装詳細**:
```typescript
// lib/auth/tauri-login.ts
const redirectTo = isDevelopment()
  ? "http://localhost:3000/auth/callback?tauri=true"
  : "tauri://localhost/auth/callback";

// app/auth/callback/route.ts
if (isTauriCallback) {
  return NextResponse.redirect(
    `${requestUrl.origin}/auth/callback/tauri?${params.toString()}`
  );
}

// app/auth/callback/tauri/page.tsx
const callbackUrl = `tauri://localhost/auth/callback?${params.toString()}`;
await processAuthCallbackUrl(callbackUrl);
```

**結果**: ❌ 失敗
- `/auth/callback/tauri` ページが外部ブラウザで開かれてしまう
- TauriアプリのWebViewでは開かれない
- Deep Linkハンドラーが呼ばれない

**関連ファイル**:
- `lib/auth/tauri-login.ts`
- `app/auth/callback/route.ts`
- `app/auth/callback/tauri/page.tsx`

---

### 試行4: HTMLページからDeep Linkを送信（現在の実装）

**変更内容**:
- `app/auth/callback/route.ts` で、`tauri=true` の場合にHTMLページを返す
- HTMLページ内のJavaScriptで `window.location.href = "tauri://localhost/auth/callback?..."` を実行
- Deep Linkを送信してTauriアプリに戻す

**実装詳細**:
```typescript
// app/auth/callback/route.ts
if (isTauriCallback) {
  const deepLinkUrl = `tauri://localhost/auth/callback?${deepLinkParams.toString()}`;
  const html = `
    <!DOCTYPE html>
    <html>
    ...
    <script>
      window.location.href = ${JSON.stringify(deepLinkUrl)};
    </script>
    ...
  `;
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
```

**期待される動作**:
1. 外部ブラウザで認証完了後、`http://localhost:3000/auth/callback?tauri=true&code=...` にリダイレクト
2. Next.jsサーバーがHTMLページを返す
3. HTMLページから `tauri://localhost/auth/callback?code=...` を送信
4. TauriアプリのDeep Linkハンドラーがキャッチ
5. `processAuthCallbackUrl` が呼ばれて認証処理が完了

**結果**: ❌ 失敗
- macOSのセキュリティ設定により、外部ブラウザから `tauri://` スキームを開けない
- Deep Linkハンドラーが呼ばれない

**関連ファイル**:
- `app/auth/callback/route.ts`

---

### 試行5: IPC方式（サーバー経由のポーリング）✅ 現在の実装

**変更内容**:
- 認証情報をサーバーに一時保存するAPIエンドポイントを作成 (`/api/auth/tauri-callback`)
- TauriアプリがセッションIDを生成してlocalStorageに保存
- OAuthリクエスト時にセッションIDをURLパラメータとして含める
- 外部ブラウザで認証完了後、サーバー側で認証情報を保存
- Tauriアプリがサーバーにポーリングして認証情報を取得
- 認証情報を取得したら、既存の `handleAuthCallback` を呼び出して認証処理を完了

**実装詳細**:

1. **APIエンドポイント作成** (`app/api/auth/tauri-callback/route.ts`):
   - `POST`: 認証情報を一時保存
   - `GET`: 認証情報を取得（ポーリング用）
   - メモリベースのMapで一時保存（本番環境ではRedisなどを推奨）
   - 5分以上経過したエントリを自動削除

2. **OAuthログイン開始** (`lib/auth/tauri-login.ts`):
   ```typescript
   // セッションIDを生成
   const sessionId = `tauri-auth-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
   localStorage.setItem("tauri-auth-session-id", sessionId);
   
   // redirectToにセッションIDを含める
   const redirectTo = `http://localhost:3000/auth/callback?tauri=true&sessionId=${encodeURIComponent(sessionId)}`;
   ```

3. **コールバック処理** (`app/auth/callback/route.ts`):
   ```typescript
   if (isTauriCallback) {
     const sessionId = requestUrl.searchParams.get("sessionId");
     // 認証情報をサーバーに保存
     await fetch(`/api/auth/tauri-callback`, {
       method: "POST",
       body: JSON.stringify({ sessionId, code, accessToken, refreshToken, error })
     });
     // HTMLページを返す
   }
   ```

4. **ポーリング処理** (`lib/auth/tauri-auth-handler.ts`):
   ```typescript
   function startAuthDataPolling() {
     const sessionId = localStorage.getItem("tauri-auth-session-id");
     const pollInterval = setInterval(async () => {
       const response = await fetch(`/api/auth/tauri-callback?sessionId=${sessionId}`);
       const result = await response.json();
       if (result.data) {
         clearInterval(pollInterval);
         await handleAuthCallback(result.data);
       }
     }, 500); // 500msごとにポーリング
   }
   ```

**期待される動作**:
1. TauriアプリでGoogleログインボタンをクリック
2. セッションIDを生成してlocalStorageに保存
3. OAuth URLにセッションIDを含めて外部ブラウザで開く
4. 外部ブラウザで認証完了後、`http://localhost:3000/auth/callback?tauri=true&sessionId=...&code=...` にリダイレクト
5. Next.jsサーバーが認証情報を `/api/auth/tauri-callback` に保存
6. HTMLページを返して「認証が完了しました」と表示
7. Tauriアプリが `/api/auth/tauri-callback` にポーリング開始
8. 認証情報が見つかったら、`handleAuthCallback` を呼び出して認証処理を完了
9. ダッシュボードにリダイレクト

**結果**: ⏳ 実装完了、動作確認待ち

**関連ファイル**:
- `app/api/auth/tauri-callback/route.ts` - 認証情報の一時保存API
- `app/auth/callback/route.ts` - コールバック処理と認証情報の保存
- `lib/auth/tauri-login.ts` - OAuthログイン開始とセッションID生成
- `lib/auth/tauri-auth-handler.ts` - ポーリング処理と認証処理

---

## 🔍 現在の実装状況

### 設定ファイル

#### `src-tauri/tauri.conf.json`
```json
{
  "plugins": {
    "deep-link": {
      "schemes": ["tauri"]
    },
    "shell": {
      "open": true
    }
  }
}
```

**状態**: ✅ 設定済み

---

### Deep Linkハンドラー

#### `lib/auth/tauri-auth-handler.ts`

**実装内容**:
- `setupTauriAuthHandler()`: Deep Linkイベントリスナーの登録
- `onOpenUrl` ハンドラー: `tauri://localhost/auth/callback` を処理
- `deep-link://new-url` ハンドラー: フォールバック用
- `processAuthCallbackUrl()`: URLから認証情報を抽出して処理
- `handleAuthCallback()`: Supabaseセッションを設定

**ログ出力**:
- ✅ 各ステップで詳細なログを出力
- ✅ エラー時のログも出力

**状態**: ✅ 実装済み、ログ確認済み

**確認済みログ**:
```
[setupTauriAuthHandler] Called
[setupTauriAuthHandler] isTauri(): true
[setupTauriAuthHandler] Starting to register event listeners
[setupTauriAuthHandler] Registering onOpenUrl handler
[setupTauriAuthHandler] onOpenUrl handler registered successfully
[setupTauriAuthHandler] Registering deep-link://new-url handler
[setupTauriAuthHandler] deep-link://new-url handler registered successfully
[setupTauriAuthHandler] All handlers initialized
```

---

### OAuthログイン開始

#### `lib/auth/tauri-login.ts`

**実装内容**:
- `loginWithGoogleTauri()`: Google OAuthログインを開始
- 開発モードでは `http://localhost:3000/auth/callback?tauri=true` を使用
- 本番モードでは `tauri://localhost/auth/callback` を使用
- 外部ブラウザでOAuth URLを開く

**ログ出力**:
- ✅ OAuth URL生成時のログ
- ✅ `redirectTo` URLのログ

**状態**: ✅ 実装済み、ログ確認済み

**確認済みログ**:
```
[loginWithGoogleTauri] Starting OAuth login
[loginWithGoogleTauri] isDevelopment(): true
[loginWithGoogleTauri] redirectTo: "http://localhost:3000/auth/callback?tauri=true"
[loginWithGoogleTauri] OAuth URL: "https://ablwpfboagwcegeehmtg.supabase.co/auth/v1/authorize?..."
[loginWithGoogleTauri] Opening URL in external browser
```

---

### コールバック処理

#### `app/auth/callback/route.ts`

**実装内容**:
- `tauri=true` パラメータを検出
- HTMLページを返してDeep Linkを送信
- 通常のWeb版コールバック処理（`tauri=true` でない場合）

**ログ出力**:
- ✅ リクエスト受信時のログ
- ✅ URLパラメータのログ
- ✅ Deep Link URLのログ

**状態**: ✅ 実装済み、動作確認が必要

**期待されるログ**（未確認）:
```
[auth/callback/route] GET request received
[auth/callback/route] URL: http://localhost:3000/auth/callback?tauri=true&code=...
[auth/callback/route] Params: { code: '...', errorParam: null, isTauriCallback: true }
[auth/callback/route] Tauri callback detected, returning HTML page with Deep Link
[auth/callback/route] Deep Link URL: tauri://localhost/auth/callback?code=...
```

---

### Tauri専用コールバックページ

#### `app/auth/callback/tauri/page.tsx`

**実装内容**:
- Tauri環境での認証コールバック処理
- URLパラメータから認証情報を抽出
- `processAuthCallbackUrl` を呼び出し
- デバッグログを画面上に表示

**状態**: ✅ 実装済み（現在は使用されていない）

**注意**: 試行3で実装したが、外部ブラウザで開かれてしまうため、現在は使用されていない。試行4ではHTMLページから直接Deep Linkを送信する方式に変更。

---

## 🐛 現在の問題点

### 問題1: 外部ブラウザからDeep Linkを開けない可能性

**症状**:
- HTMLページから `window.location.href = "tauri://localhost/auth/callback?..."` を実行しても、Tauriアプリが開かない可能性がある
- macOSのセキュリティ設定により、外部ブラウザからカスタムスキームを開くことが制限されている可能性

**確認方法**:
1. 外部ブラウザのコンソールログを確認
2. Tauriアプリのコンソールで `[setupTauriAuthHandler] onOpenUrl called with URLs:` が表示されるか確認

**対処法（検討中）**:
- カスタムプロトコルハンドラーの登録
- アプリ間通信（IPC）の使用
- ポーリング方式（localStorage経由）の検討

---

### 問題2: Next.jsサーバーのログが確認できていない

**症状**:
- Tauriアプリのコンソールにはログが表示されているが、Next.jsサーバーのターミナルログが確認できていない
- `[auth/callback/route]` のログが表示されていない可能性

**確認方法**:
- Next.jsサーバーを起動しているターミナルでログを確認
- `bun run dev:webpack` または `bun dev` のターミナル出力を確認

---

### 問題3: Deep Linkハンドラーが呼ばれていない

**症状**:
- OAuthログイン開始までは正常に動作
- 認証完了後のDeep Link処理が実行されていない
- `[setupTauriAuthHandler] onOpenUrl called with URLs:` のログが表示されない

**確認方法**:
- TauriアプリのコンソールでDeep Linkイベントのログを確認
- 外部ブラウザのコンソールでDeep Link送信のログを確認

---

## 📊 ログ確認状況

### ✅ 確認済みログ

#### Tauriアプリのコンソール
```
[setupTauriAuthHandler] Called
[setupTauriAuthHandler] isTauri(): true
[setupTauriAuthHandler] Starting to register event listeners
[setupTauriAuthHandler] Checking for existing deep link...
[setupTauriAuthHandler] Current deep link: null
[setupTauriAuthHandler] Registering onOpenUrl handler
[setupTauriAuthHandler] onOpenUrl handler registered successfully
[setupTauriAuthHandler] Registering deep-link://new-url handler
[setupTauriAuthHandler] deep-link://new-url handler registered successfully
[setupTauriAuthHandler] All handlers initialized

[loginWithGoogleTauri] Starting OAuth login
[loginWithGoogleTauri] isDevelopment(): true
[loginWithGoogleTauri] redirectTo: "http://localhost:3000/auth/callback?tauri=true"
[loginWithGoogleTauri] OAuth URL: "https://ablwpfboagwcegeehmtg.supabase.co/auth/v1/authorize?..."
[loginWithGoogleTauri] Opening URL in external browser
```

### ❌ 未確認ログ

#### Next.jsサーバーのターミナル
```
[auth/callback/route] GET request received
[auth/callback/route] URL: http://localhost:3000/auth/callback?tauri=true&code=...
[auth/callback/route] Params: { code: '...', errorParam: null, isTauriCallback: true }
[auth/callback/route] Tauri callback detected, returning HTML page with Deep Link
[auth/callback/route] Deep Link URL: tauri://localhost/auth/callback?code=...
```

#### 外部ブラウザのコンソール
```
[Tauri Callback Page] Deep Link URL: tauri://localhost/auth/callback?code=...
[Tauri Callback Page] Deep Linkを送信中...
[Tauri Callback Page] Deep Link送信完了
```

#### Tauriアプリのコンソール（Deep Link受信時）
```
[setupTauriAuthHandler] onOpenUrl called with URLs: ["tauri://localhost/auth/callback?code=..."]
[setupTauriAuthHandler] Processing auth callback URL from onOpenUrl: tauri://localhost/auth/callback?code=...
[processAuthCallbackUrl] Called with URL: tauri://localhost/auth/callback?code=...
[processAuthCallbackUrl] Extracted params: { hasCode: true, hasAccessToken: false, hasRefreshToken: false, error: null }
[processAuthCallbackUrl] Calling handleAuthCallback
[handleAuthCallback] Called with: { hasCode: true, hasAccessToken: false, hasRefreshToken: false }
[handleAuthCallback] Exchanging code for session
[handleAuthCallback] Code exchanged successfully: { hasSession: true, hasUser: true }
[handleAuthCallback] Getting user...
[handleAuthCallback] User retrieved successfully: { userId: '...', email: '...' }
[handleAuthCallback] Redirecting to /dashboard
```

---

## 🔗 参考リポジトリ

**URL**: https://github.com/JeaneC/tauri-oauth-supabase

**主な参考点**:
- Deep Linkスキーム: `tauri://localhost/auth/callback`
- `@tauri-apps/plugin-deep-link` の使用方法
- `onOpenUrl` ハンドラーの実装

**違い**:
- 参考リポジトリでは本番環境での動作を想定
- 開発モードでの動作については言及されていない
- macOSでの開発モードでの制限についての記載なし

---

## 📝 次のステップ

### 1. 動作確認（最優先）

**手順**:
1. Tauriアプリを再起動
2. Googleログインを試す
3. 以下のログを確認:
   - Next.jsサーバーのターミナルログ
   - 外部ブラウザのコンソールログ
   - Tauriアプリのコンソールログ

**確認ポイント**:
- `[auth/callback/route]` のログが表示されるか
- HTMLページが表示されるか
- Deep Linkが送信されるか
- TauriアプリのDeep Linkハンドラーが呼ばれるか

---

### 2. 代替案の検討（動作しない場合）

#### 案A: カスタムプロトコルハンドラーの登録

**内容**:
- macOSのInfo.plistにカスタムプロトコルを登録
- 開発モードでもDeep Linkを開けるようにする

**課題**:
- Tauri v2での設定方法の確認が必要
- 開発モードでの動作確認が必要

---

#### 案B: localStorage経由のポーリング方式

**内容**:
- HTMLページで認証情報をlocalStorageに保存
- TauriアプリがlocalStorageをポーリングして認証情報を取得

**実装例**:
```typescript
// HTMLページ側
localStorage.setItem("tauri-auth-callback", JSON.stringify({ code, accessToken, refreshToken }));

// Tauriアプリ側
const pollLocalStorage = setInterval(() => {
  const authData = localStorage.getItem("tauri-auth-callback");
  if (authData) {
    clearInterval(pollLocalStorage);
    // 認証処理
  }
}, 500);
```

**課題**:
- localStorageは同一オリジン間でのみ共有可能
- 外部ブラウザとTauriアプリのWebViewは異なるオリジンになる可能性

---

#### 案C: サーバー経由のポーリング方式

**内容**:
- 認証情報をサーバーに一時保存（セッションストレージなど）
- Tauriアプリがサーバーにポーリングして認証情報を取得

**課題**:
- サーバー側の実装が必要
- セキュリティ面での考慮が必要

---

### 3. デバッグログの追加

**追加すべきログ**:
- HTMLページ内のJavaScript実行時のログ
- Deep Link送信時のエラーログ
- ブラウザのセキュリティエラーのログ

---

## 📚 関連ファイル

### 実装ファイル
- `lib/auth/tauri-login.ts` - OAuthログイン開始とセッションID生成
- `lib/auth/tauri-auth-handler.ts` - Deep Linkハンドラー、ポーリング処理、認証処理
- `app/auth/callback/route.ts` - Next.jsサーバー側のコールバック処理と認証情報の保存
- `app/api/auth/tauri-callback/route.ts` - 認証情報の一時保存API（新規作成）
- `app/auth/callback/tauri/page.tsx` - Tauri専用コールバックページ（現在未使用）
- `components/auth/TauriAuthHandler.tsx` - Tauriアプリ起動時のハンドラー初期化

### 設定ファイル
- `src-tauri/tauri.conf.json` - Tauri設定（Deep Linkスキームなど）
- `src-tauri/src/lib.rs` - Rust側の実装

### ドキュメント
- `docs/05_logs/2025_11/20251123/08_tauri-auth-debug-guide.md` - デバッグガイド
- `docs/02_research/2025_11/20251109_02_supabase-tauri-integration.md` - 技術調査

---

## 🎯 まとめ

### 現在の状況
- ✅ Deep Linkハンドラーの実装は完了（本番環境用）
- ✅ OAuthログイン開始は正常に動作
- ✅ IPC方式（サーバー経由のポーリング）の実装が完了
- ✅ ログ出力は充実している
- ⏳ IPC方式の動作確認待ち

### 主な課題（試行4まで）
1. ❌ 外部ブラウザからDeep Linkを開けない（macOSのセキュリティ設定）
2. ❌ Deep Linkハンドラーが呼ばれない

### 現在の実装（試行5: IPC方式）
1. ✅ サーバー側のAPIエンドポイント実装完了
2. ✅ セッションID生成と保存の実装完了
3. ✅ ポーリング処理の実装完了
4. ⏳ 動作確認待ち

### 次のアクション
1. **動作確認**: IPC方式の実装が動作するか確認
2. **ログ収集**: すべてのログ（サーバー、ブラウザ、Tauriアプリ）を収集
3. **セキュリティ改善**: セッションIDの生成方法をより安全にする（オプション）
4. **本番環境対応**: メモリベースのストレージをRedisなどに置き換える（オプション）

---

**最終更新**: 2025-11-23  
**状態**: 検証中

