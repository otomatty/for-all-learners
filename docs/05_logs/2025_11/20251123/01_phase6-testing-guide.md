# Phase 6: Next.js静的化とTauri統合 - 動作確認ガイド

## 作業日時
2025年11月23日

## 関連Issue
- **Issue**: #157 - Phase 6: Next.js静的化とTauri統合
- **実装計画**: `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md`

## 動作確認手順

### 1. Service Workerの制御ロジック確認

#### 1.1 テストの実行
```bash
# Service Worker制御ロジックのテストを実行
bun run test lib/utils/__tests__/service-worker.test.ts
```

**期待結果**: 7つのテストがすべて成功する

#### 1.2 ブラウザでの動作確認（Web環境）

1. **開発サーバーを起動**
   ```bash
   bun dev
   ```

2. **ブラウザの開発者ツールを開く**
   - Chrome/Edge: `F12` または `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Applicationタブ → Service Workersセクションを確認

3. **Service Workerが登録されていることを確認**
   - `http://localhost:3000` にアクセス
   - Service Workersセクションに `/sw.js` が登録されていることを確認
   - Statusが "activated and is running" になっていることを確認

#### 1.3 Tauri環境での動作確認

1. **Tauri開発モードで起動**
   ```bash
   bunx tauri dev
   ```

2. **Service Workerが登録されていないことを確認**
   - Tauriアプリが起動したら、開発者ツールを開く（`Cmd+Option+I` / `Ctrl+Shift+I`）
   - Applicationタブ → Service Workersセクションを確認
   - Service Workerが登録されていないことを確認

### 2. Next.js静的エクスポートの確認

**注意**: 静的エクスポートは、すべてのServer Actionsが移行されるまで完全には動作しません。
現在はPhase 1-5でServer Actionsの移行が進行中です。完全な動作確認は、すべてのServer Actions移行後に実施してください。

#### 2.1 静的エクスポートのビルド（将来の確認用）

```bash
# 環境変数を設定して静的エクスポートを有効化
ENABLE_STATIC_EXPORT=true bun run build
```

**現在の状況**:
- API Routesや動的ルートでエラーが発生する可能性があります
- これは、Server Actionsがまだ移行されていないためです
- Phase 1-5の完了後に再度確認してください

**期待結果（将来）**:
- `out/` ディレクトリが作成される
- エラーが発生しない
- 静的HTMLファイルが生成される

#### 2.2 静的エクスポートの動作確認

```bash
# 静的ファイルをローカルで確認（簡易HTTPサーバー）
cd out
python3 -m http.server 8080
# または
npx serve out
```

**確認項目**:
- `http://localhost:8080` にアクセスしてアプリが表示される
- 画像が正しく表示される（画像最適化が無効化されている）
- 動的ルートが正しく動作する

#### 2.3 動的ルートの動作確認

以下のルートが正しく動作することを確認：

- `/notes/[slug]` - ノート詳細ページ
- `/notes/[slug]/[id]` - ページ詳細ページ
- `/decks/[deckId]` - デッキ詳細ページ
- `/decks/[deckId]/audio` - 音声ページ
- `/decks/[deckId]/pdf` - PDFページ
- `/decks/[deckId]/ocr` - OCRページ

**確認方法**:
1. ブラウザで各ルートにアクセス
2. ページが正しく表示されることを確認
3. エラーが発生しないことを確認

### 3. Tauriビルドの確認

#### 3.1 Tauriビルドの実行

```bash
# Tauriアプリをビルド
bunx tauri build
```

**期待結果**:
- ビルドが成功する
- `src-tauri/target/release/bundle/` にアプリが生成される
- `beforeBuildCommand` で `ENABLE_STATIC_EXPORT=true bun build` が実行される

#### 3.2 Tauriアプリの動作確認

1. **ビルドされたアプリを起動**
   - macOS: `src-tauri/target/release/bundle/macos/For All Learners.app`
   - Windows: `src-tauri/target/release/bundle/msi/For All Learners_0.3.0_x64_en-US.msi`
   - Linux: `src-tauri/target/release/bundle/appimage/For All Learners_0.3.0_amd64.AppImage`

2. **アプリの動作確認**
   - アプリが正常に起動する
   - ログイン画面が表示される
   - 各機能が正常に動作する
   - Service Workerが登録されていないことを確認（開発者ツールで確認）

### 4. 画像最適化の無効化確認

#### 4.1 静的エクスポート時の画像確認

```bash
# 静的エクスポートを実行
ENABLE_STATIC_EXPORT=true bun build

# 生成されたHTMLファイルを確認
grep -r "next/image" out/ | head -5
```

**期待結果**:
- `next/image` コンポーネントが使用されていない、または `unoptimized` プロパティが設定されている
- 画像が直接 `<img>` タグで表示されている

#### 4.2 Tauri環境での画像確認

1. **Tauri開発モードで起動**
   ```bash
   bunx tauri dev
   ```

2. **開発者ツールで画像を確認**
   - Networkタブで画像リクエストを確認
   - 画像が最適化されずに直接読み込まれていることを確認

### 5. CSP設定の確認

#### 5.1 開発環境でのCSP確認

1. **開発サーバーを起動**
   ```bash
   bun dev
   ```

2. **開発者ツールでCSPヘッダーを確認**
   - Networkタブでリクエストを選択
   - Response Headersに `Content-Security-Policy` が含まれていることを確認

#### 5.2 Tauri環境でのCSP確認

1. **Tauri開発モードで起動**
   ```bash
   bunx tauri dev
   ```

2. **開発者ツールでCSPを確認**
   - Tauri環境ではCSPが `null` に設定されているため、Next.jsのCSPヘッダーが適用される
   - エラーが発生しないことを確認

### 6. 統合テスト

#### 6.1 PWA版とTauri版の共存確認

1. **PWA版の動作確認**
   ```bash
   bun dev
   ```
   - Service Workerが登録される
   - PWAとして動作する

2. **Tauri版の動作確認**
   ```bash
   bunx tauri dev
   ```
   - Service Workerが登録されない
   - Tauriアプリとして動作する

#### 6.2 ビルドプロセスの確認

```bash
# 静的エクスポートのビルド
ENABLE_STATIC_EXPORT=true bun build

# Tauriビルド（自動的に静的エクスポートが実行される）
bunx tauri build
```

**期待結果**:
- 両方のビルドが成功する
- `out/` ディレクトリが正しく生成される
- Tauriアプリが正常に動作する

## トラブルシューティング

### Service Workerが登録されない場合

1. **ブラウザのキャッシュをクリア**
   - 開発者ツール → Application → Clear storage → Clear site data

2. **Service Workerの登録を確認**
   - `components/providers.tsx` で `ServiceWorkerProvider` が追加されているか確認
   - `lib/utils/service-worker.ts` の `shouldRegisterServiceWorker()` が正しく動作しているか確認

### 静的エクスポートが失敗する場合

1. **環境変数の確認**
   ```bash
   echo $ENABLE_STATIC_EXPORT
   ```

2. **Next.js設定の確認**
   - `next.config.ts` で `ENABLE_STATIC_EXPORT` が正しく設定されているか確認
   - `output: "export"` が条件付きで設定されているか確認

3. **動的ルートの確認**
   - すべての動的ルートに `generateStaticParams` が実装されているか確認

### Tauriビルドが失敗する場合

1. **Rust toolchainの確認**
   ```bash
   rustc --version
   cargo --version
   ```

2. **Tauri設定の確認**
   - `src-tauri/tauri.conf.json` の設定が正しいか確認
   - `beforeBuildCommand` が正しく設定されているか確認

3. **ビルドログの確認**
   ```bash
   bunx tauri build --verbose
   ```

## 完了条件

### Phase 6で確認可能な項目

- [x] Service Workerの制御ロジックが正しく動作する（Web環境で登録、Tauri環境で無効化）
- [x] 動的ルートに`generateStaticParams`が実装されている
- [x] Next.js設定が正しく設定されている（`output: export`、画像最適化無効化）
- [x] Tauri設定が正しく設定されている（`withGlobalTauri`、`beforeBuildCommand`）
- [x] Service Worker Providerが実装されている

### Phase 1-5完了後に確認可能な項目

- [ ] 静的エクスポートが正常に動作する（すべてのServer Actions移行後）
- [ ] Tauriビルドが正常に動作する（すべてのServer Actions移行後）
- [ ] 画像最適化が無効化されている（静的エクスポート時、Tauri環境時）
- [ ] PWA版とTauri版が共存できる

## 参照ドキュメント

- Issue #157: Phase 6 - Next.js静的化とTauri統合
- 実装計画: `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md`
- Tauri公式ドキュメント: https://v2.tauri.app/

