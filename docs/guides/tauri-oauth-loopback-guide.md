# Tauri v2 + Next.js + Supabase: Google OAuth Loopback Server 実装ガイド

このドキュメントは、Tauri v2、Next.js、Supabaseを使用したデスクトップアプリにおいて、Google OAuth認証を「Loopback Server方式」で実装するための完全ガイドです。

macOSやWindowsにおけるDeep Link（カスタムURLスキーム）の問題を回避し、開発モードでも安定して動作する認証フローを構築します。

## 📋 概要

### 問題の背景
TauriアプリでOAuth認証を行う際、一般的にはDeep Link（`tauri://...`）を使用します。しかし、以下の課題があります：
1. **macOSの制限**: 開発モード（`tauri dev`）ではアプリがOSに登録されないため、カスタムスキームが機能しない。
2. **実装の複雑さ**: OSごとの設定や、ビルド時の設定が必要になる。

### 解決策: Loopback Server方式
CLIツール（gcloud, aws-cli）などで採用されている標準的な手法です。

1. Tauriアプリ内で一時的なローカルサーバーを起動（`http://localhost:{port}`）。
2. Google認証のリダイレクト先をそのローカルサーバーに設定。
3. 認証後、ブラウザがローカルサーバーにアクセスし、アプリがそれを受け取る。

---

## 🛠 実装手順

### 1. 依存関係の追加

**Rust側 (`src-tauri/Cargo.toml`)**:
`tauri-plugin-oauth` を追加します。

```toml
[dependencies]
tauri-plugin-oauth = "2.0.0" # 最新バージョンを確認してください
```

### 2. Rustバックエンドの実装

**`src-tauri/src/lib.rs`**:
ローカルサーバーを起動するコマンドを実装します。

```rust
use tauri::{AppHandle, Emitter};

// フロントエンドから呼び出されるコマンド
#[tauri::command]
async fn start_oauth_server(app: AppHandle) -> Result<u16, String> {
    // tauri-plugin-oauthのstart関数を使用
    // 空いているポートを自動的に選択してサーバーを起動
    tauri_plugin_oauth::start(move |url| {
        // コールバックURLを受け取ったら、フロントエンドにイベントを送信
        let _ = app.emit("oauth_callback", url);
    })
    .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // ... 他のプラグイン初期化
    // コマンドを登録
    .invoke_handler(tauri::generate_handler![start_oauth_server])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
```

### 3. フロントエンドの実装

**認証ロジック (`lib/auth/tauri-login.ts`)**:

```typescript
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";
import { createClient } from "@/lib/supabase/client";

export async function loginWithGoogleTauri() {
  const supabase = createClient();

  // 1. Rust側でLoopback Serverを起動し、ポート番号を取得
  const port = await invoke<number>("start_oauth_server");
  
  // 2. コールバックイベントのリスナーを設定
  const unlisten = await listen<string>("oauth_callback", async (event) => {
    unlisten(); // 一度だけ実行

    // 受け取ったURLから認証コードを抽出
    const url = new URL(event.payload);
    const code = url.searchParams.get("code");

    if (code) {
      // Supabaseで認証コードをセッションと交換
      await supabase.auth.exchangeCodeForSession(code);
      // ログイン成功後の処理（リダイレクトなど）
    }
  });

  // 3. リダイレクトURLを構築
  // 重要: http://localhost:{port} の形式
  const redirectTo = `http://localhost:${port}`;

  // 4. SupabaseのOAuthフローを開始
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true, // ブラウザリダイレクトをスキップしてURLを取得
    },
  });

  if (data?.url) {
    // 5. 外部ブラウザで認証URLを開く
    await open(data.url);
  }
}
```

### 4. Supabaseの設定（最重要）

Supabaseダッシュボードでの設定が必須です。

- **場所**: Authentication > URL Configuration > Redirect URLs
- **設定値**: `http://localhost:*`
  - ポート番号が毎回ランダムに変わるため、ワイルドカード（`*`）が必要です。

---

## ✅ メリットと注意点

### メリット
- **開発体験**: `tauri dev` でそのまま動作し、macOS/Windows/Linuxで挙動が統一されます。
- **堅牢性**: OSのDeep Link登録状況に依存しません。
- **ユーザー体験**: 認証完了後、ブラウザに「このページを閉じてください」と表示するだけで済み、アプリへの復帰がスムーズです。

### 注意点
- **ファイアウォール**: 稀なケースですが、ローカルサーバーの起動がファイアウォールにブロックされる可能性があります（通常はlocalhostなので問題ありません）。
- **ポート競合**: `tauri-plugin-oauth` は空きポートを自動選択するため、競合の心配はほぼありません。

## 📚 参考資料
- [tauri-plugin-oauth](https://github.com/tauri-apps/plugins-workspace/tree/v2/plugins/oauth)
- [Google OAuth 2.0 for Mobile & Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app?hl=ja)

