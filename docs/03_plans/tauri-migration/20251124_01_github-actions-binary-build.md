# GitHub Actions による Tauri バイナリビルド自動化

**作成日**: 2025-11-24  
**関連Issue**: #186  
**親Issue**: #120

---

## 概要

GitHub Actions を使用して、各OS向けのTauriバイナリを自動的にビルドできるようにする。

## 目標

- GitHub Actions ワークフローを作成
- macOS、Windows、Linux向けのバイナリを自動ビルド
- ビルド成果物をGitHub Releasesに自動アップロード
- PRやマージ時に自動ビルドを実行

## 実装内容

### 1. GitHub Actions ワークフローファイルの作成

**ファイル**: `.github/workflows/tauri-build.yml`

#### 主な機能

- **マトリックスビルド**: 4つのプラットフォームで並列ビルド
  - macOS (x86_64)
  - macOS (aarch64 / Apple Silicon)
  - Windows (x64)
  - Linux (x64)

- **キャッシュ最適化**:
  - Rust依存関係のキャッシュ
  - Bun依存関係のキャッシュ
  - ビルド時間の短縮

- **自動リリース**:
  - タグ作成時に自動的にGitHub Releasesを作成
  - ビルド成果物を自動アップロード

#### トリガー条件

- `push` イベント（main/developブランチ）
- `pull_request` イベント（main/developブランチ）
- `tags` イベント（`v*` パターン）
- `workflow_dispatch`（手動実行）

### 2. ビルドプロセス

#### ステップ1: 環境セットアップ
- Bunのセットアップ
- Rust toolchainのセットアップ
- Linux向けシステム依存関係のインストール

#### ステップ2: 依存関係のインストール
- Bun依存関係のインストール
- Rust依存関係のキャッシュ復元

#### ステップ3: フロントエンドビルド
- Sandbox Workerのビルド
- Next.js静的エクスポート（`ENABLE_STATIC_EXPORT=true`）

#### ステップ4: Tauriビルド
- `tauri-action`を使用したバイナリビルド
- 各OS向けのバンドル形式で出力
  - macOS: `.dmg`
  - Windows: `.msi`
  - Linux: `.AppImage`

#### ステップ5: 成果物のアップロード
- GitHub Actions Artifactsにアップロード
- 30日間保持

### 3. リリース作成

タグ作成時または手動実行時に、以下の処理を実行：

- すべてのビルド成果物をダウンロード
- GitHub Releasesを作成
- ビルド成果物をアップロード
- リリースノートを自動生成

## 設定要件

### GitHub Secrets

以下のSecretsが必要です（既に設定済みのものは再利用可能）：

| Secret名 | 説明 | 必須 |
|---------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー | ✅ |
| `TAURI_PRIVATE_KEY` | Tauriコード署名用秘密鍵 | ⚠️ オプション |
| `TAURI_KEY_PASSWORD` | Tauriコード署名用パスワード | ⚠️ オプション |

**注意**: `TAURI_PRIVATE_KEY` と `TAURI_KEY_PASSWORD` は、コード署名を行う場合のみ必要です。現時点ではオプションとして設定されています。

### Tauri設定の確認

**ファイル**: `src-tauri/tauri.conf.json`

- `beforeBuildCommand`: `ENABLE_STATIC_EXPORT=true bun run build`
- `frontendDist`: `../out`
- `bundle.targets`: `all`

## 使用方法

### 1. 自動ビルド（PR作成時）

PRを作成すると、自動的にビルドが実行されます：

```bash
git checkout -b feature/new-feature
# 変更を加える
git push origin feature/new-feature
# PRを作成
```

### 2. 手動ビルド

GitHub ActionsのUIから手動で実行できます：

1. GitHub > Actions タブを開く
2. **Tauri Build** ワークフローを選択
3. **Run workflow** をクリック
4. 必要に応じて `release` オプションを有効化

### 3. リリース作成（タグ作成時）

タグを作成すると、自動的にリリースが作成されます：

```bash
git tag v0.3.0
git push origin v0.3.0
```

## ビルド成果物

ビルドが完了すると、以下の成果物が生成されます：

- **macOS (x64)**: `For All Learners_vX.Y.Z_x64.dmg`
- **macOS (Apple Silicon)**: `For All Learners_vX.Y.Z_aarch64.dmg`
- **Windows**: `For All Learners_vX.Y.Z_x64_en-US.msi`
- **Linux**: `For All Learners_vX.Y.Z_amd64.AppImage`

## トラブルシューティング

### エラー1: フロントエンドビルドが失敗する

**原因**: 静的エクスポートが正しく設定されていない

**解決策**:
1. `next.config.ts` で `ENABLE_STATIC_EXPORT` が正しく処理されているか確認
2. `out` ディレクトリが生成されているか確認

### エラー2: Linuxビルドが失敗する

**原因**: システム依存関係が不足している

**解決策**: ワークフローに必要な依存関係がインストールされているか確認：
- `libwebkit2gtk-4.1-dev`
- `build-essential`
- `libssl-dev`
- `libgtk-3-dev`

### エラー3: macOSビルドが失敗する

**原因**: コード署名の問題

**解決策**: 
- コード署名が不要な場合は、`TAURI_PRIVATE_KEY` と `TAURI_KEY_PASSWORD` を削除
- コード署名が必要な場合は、適切な秘密鍵を設定

### エラー4: ビルド時間が長い

**原因**: キャッシュが効いていない

**解決策**:
- キャッシュキーが正しく設定されているか確認
- `Cargo.lock` と `bun.lock` がコミットされているか確認

## 次のステップ

1. **実際のビルド実行**
   - PRを作成してビルドが正常に動作するか確認
   - 各OS向けのビルド成果物が正しく生成されるか確認

2. **コード署名の設定**（オプション）
   - macOS向けコード署名の設定
   - Windows向けコード署名の設定

3. **リリースプロセスの改善**
   - リリースノートの自動生成を改善
   - チャンジェログの自動生成

## 関連ドキュメント

- Issue #186: GitHub Actions による Tauri バイナリビルド自動化
- Issue #157: Phase 6 - Next.js静的化とTauri統合
- Tauri公式ドキュメント: https://v2.tauri.app/guides/building/
- GitHub Actions ドキュメント: https://docs.github.com/en/actions

