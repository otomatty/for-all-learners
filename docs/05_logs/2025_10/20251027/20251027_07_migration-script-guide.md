# リンクグループマイグレーション実行ガイド

**日付**: 2025-10-27

---

## 📋 概要

既存のすべてのページに対してリンクグループを生成するマイグレーションスクリプトを作成しました。

### スクリプトの場所

- ファイル: `scripts/migrate-link-groups.ts`
- npm script: `migrate:link-groups`

---

## 🚀 実行方法

### 方法1: npm scriptで実行（推奨）

```bash
bun run migrate:link-groups
```

### 方法2: 直接実行

```bash
bun run scripts/migrate-link-groups.ts
```

---

## 📊 実行結果の例

```
🔄 Starting link groups migration...

📄 Found 150 pages to process

✅ [1/150] (1%) Synced: React入門
✅ [2/150] (1%) Synced: TypeScript基礎
✅ [3/150] (2%) Synced: Next.js実践
...
✅ [150/150] (100%) Synced: プロジェクト管理

==================================================
📊 Migration Summary:
==================================================
✅ Processed: 150
❌ Errors: 0
⏱️  Duration: 45s
==================================================

✨ Migration completed successfully!
```

---

## ⚙️ スクリプトの動作

### 処理内容

1. **全ページを取得**
   ```sql
   SELECT id, title, content_tiptap 
   FROM pages 
   WHERE content_tiptap IS NOT NULL
   ```

2. **各ページに対してリンクグループ同期**
   - リンクを抽出
   - `link_groups` テーブルに挿入/更新
   - `link_occurrences` テーブルに挿入

3. **進捗表示**
   - リアルタイムで進捗を表示
   - エラーが発生したページを記録

4. **サマリー表示**
   - 処理したページ数
   - エラー数
   - 実行時間

### 処理速度

- 1ページあたり約0.3秒（100msのスリープ含む）
- 150ページで約45秒
- データベースへの負荷を考慮して間隔を設けている

---

## ⚠️ 注意事項

### 実行前の確認

1. **開発環境で先にテスト**
   ```bash
   # 開発環境で実行
   bun run migrate:link-groups
   ```

2. **データベースバックアップ**
   - 本番環境で実行する前に必ずバックアップ
   - Supabase Dashboard から手動バックアップ可能

3. **実行タイミング**
   - ユーザーが少ない時間帯に実行
   - メンテナンス時間帯を推奨

### 実行後の確認

1. **データベースを確認**
   ```sql
   -- link_groups の件数
   SELECT COUNT(*) FROM link_groups;
   
   -- link_occurrences の件数
   SELECT COUNT(*) FROM link_occurrences;
   
   -- linkCount > 1 のグループ数
   SELECT COUNT(*) FROM link_groups WHERE link_count > 1;
   ```

2. **UIで確認**
   - 任意のページを開く
   - リンクグループが表示されるか確認

3. **ログを確認**
   - エラーがないか確認
   - 想定通りの件数が処理されたか確認

---

## 🐛 トラブルシューティング

### エラー: Failed to fetch pages

**原因**: Supabase接続エラー

**対処法**:
```bash
# 環境変数を確認
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# .env.local が正しく設定されているか確認
```

### エラー: Failed to sync (特定ページ)

**原因**: ページコンテンツの解析エラー

**対処法**:
1. ログで該当ページIDを確認
2. Supabase Dashboard でページを確認
3. content_tiptap が正しいJSON形式か確認
4. 必要に応じてページを修正して再実行

### スクリプトが途中で止まる

**原因**: メモリ不足、タイムアウト

**対処法**:
1. ページ数を絞って実行（スクリプトを修正）
   ```typescript
   // 最初の100ページだけ処理
   const pages = allPages.slice(0, 100);
   ```
2. スリープ時間を増やす（データベース負荷軽減）
   ```typescript
   await new Promise(resolve => setTimeout(resolve, 200)); // 100ms → 200ms
   ```

---

## 📝 今後の運用

### 定期実行は不要

このスクリプトは**一度だけ実行**すれば完了です。

以降は自動的に同期されます：
- ✅ ページ作成時に自動同期
- ✅ ページ更新時に自動同期（自動保存）
- ✅ ページ削除時に自動クリーンアップ

### 再実行が必要なケース

以下の場合のみ再実行してください：

1. **データベーストリガーが壊れた場合**
   - `link_count` が正しく更新されない
   - マイグレーションで修正後、このスクリプトを再実行

2. **手動でデータを削除した場合**
   - `link_groups` テーブルを TRUNCATE した
   - 再度データを生成する必要がある

3. **新しいリンク関連機能を追加した場合**
   - データ構造が変わった
   - マイグレーションの一環として再実行

---

## ✅ チェックリスト

マイグレーション実行前：
- [ ] 開発環境で動作確認済み
- [ ] データベースバックアップ取得済み
- [ ] メンテナンス時間帯に実行予定
- [ ] ユーザーへの通知済み（本番環境の場合）

マイグレーション実行後：
- [ ] エラーログを確認
- [ ] データベースで件数確認
- [ ] UIでリンクグループ表示確認
- [ ] パフォーマンス影響なし確認

---

**最終更新**: 2025-10-27
