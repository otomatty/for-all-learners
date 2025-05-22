# Notes グループ機能 要件定義

## 1. 目的
- 独立した `notes` 単位で page（ネットワーク型メモ）をグループ化し、グループ単位での共有や参加機能を提供する。
- slug による一意識別で URL 指向の掲示板的運用を可能にする。

## 2. データモデル

### 2.1 reserved_slugs テーブル
- slug TEXT PRIMARY KEY
- description TEXT（任意）
- created_at TIMESTAMPTZ DEFAULT NOW()

> **用途:** 将来的な予約語の追加・削除をDB側で一元管理し、トリガーで検証。

### 2.2 notes テーブル
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- owner_id UUID NOT NULL REFERENCES accounts(id)
- slug TEXT NOT NULL UNIQUE
- title TEXT NOT NULL
- description TEXT
- visibility VARCHAR(10) NOT NULL DEFAULT 'private' CHECK (visibility IN ('public','unlisted','invite','private'))
- created_at TIMESTAMPTZ DEFAULT NOW()
- updated_at TIMESTAMPTZ DEFAULT NOW()

### 2.3 note_page_links テーブル
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- note_id UUID NOT NULL REFERENCES notes(id)
- page_id UUID NOT NULL REFERENCES pages(id)
- created_at TIMESTAMPTZ DEFAULT NOW()
- UNIQUE(note_id, page_id)

### 2.4 note_shares テーブル
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- note_id UUID NOT NULL REFERENCES notes(id)
- shared_with_user_id UUID NOT NULL REFERENCES accounts(id)
- permission_level VARCHAR(10) NOT NULL CHECK (permission_level IN ('editor','viewer'))
- created_at TIMESTAMPTZ DEFAULT NOW()
- UNIQUE(note_id, shared_with_user_id)

### 2.5 share_links テーブル
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- resource_type VARCHAR(10) NOT NULL CHECK (resource_type IN ('note','page','deck'))
- resource_id UUID NOT NULL  # 対象ノート／ページ／デッキのID
- token TEXT UNIQUE NOT NULL
- permission_level VARCHAR(10) NOT NULL CHECK (permission_level IN ('viewer','editor','owner'))
- created_at TIMESTAMPTZ DEFAULT NOW()
- expires_at TIMESTAMPTZ  # 有効期限（任意）
- revoked_at TIMESTAMPTZ  # 無効化日時（任意）

## 3. RLS ポリシー
- `notes`, `note_page_links`, `note_shares`, `share_links` に対し、`auth.uid() = owner_id` または適切な参照チェックでRow Level Securityを設定。

## 4. トリガー & 検証関数
```sql
CREATE FUNCTION reject_reserved_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM reserved_slugs WHERE slug = NEW.slug) THEN
    RAISE EXCEPTION '"%" は予約語です。別の slug を指定してください。', NEW.slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notes_slug_check
  BEFORE INSERT OR UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION reject_reserved_slug();
```

## 5. DB マイグレーション順序
1. `reserved_slugs` テーブル作成 + 初期データ挿入（new, edit, api, admin…）
2. `notes` テーブル作成
3. slug検証用関数・トリガー作成
4. `note_page_links`, `note_shares` テーブル作成
5. `share_links` テーブル作成（`resource_type` に 'note' を含むようALTER含む）
6. 既存 `pages` の初期 `notes` 紐付けスクリプト

## 6. Server Actions 実装
- 配置場所: `app/_actions/notes.ts`
- メイン関数:
  - `createNote(data: { slug: string; title: string; description?: string; visibility?: string; })`
  - `updateNote(id: string, data: Partial<CreateNotePayload>)`
  - `deleteNote(id: string)`
  - `linkPageToNote(noteId: string, pageId: string)`
  - `unlinkPageFromNote(noteId: string, pageId: string)`
  - `shareNote(noteId: string, userId: string, permission: 'editor'|'viewer')`
  - `unshareNote(noteId: string, userId: string)`
  - `joinNotePublic(slug: string)`
- 各関数で:
  - slug・権限・トリガー例外のハンドリング
  - RLS, 所有者チェック
  - DB トランザクション
  - `updateNote` 実行時に `data.visibility` が変更されている場合、サーバーAction内で以下を実行:
    - 対象ノートの `note_shares` 全レコード（owner 除く）を削除または無効化
    - 対象ノートの `share_links` 全レコードを削除または無効化

## 7. UI/UX 要件
- `/notes/[slug]` ルーティング
- notes 一覧（所有/参加中）
- notes 詳細: ページ一覧、追加/削除操作
- 共有設定ダイアログ（visibility 切替 / 招待 / URL コピー / 参加ボタン）
- slug 入力時のリアルタイム重複 & 予約語バリデーション

## 8. 非機能要件
- インデックス: `notes(slug)`, `note_page_links(note_id,page_id)`, `note_shares(note_id,shared_with_user_id)`
- パフォーマンス: ページネーション, N+1 回避
- ログ: 共有・参加イベントの監査ログ
- テスト: ユニット・統合・E2E
- モバイル・アクセシビリティ対応 

## 9. 他テーブルとの関係
- `notes.owner_id` ⇔ `accounts.id`（ノート所有者）
- `note_shares.shared_with_user_id` ⇔ `accounts.id`（共有ユーザー）
- `note_page_links.page_id` ⇔ `pages.id`（ページ紐付け）
- `pages` ⇔ `page_shares`（個別ページの共有設定）
- `decks` ⇔ `deck_shares`（既存デッキ共有との整合性確認）
- `notes` と `study_goals`／`goal_deck_links`（将来の学習目標との連携検討）
- `raw_inputs`／`audio_transcriptions`（ノート内OCR/音声メモ機能との統合）

## 10. Notes 一覧ページ（/notes） 機能検討
- メタ情報表示
  - タイトル、説明、slug、visibility、ページ数、参加者数、最終更新日時
- 検索・フィルタ
  - タイトル/slug/説明/タグ全文検索
  - visibility(public/unlisted/invite/private)／参加状況／更新日時によるフィルタ
- ソート
  - 作成日/更新日/ページ数/参加者数/閲覧数順
- クイックアクション
  - 新規ノート作成、参加中ノートへのクイックアクセス
  - 注目の公開ノート推薦セクション（人気順/最新順）
  - 最近閲覧したノート、参加招待通知
- グループ化・タグ付け
  - ユーザー定義タグによる分類
  - お気に入り・ピン留め機能
- 統計・アクティビティ
  - ノートごとの編集履歴サマリ、ページ追加/削除のアクティビティ
  - 参加ユーザーのアクション数や最終アクティビティ表示 

## 11. Notes 詳細ページ 修正計画

- 目的: 各 `notes` に紐づく `pages` を、既存の `/pages` 一覧ページと同様のグリッドレイアウトで一覧表示する。

- UI コンポーネント:
  - 既存の `PageCard` コンポーネントを再利用
  - グリッド配置用の `PageGrid` コンポーネントを流用または新規作成（`components/PageGrid.tsx`）

- データ取得:
  - `app/_actions/notes.ts` に `getNoteDetail(slug: string)` Server Action を追加
  - NOTE: Note のメタ情報（title, description, visibility）とリンク済み Page 一覧を一括取得

- ページネーション／無限スクロール:
  - 既存の `/pages` ページで実装しているロジックを流用
  - クライアントサイドでのフェッチとスクロール検知

- 実装ステップ:
  1. 新規ファイル `app/notes/[slug]/page.tsx` を作成
     - サーバーコンポーネントとして `getNoteDetail` を呼び出し
     - Loading／Empty／Error 状態を表示
  2. `PageGrid` に取得した page 一覧を渡し、カードをレンダリング
  3. Note ヘッダー領域に以下を追加:
     - タイトル、説明
     - 参加ボタン（public Notes の場合）
     - 共有設定ボタン／URLコピー機能
  4. Tailwind CSS で既存スタイルを踏襲し、レスポンシブ対応
  5. ユニットテスト／統合テストの実装
     - Data fetching のモックテスト
     - UI Snapshot テスト
  6. E2E テスト: ノート詳細ページ表示、ページカードのクリック、無限スクロール動作を検証

- 注意事項:
  - RLS によるアクセス制御を Server Action で必ずチェック
  - 大量ページ表示時のパフォーマンス（`getServerSideProps` 相当のキャッシュ検討） 

## 12. 共有機能詳細

### 12.1 Notes 共有機能

- テーブル
  - `note_shares`（招待ユーザー一覧／編集権限）
  - `share_links`（resource_type = 'note', token によるURL共有・無制限公開リンク）

- 権限レベル
  - editor: ページ追加・削除・編集権限
  - viewer: 閲覧のみ

- 共有モード
  1. public: 全員に閲覧公開（visibility = 'public'）
     - リンクなしで参照可能
     - 「参加」ボタンをクリックすると `note_shares` に `permission_level: 'editor'` のレコードを挿入し、編集権限を付与
  2. unlisted: URL を知る人のみ閲覧
     - `share_links` に viewer 権限のトークンリンクを作成
     - owner はいつでも revoke 可能
  3. invite: 招待ユーザーのみ閲覧／編集
     - `note_shares` に招待レコードを挿入
     - 招待メール送信ロジックを実装（任意）
  4. private: オーナーのみ
     - `note_shares`・`share_links` は全て無効化／削除
  - visibility 変更時のレコード無効化:
    - visibility が変更された場合、上記 Server Action `updateNote` 内で `note_shares`（owner 除く）および `share_links` のレコードを削除または無効化

- サーバーアクション (app/_actions/notes.ts)
  - `shareNoteInvite(noteId: string, userId: string, permission: 'editor'|'viewer')`
  - `unshareNoteInvite(noteId: string, userId: string)`
  - `generateNoteShareLink(noteId: string, permission: 'viewer')`
  - `revokeNoteShareLink(token: string)`
  - `joinNoteByLink(token: string)`
  - `joinNotePublic(slug: string)`

- UI
  - 共有設定ダイアログ: モード選択ラジオ / 招待ユーザーリスト管理 / リンク生成＆コピー
  - 招待ユーザーは権限切替・削除可
  - unlisted モードでは「共有用URL」を入力欄に表示
  - public モードではノート詳細画面に「参加」ボタンを表示し、クリックで編集権限を取得

### 12.2 Pages 共有機能

- テーブル
  - `page_shares`（招待ユーザー一覧／編集権限）
  - `share_links`（resource_type = 'page'）

- 権限レベル
  - editor: ページ内容編集・削除
  - viewer: 閲覧のみ

- 共有モード
  - public: visibility = 'public'（既存設定）
  - unlisted: share_links トークン URL
  - invite: page_shares による招待制
  - private: オーナーのみ

- サーバーアクション (app/_actions/pages.ts)
  - `sharePageInvite(pageId: string, userId: string, permission: 'editor'|'viewer')`
  - `unsharePageInvite(pageId: string, userId: string)`
  - `generatePageShareLink(pageId: string, permission: 'viewer')`
  - `revokePageShareLink(token: string)`
  - `joinPageByLink(token: string)`

- UI
  - 各 PageCard や詳細ページに「共有」ボタン
  - ダイアログで招待ユーザーリスト / リンク管理
  - copy-to-clipboard、expires_at 設定オプション

- RLS ポリシー
  - `note_shares`, `page_shares`, `share_links` に対して `auth.uid()` と resource 所有者／招待ユーザー照合を実装

### 12.3 同時編集機能
- 目的: 複数ユーザーが同時にノート／ページをリアルタイムで編集できるようにする
- 技術選定:
  - Tiptap Collaboration と Y.js による CRDT ベースの共同編集
  - Supabase Realtime を使用して Y.js 更新を配信

#### 12.3.1 依存パッケージ
- yjs
- @tiptap/extension-collaboration
- @tiptap/extension-collaboration-cursor
- @supabase/supabase-js
- buffer  # Node.js 環境での Uint8Array サポート

#### 12.3.2 環境変数
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

#### 12.3.3 クライアント実装詳細
1. Y.Doc の初期化
   ```ts
   import * as Y from 'yjs';
   const ydoc = new Y.Doc();
   ```
2. Tiptap Editor に Collaboration extensions を組み込む
   ```ts
   import { Editor } from '@tiptap/react';
   import Collaboration from '@tiptap/extension-collaboration';
   import CollaborationCursor from '@tiptap/extension-collaboration-cursor';

   const editor = new Editor({
     extensions: [
       Collaboration.configure({ document: ydoc }),
       CollaborationCursor.configure({
         provider: channel,
         user: { id: auth.uid(), name: user.name, color: user.color }
       }),
       // 他の拡張...
     ],
     content: initialContentJSON,
   });
   ```
3. Supabase Realtime チャンネルの購読と Y.js update の適用
   ```ts
   import { createClient } from '@supabase/supabase-js';
   const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
   const channel = supabase.channel(`notes:${noteId}`);

   channel.on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
     Y.applyUpdate(ydoc, new Uint8Array(payload.update));
   });
   await channel.subscribe();
   ```
4. Y.js update イベントの送信
   ```ts
   ydoc.on('update', update => {
     channel.send({
       type: 'broadcast',
       event: 'yjs-update',
       payload: { update: Array.from(update) }
     });
   });
   ```
5. スナップショット保存（例: 30秒ごとまたは編集停止後）
   ```ts
   const saveSnapshot = async () => {
     const update = Y.encodeStateAsUpdate(ydoc);
     await fetch('/api/pages/collab-save', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ pageId, update: Array.from(update) }),
     });
   };
   setInterval(saveSnapshot, 30000);
   ```

#### 12.3.4 サーバーサイド実装詳細
##### API エンドポイント: `/api/pages/collab-save.ts`
```ts
import type { NextApiRequest, NextApiResponse } from 'next';
import * as Y from 'yjs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { pageId, update } = req.body as { pageId: string; update: number[] };
  const ydoc = new Y.Doc();
  // クライアント保存済みスナップショットをロードする場合はここで初期化

  // Y.js update を適用
  Y.applyUpdate(ydoc, new Uint8Array(update));

  // TipTap コンテンツに変換
  const tiptapJSON = ydoc.get('prosemirror', Y.XmlFragment).toJSON();

  // Supabase でページを更新
  await supabase
    .from('pages')
    .update({ content_tiptap: JSON.stringify(tiptapJSON) })
    .eq('id', pageId);

  res.status(200).end();
}
```  
##### Server Action 実装例
- API エンドポイントの代わりに Next.js Server Actions を利用して、`saveCollabSnapshot` 関数を `app/_actions/pages.ts` に定義できます。

```ts
// app/_actions/pages.ts
'use server';
import * as Y from 'yjs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function saveCollabSnapshot(
  pageId: string,
  update: number[]
) {
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, new Uint8Array(update));
  const tiptapJSON = ydoc
    .get('prosemirror', Y.XmlFragment)
    .toJSON();

  await supabase
    .from('pages')
    .update({ content_tiptap: JSON.stringify(tiptapJSON) })
    .eq('id', pageId);
}
```

クライアントからは以下のように呼び出します:
```ts
import { saveCollabSnapshot } from 'app/_actions/pages';

async function handleSnapshot(update: number[]) {
  await saveCollabSnapshot(pageId, update);
}
```  