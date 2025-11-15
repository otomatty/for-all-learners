# プラグイン公開ガイド

**最終更新**: 2025-11-10  
**対象**: プラグイン開発者  
**関連**: [CLI開発ツール](../plugin-development.md#cli開発ツール)

---

## 概要

F.A.L プラグインシステムでは、開発したプラグインをマーケットプレイスに公開することができます。このドキュメントでは、CLIツールを使用してプラグインを公開する方法を説明します。

### 公開方法

プラグインは `bun run plugins:publish` コマンドを使用して公開します。

---

## 目次

1. [前提条件](#前提条件)
2. [環境変数の設定](#環境変数の設定)
3. [プラグインの公開](#プラグインの公開)
4. [公開プロセスの詳細](#公開プロセスの詳細)
5. [トラブルシューティング](#トラブルシューティング)
6. [よくある質問](#よくある質問)

---

## 前提条件

プラグインを公開する前に、以下の条件を満たしている必要があります：

### 1. プラグインのビルド

プラグインは公開前に自動的にビルドされますが、事前にビルドしておくことも可能です：

```bash
# プラグインをビルド
bun run plugins:build <plugin-id>
```

### 2. マニフェストファイルの確認

`plugin.json` ファイルが正しく設定されていることを確認してください：

- `id`: プラグインID（一意である必要があります）
- `name`: プラグイン名
- `version`: バージョン番号（セマンティックバージョニング推奨）
- `description`: プラグインの説明
- `author`: 作成者名
- `main`: エントリーポイント（`dist/index.js` または `src/index.ts`）

### 3. プラグインコードの存在確認

以下のいずれかが存在する必要があります：

- `dist/index.js`（ビルド済みコード、推奨）
- `src/index.ts`（ソースコード、フォールバック）

---

## 環境変数の設定

CLIコマンドからプラグインを公開するには、Supabaseのサービスロールキーが必要です。

### 開発環境での設定

`.env` ファイル（または `.env.local`）に以下の環境変数を設定してください：

```env
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**重要**: 
- `.env` ファイルは `.gitignore` に含まれていることを確認してください
- サービスロールキーは機密情報です。絶対にGitリポジトリにコミットしないでください

### サービスロールキーの取得方法

1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. `Settings` → `API` に移動
4. `Project API keys` セクションで `service_role` キーをコピー

**注意**: サービスロールキーは管理者権限を持つため、慎重に扱ってください。

---

## プラグインの公開

### 基本的な使用方法

```bash
# プラグインを公開
bun run plugins:publish <plugin-id>
```

### 使用例

```bash
# GitHubコミット統計プラグインを公開
bun run plugins:publish com.fal.examples.github-commit-stats

# Hello Worldプラグインを公開
bun run plugins:publish com.example.hello-world
```

### 公開プロセスの流れ

コマンドを実行すると、以下の処理が自動的に実行されます：

1. **プラグインの検索**: `plugins/examples/` ディレクトリからプラグインを検索
2. **ビルド**: プラグインを自動的にビルド（`dist/index.js` が存在しない場合）
3. **Supabase接続**: サービスロールキーを使用してSupabaseに接続
4. **Storageへのアップロード**: プラグインコードをSupabase Storageにアップロード
5. **データベースへの登録**: プラグイン情報をデータベースに登録または更新

### 実行例

```bash
$ bun run plugins:publish com.fal.examples.github-commit-stats

✅ プラグインを更新しました
   Code URL: https://ablwpfboagwcegeehmtg.supabase.co/storage/v1/object/public/plugins/plugins/com.fal.examples.github-commit-stats/1.0.0/index.js
```

### 新規公開と更新

- **新規公開**: プラグインIDがデータベースに存在しない場合、新規レコードが作成されます
- **更新**: プラグインIDが既に存在する場合、既存レコードが更新されます

---

## 公開プロセスの詳細

### 1. プラグインの検索

`plugins:publish` コマンドは、以下の順序でプラグインディレクトリを検索します：

1. **Kebab-case変換**: プラグインIDのドット（`.`）をハイフン（`-`）に変換して検索
   - 例: `com.example.plugin` → `com-example-plugin`
2. **直接マッチ**: プラグインIDそのもので検索
3. **マニフェストスキャン**: すべてのディレクトリをスキャンして `plugin.json` の `id` フィールドと照合

### 2. ビルドプロセス

プラグインが自動的にビルドされます：

```bash
# 内部的に実行されるコマンド
bun run plugins:build <plugin-id>
```

ビルドプロセスでは以下が実行されます：

- TypeScriptの型チェック
- esbuildによるバンドル
- マニフェストの検証
- `dist/index.js` の生成

### 3. Storageへのアップロード

プラグインコードは以下のパスでSupabase Storageにアップロードされます：

```
plugins/{plugin-id}/{version}/index.js
```

例: `plugins/com.fal.examples.github-commit-stats/1.0.0/index.js`

### 4. データベースへの登録

プラグイン情報は `plugins` テーブルに以下の情報とともに登録されます：

- プラグインID、名前、バージョン、説明
- 作成者、ホームページ、リポジトリ、ライセンス
- マニフェスト全体（JSON形式）
- Storageの公開URL
- 拡張ポイントの有効/無効フラグ

**注意**: 
- `is_official`: ローカルプラグインは `false` に設定されます
- `is_reviewed`: ローカルプラグインは `false` に設定されます（レビューが必要）

---

## トラブルシューティング

### 問題1: 「プラグインが見つかりません」エラー

**原因**: 
- プラグインIDが間違っている
- `plugins/examples/` ディレクトリにプラグインが存在しない
- `plugin.json` ファイルが見つからない

**解決方法**:
```bash
# プラグインIDを確認
cat plugins/examples/your-plugin/plugin.json | grep '"id"'

# プラグインが存在するか確認
ls -la plugins/examples/

# プラグインIDを正しく指定
bun run plugins:publish com.example.your-plugin
```

### 問題2: 「環境変数が設定されていません」エラー

**原因**: `SUPABASE_SERVICE_ROLE_KEY` または `NEXT_PUBLIC_SUPABASE_URL` が設定されていない

**解決方法**:
```bash
# .env ファイルを確認
cat .env | grep SUPABASE

# 環境変数を設定
echo "SUPABASE_SERVICE_ROLE_KEY=your-key" >> .env
echo "NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co" >> .env

# 再度実行
bun run plugins:publish <plugin-id>
```

### 問題3: 「ビルドに失敗しました」エラー

**原因**: 
- TypeScriptの型エラー
- 依存関係の問題
- マニフェストの検証エラー

**解決方法**:
```bash
# 手動でビルドしてエラーを確認
bun run plugins:build <plugin-id>

# 型チェックを実行
cd plugins/examples/your-plugin
bunx tsc --noEmit

# マニフェストを検証
bun run plugins:validate <plugin-id>
```

### 問題4: 「Storageへのアップロードに失敗しました」エラー

**原因**: 
- Supabase Storageの権限設定
- ネットワークエラー
- サービスロールキーの権限不足

**解決方法**:
1. SupabaseダッシュボードでStorageの設定を確認
2. `plugins` バケットが存在し、公開読み取りが有効になっているか確認
3. サービスロールキーが正しいか確認

### 問題5: 「データベースへの登録に失敗しました」エラー

**原因**: 
- データベースの権限設定
- テーブルの制約違反（例: プラグインIDの重複）
- ネットワークエラー

**解決方法**:
1. Supabaseダッシュボードでデータベースの設定を確認
2. `plugins` テーブルが存在し、適切な権限が設定されているか確認
3. 既存のプラグインIDと重複していないか確認

---

## よくある質問

### Q: 公開前にプラグインをテストできますか？

**A**: はい。プラグインを公開した後、マーケットプレイスからインストールしてテストできます。また、CLIツールの `plugins:dev` コマンドを使用して開発モードでテストすることもできます。

### Q: 公開したプラグインを削除できますか？

**A**: 現在のCLIツールには削除機能はありません。Supabaseダッシュボードから手動で削除するか、データベースを直接操作してください。

### Q: バージョンを更新するにはどうすればよいですか？

**A**: `plugin.json` の `version` フィールドを更新してから、再度 `plugins:publish` コマンドを実行してください。新しいバージョンとしてStorageにアップロードされ、データベースのレコードが更新されます。

### Q: 複数のプラグインを一度に公開できますか？

**A**: 現在のCLIツールでは、一度に1つのプラグインのみ公開できます。複数のプラグインを公開する場合は、それぞれ個別にコマンドを実行してください。

### Q: 公開したプラグインは誰でもインストールできますか？

**A**: はい。公開されたプラグインは、マーケットプレイスから誰でもインストールできます。ただし、`is_reviewed: false` のプラグインは、ユーザーに警告が表示される可能性があります。


---

## 関連ドキュメント

- **[CLI開発ツール](../plugin-development.md#cli開発ツール)**: その他のCLIコマンドの使い方
- **[プラグイン開発ガイド](../plugin-development.md)**: プラグイン開発の基本
- **[トラブルシューティング](./troubleshooting.md)**: その他のトラブルシューティング

---

## 実装ファイル

プラグイン公開機能に関連する主要なファイル：

- **CLIスクリプト**: [`scripts/plugins/publish-plugin.ts`](../../../scripts/plugins/publish-plugin.ts)
- **共通公開ロジック**: [`lib/plugins/plugin-publisher.ts`](../../../lib/plugins/plugin-publisher.ts)
- **Server Action**: [`app/_actions/plugin-publish.ts`](../../../app/_actions/plugin-publish.ts)
- **CLIコマンド**: [`scripts/plugins/cli.ts`](../../../scripts/plugins/cli.ts)

---

**最終更新**: 2025-11-10

