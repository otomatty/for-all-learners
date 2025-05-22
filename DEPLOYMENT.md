# Deployment

## Vercel
1. Vercel にログインし、プロジェクトをインポート。
2. 環境変数を設定:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. ブランチごとに Preview デプロイが可能。

## Supabase
1. プロジェクトを作成。
2. `schema.sql` を適用。
3. 環境変数に DATABASE_URL を設定。

## CI/CD
- GitHub Actions で `main` マージ時に本番環境へ自動デプロイ。
- `preview` ブランチはプレビュー専用として設定。 