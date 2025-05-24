# Notes サーバーアクション一覧

このディレクトリ (`app/_actions/notes/`) に定義されているサーバーアクション（Server Actions）と、それらが操作するデータベーステーブルをまとめています。

---

## 利用方法

```ts
import {
  createNote,
  updateNote,
  deleteNote,
  linkPageToNote,
  unlinkPageFromNote,
  shareNote,
  unshareNote,
  generateNoteShareLink,
  revokeNoteShareLink,
  joinNoteByLink,
  joinNotePublic,
  getNoteDetail,
  getNotesList,
  getNotePages,
} from "@/app/_actions/notes";
```

---

## サーバーアクション一覧

| アクション名               | ファイル名                     | 概要                                                       |
|---------------------------|--------------------------------|----------------------------------------------------------|
| createNote                | createNote.ts                  | 新しいノートを作成                                      |
| updateNote                | updateNote.ts                  | 既存のノートを更新                                      |
| deleteNote                | deleteNote.ts                  | ノートを削除                                            |
| linkPageToNote            | linkPageToNote.ts              | ページをノートに紐付け                                    |
| unlinkPageFromNote        | unlinkPageFromNote.ts          | ノートからページの紐付けを解除                            |
| shareNote                 | shareNote.ts                   | ノートをユーザーに共有                                  |
| unshareNote               | unshareNote.ts                 | ユーザーへのノート共有を解除                              |
| generateNoteShareLink     | generateNoteShareLink.ts       | 共有リンクを生成                                        |
| revokeNoteShareLink       | revokeNoteShareLink.ts         | 共有リンクを失効                                        |
| joinNoteByLink            | joinNoteByLink.ts              | 共有リンク経由でノートに参加                            |
| joinNotePublic            | joinNotePublic.ts              | 公開ノートにエディタ権限で参加                          |
| getNoteDetail             | getNoteDetail.ts               | ノートの詳細メタデータを取得                            |
| getNotesList              | getNotesList.ts                | 所有／共有されたノート一覧を取得                        |
| getNotePages              | getNotePages.ts                | ノートに紐づくページをページネーション付きで取得        |

---

## 関連データベーステーブル

| テーブル名             | 主なカラム                                           | 説明                                               |
|-----------------------|----------------------------------------------------|--------------------------------------------------|
| `notes`               | `id`, `slug`, `title`, `description`, `visibility`, `updated_at`, `page_count`, `participant_count` | ノートの基本情報と統計を保持                   |
| `note_shares`         | `note_id`, `shared_with_user_id`, `permission_level`                                        | ノートの共有情報を管理                         |
| `share_links`         | `resource_type`, `resource_id`, `token`, `permission_level`, `expires_at`                  | 一時的な共有リンクを管理                       |
| `note_page_links`     | `note_id`, `page_id`                                                                       | ノートとページのリレーションを保持             |
| `pages`               | `id`, `content`, `created_at`, `updated_at`, ...                                             | RPC `get_note_pages` を通じてページ情報を取得  |

---

## RPC 関数

- `get_note_pages`
  - PostgreSQL 上のストアドプロシージャ (RPC)
  - パラメータ: `p_note_id` (`notes.id`), `p_limit`, `p_offset`, `p_sort` (`updated` | `created`)
  - 戻り値: 指定ノートのページリストと総件数を含むオブジェクト
