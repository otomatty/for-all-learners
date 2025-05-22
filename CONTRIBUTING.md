# Contributing to For All Learners

まずは Issue や Discussions で提案を立ててください。

## 開発環境の構築
1. リポジトリをクローン: `git clone <repo_url>`
2. ブランチを作成: `git switch -c feature/your-feature`
3. 依存ライブラリをインストール: `bun install` もしくは `npm install`

## ブランチ運用ルール
- `main` はリリース用。直接コミット禁止。
- 新機能は `feature/xxx`、バグ修正は `fix/xxx` のようにプレフィックスを付ける。

## コミットメッセージ規約
- タイトル行は 50 文字以内
- `feat: 新機能`, `fix: バグ修正`, `docs: ドキュメント`, `chore: 雑務` のように種類を明示。
- 本文は何を・なぜ行ったかを簡潔に記述。

## プルリクエストの流れ
1. フォークまたはブランチ作成
2. コミット・プッシュ
3. 本リポに向けて Pull Request 作成
4. CI が通ったらレビュー依頼
5. レビューコメントを反映後マージ

ご協力ありがとうございます。 