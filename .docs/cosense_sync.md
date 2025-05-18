# Cosense (Scrapbox) 同期機能

本ドキュメントでは、Cosense（旧 Scrapbox）上のプロジェクトと当アプリの `pages` テーブルを同期する仕組みについて、データベース設計や API 実装例、フロントエンド連携、エラーハンドリング、テスト戦略などをまとめています。

---

## 1. 前提

- 使用する外部 API
  - プロジェクト一覧取得: `GET https://scrapbox.io/api/pages/:projectname`
  - ページ詳細取得: `GET https://scrapbox.io/api/pages/:projectname/:pagetitle`
- 認証は Supabase Auth を使用（サーバーサイドの `supabase.auth.getUser` を利用）
- プライベートプロジェクト同期のために Scrapbox セッションクッキーを `user_cosense_projects.scrapbox_session_cookie` に保持可能
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

| カラム                         | 型                                 | 備考                                               |
|--------------------------------|------------------------------------|----------------------------------------------------|
| `id`                           | `UUID` (PK, default `gen_random_uuid()`) |                                                  |
| `user_id`                      | `UUID` (FK → `accounts.id`)        | ユーザー                                            |
| `cosense_project_id`           | `UUID` (FK → `cosense_projects.id`)| 対象プロジェクト                                     |
| `page_count`                   | `INTEGER`                          | Scrapbox API から取得したページ数                   |
| `accessible`                   | `BOOLEAN`                          | Scrapbox プロジェクトへのアクセス可否               |
| `scrapbox_session_cookie`       | `TEXT`                             | プライベートプロジェクト用 Scrapbox セッションクッキー |
| `created_at`                   | `TIMESTAMPTZ` (default `now()`)    |                                                    |
| `updated_at`                   | `TIMESTAMPTZ` (default `now()`)    |                                                    |

- `UNIQUE(user_id, cosense_project_id)` で重複禁止
- RLS ポリシーを設定し、自分のレコードのみ操作可能にする

## 3. API 設計

### 3.1 Scrapboxページ取得API: `GET /api/cosense/pages/[projectName]`

1. Dynamic route segment から `projectName` を取得
2. `https://scrapbox.io/api/pages/${encodeURIComponent(projectName)}` をフェッチ
   - リクエストヘッダーに `x-scrapbox-cookie` または `cookie` を付与（プライベートプロジェクト対応）
3. 成功時: Scrapbox API の JSON レスポンスをそのまま返却
4. エラーハンドリング
   - Scrapbox API のステータスが非 OK → 同じステータスで `{ error, details }` を返却
   - フェッチ例外 → `500 Internal Server Error` とエラー詳細を返却

### 3.2 一覧同期: `GET /api/cosense/sync/list/[cosenseProjectId]`

1. Supabase Auth による認証を行う（サーバーサイドの `supabase.auth.getUser` を利用）
2. `user_cosense_projects.id`（:cosenseProjectId） から紐付く `project_name` を取得
3. `https://scrapbox.io/api/pages/${encodeURIComponent(projectName)}` をフェッチ（認証情報不要）
4. 取得したページ一覧を Supabase へ upsert
   ```ts
   const records = pages.map(item => ({
     user_id: user.id,
     title: item.title,
     scrapbox_page_id: item.title,
     scrapbox_page_list_synced_at: new Date().toISOString(),
   }));
   await supabase
     .from('pages')
     .upsert(records, { onConflict: ['user_id', 'scrapbox_page_id'] });
   ```
5. 成功時: `{ syncedCount: number, lastSyncedAt: string }` を返却
6. エラーハンドリング
   - Cosense 通信エラー → `502 Bad Gateway`
   - DB 保存エラー → `500 Internal Server Error`

### 3.3 個別ページ同期: `GET /api/cosense/sync/page/[cosenseProjectId]/[title]`

1. パスパラメータで `user_cosense_projects.id`（:cosenseProjectId） と ページタイトル（:title）を受け取る
2. 対応する `project_name` を DB から取得
3. `https://scrapbox.io/api/pages/${encodeURIComponent(projectName)}/${encodeURIComponent(title)}` をフェッチ
4. Scrapbox の `data.lines` を直接 TipTap の Paragraph ノードにマッピング
   ```ts
   const content = data.lines.map(item => ({
     type: 'paragraph',
     content: [{ type: 'text', text: item.text }],
   }));
   const json: JSONContent = { type: 'doc', content };
   ```
5. Supabase へ upsert
   ```ts
   await supabase
     .from('pages')
     .upsert(
       {
         user_id: user.id,
         title,
         content_tiptap: json,
         scrapbox_page_id: title,
         scrapbox_page_content_synced_at: new Date().toISOString(),
       },
       { onConflict: ['user_id', 'scrapbox_page_id'] },
     );
   ```
6. 成功時: `{ syncedAt: string }` を返却
7. エラーハンドリング
   - Cosense 通信エラー → `502 Bad Gateway`
   - JSON パースエラーやその他エラー → `500 Internal Server Error`

## 4. Server Actions

本アプリ内で使用するサーバーサイド関数として以下を提供します。

### 4.1 getUserCosenseProjects
```ts
/**
 * 認証ユーザーの連携 Cosense プロジェクト一覧を取得
 * @returns id, project_name, lastSyncedAt, page_count, accessible を含む配列
 */
async function getUserCosenseProjects(): Promise<Array<{
  id: string;
  project_name: string;
  lastSyncedAt: string;
  page_count: number;
  accessible: boolean;
}>>
```
サーバー側で Supabase Auth を利用し、`user_cosense_projects` テーブルから情報を取得します。

### 4.2 addUserCosenseProject
```ts
/**
 * 新規 Cosense プロジェクトを upsert し、ユーザーにリンク
 * @param projectName Scrapbox プロジェクト名
 * @param pageCountArg 既知のページ数を渡すと Scrapbox フェッチをスキップ
 */
async function addUserCosenseProject(
  projectName: string,
  pageCountArg?: number,
): Promise<{
  id: string;
  project_name: string;
  lastSyncedAt: string;
  page_count: number;
  accessible: boolean;
}>
```
Supabase と Scrapbox API を組み合わせ、`cosense_projects` と `user_cosense_projects` の upsert を行います。

### 4.3 removeUserCosenseProject
```ts
/**
 * 指定したリンクを削除
 * @param projectId user_cosense_projects.id
 */
async function removeUserCosenseProject(projectId: string): Promise<void>
```

## 5. フロントエンド連携

- Next.js のサーバーコンポーネントや Server Action 内で、開封時に個別同期 API を呼び出す
- ページ情報取得時に以下をチェックして遅延同期を行う
  ```ts
  if (!page.scrapbox_page_content_synced_at
      || page.scrapbox_page_list_synced_at > page.scrapbox_page_content_synced_at) {
    await fetch(`/api/cosense/sync/page/${userCosenseProjectId}/${encodeURIComponent(page.title)}`);
  }
  ```
- UI: Skeleton やローディングインジケータで表示遅延を吸収する
- 手動トリガー用に「同期」ボタンを設置するのも OK

## 6. エラーハンドリングガイドライン

- API ルートでは必ず `try/catch` を使用し、詳細なログをサーバー側に出力
- クライアントにはユーザー向けのわかりやすいメッセージを返却
- 長期的に再発しない根本原因を特定し、適切にリトライやキャッシュ制御を検討

## 7. 定期実行 (任意)

- Next.js Cron Route (Edge Function) や Bun の cron で定期的に **一覧同期** を実行
- 差分検出ロジックを組み合わせ、個別同期のトリガーだけフラグ管理

## 8. テスト戦略

- **ユニットテスト**: API ハンドラのロジック、エラーパスをモック検証
- **統合テスト**: Supabase のテストインスタンスを用いて upsert 処理を E2E で検証
- **UI テスト**: 同期ボタンや遅延同期のロード表示を自動テストツールでチェック

---

以上が Cosense 同期機能の全体像と実装ガイドです。
