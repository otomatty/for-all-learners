# Cosense (Scrapbox) 同期機能

本ドキュメントでは、Cosense（旧 Scrapbox）上のプロジェクトと当アプリの `pages` テーブルを同期する仕組みについて、データベース設計や API 実装例、フロントエンド連携、エラーハンドリング、テスト戦略などをまとめています。

---

## 1. 前提

- 使用する外部 API
  - プロジェクト一覧取得: `GET https://scrapbox.io/api/pages/:projectname`
  - ページ詳細取得: `GET https://scrapbox.io/api/pages/:projectname/:pagetitle`
- 各ユーザーごとに認証情報（API トークン）を保持するため、Supabase に連携テーブルを追加
- 多対多構造: 1 人のユーザーが複数プロジェクトを扱う可能性を許容

## 2. データベース設計

### 2.1 `cosense_projects` テーブル

| カラム               | 型                                                        | 備考                         |
|----------------------|-----------------------------------------------------------|------------------------------|
| `id`                 | `UUID` (PK, default `gen_random_uuid()`)                  |                              |
| `project_name`       | `TEXT` (UNIQUE)                                           | Scrapbox 上のプロジェクト名 |
| `created_at`         | `TIMESTAMPTZ` (default `now()`)                           |                              |
| `updated_at`         | `TIMESTAMPTZ` (default `now()`)                           |                              |

### 2.2 `user_cosense_projects` テーブル

| カラム                     | 型                                 | 備考                                             |
|----------------------------|------------------------------------|--------------------------------------------------|
| `id`                       | `UUID` (PK, default `gen_random_uuid()`) |                                               |
| `user_id`                  | `UUID` (FK → `accounts.id`)        | ユーザー                                            |
| `cosense_project_id`       | `UUID` (FK → `cosense_projects.id`)| 対象プロジェクト                                     |
| `api_token`                | `TEXT`                             | Cosense API トークン                               |
| `created_at`               | `TIMESTAMPTZ` (default `now()`)    |                                                  |
| `updated_at`               | `TIMESTAMPTZ` (default `now()`)    |                                                  |

- `UNIQUE(user_id, cosense_project_id)` で重複禁止
- RLS ポリシーを設定し、自分のレコードのみ操作可能にする

## 3. API 設計

### 3.1 一覧同期: `GET /api/cosense/sync/list`

1. リクエストヘッダーに `Authorization: Bearer <api_token>` を付与
2. `https://scrapbox.io/api/pages/:projectname` をフェッチ
3. 取得したページ一覧を Supabase へ upsert
   ```ts
   await supabase
     .from('pages')
     .upsert({
       title: item.title,
       scrapbox_page_id: item.title,
       scrapbox_page_list_synced_at: new Date().toISOString(),
     });
   ```
4. 成功時: `{ syncedCount: number, lastSyncedAt: string }` を返却
5. エラーハンドリング
   - Cosense 通信エラー → `502 Bad Gateway`
   - DB 保存エラー → `500 Internal Server Error`

### 3.2 個別ページ同期: `GET /api/cosense/sync/page/:project/:title`

1. `:project`, `:title` をパスパラメータで受け取る
2. `https://scrapbox.io/api/pages/:project/:title` をフェッチ
3. レスポンス JSON を TipTap の `JSONContent` にマッピング
   ```ts
   // 仮: scrapbox の JSON を HTML → TipTap JSON に変換する例
   const markdown = convertScrapboxToMarkdown(data.lines);
   const html = marked.parse(markdown);
   const json = htmlToTiptapJSON(html);
   ```
4. Supabase へ upsert
   ```ts
   await supabase
     .from('pages')
     .upsert({
       title,
       content_tiptap: json,
       scrapbox_page_content_synced_at: new Date().toISOString(),
     });
   ```
5. エラーハンドリング
   - Cosense 通信エラー → `502`
   - パースエラー → `422 Unprocessable Entity`
   - DB 保存エラー → `500`

## 4. フロントエンド連携

- Next.js のサーバーコンポーネントや Server Action 内で、開封時に個別同期 API を呼び出す
- ページ情報取得時に以下をチェックして遅延同期を行う
  ```ts
  if (!page.scrapbox_page_content_synced_at
      || page.scrapbox_page_list_synced_at > page.scrapbox_page_content_synced_at) {
    await fetch(`/api/cosense/sync/page/${project}/${page.title}`);
  }
  ```
- UI: Skeleton やローディングインジケータで表示遅延を吸収する
- 手動トリガー用に「同期」ボタンを設置するのも OK

## 5. エラーハンドリングガイドライン

- API ルートでは必ず `try/catch` を使用し、詳細なログをサーバー側に出力
- クライアントにはユーザー向けのわかりやすいメッセージを返却
- 長期的に再発しない根本原因を特定し、適切にリトライやキャッシュ制御を検討

## 6. 定期実行 (任意)

- Next.js Cron Route (Edge Function) や Bun の cron で定期的に **一覧同期** を実行
- 差分検出ロジックを組み合わせ、個別同期のトリガーだけフラグ管理

## 7. テスト戦略

- **ユニットテスト**: API ハンドラのロジック、エラーパスをモック検証
- **統合テスト**: Supabase のテストインスタンスを用いて upsert 処理を E2E で検証
- **UI テスト**: 同期ボタンや遅延同期のロード表示を自動テストツールでチェック

---

以上が Cosense 同期機能の全体像と実装ガイドです。
