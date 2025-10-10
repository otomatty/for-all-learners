# Phase 1: ユーザーページ自動作成機能 - 詳細実装計画書

## 1. 既存ロジック分析と活用方針

### 1.1 活用可能な既存コンポーネント

#### ページ作成関連
| 既存関数 | 場所 | 活用方法 | 参考実装 |
|---|---|---|---|
| `createPage()` | `app/_actions/pages.ts` | ユーザーページ作成の基盤 | 自動サムネイル生成付き |
| `extractFirstImageUrl()` | `lib/utils/thumbnailExtractor.ts` | アバター画像のサムネイル設定 | 既存のサムネイル抽出ロジック |
| `linkPageToNote()` | `app/_actions/notes/linkPageToNote.ts` | ページとノートの紐付け | 単一ページの紐付け処理 |

#### ノート参加関連
| 既存関数 | 場所 | 修正対象 | 追加処理 |
|---|---|---|---|
| `joinNoteByLink()` | `app/_actions/notes/joinNoteByLink.ts` | ✅修正 | ユーザーページ自動作成 |
| `joinNotePublic()` | `app/_actions/notes/joinNotePublic.ts` | ✅修正 | ユーザーページ自動作成 |

#### 参考実装パターン
| 実装例 | 場所 | 学習ポイント |
|---|---|---|
| `syncCardLinks()` | `app/_actions/syncCardLinks.ts` | ページ存在確認→作成パターン |
| `duplicatePage()` | `app/_actions/duplicatePage.ts` | note_page_linksの複製パターン |
| `migrateOrphanedPages()` | `app/_actions/notes/migrateOrphanedPages.ts` | 一括リンク作成パターン |

### 1.2 既存ロジックの詳細分析

#### createPage関数の活用
```typescript
// 既存のcreatePageを完全活用
export async function createPage(
  page: Omit<Database["public"]["Tables"]["pages"]["Insert"], "id">,
  autoGenerateThumbnail = true,
) {
  // 1. 自動サムネイル生成が組み込み済み
  // 2. extractFirstImageUrl()を内部で呼び出し
  // 3. データベース挿入とエラーハンドリング完備
}
```

#### linkPageToNote関数の活用
```typescript
// 既存のlinkPageToNoteを完全活用
export async function linkPageToNote(noteId: string, pageId: string) {
  // 1. note_page_linksテーブルへの挿入
  // 2. エラーハンドリング
  // 3. デバッグログ出力
}
```

## 2. 詳細実装設計

### 2.1 新規作成ファイル

#### app/_actions/user-page.ts
```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { createPage } from "./pages";
import { linkPageToNote } from "./notes/linkPageToNote";
import type { Database } from "@/types/database.types";
import type { JSONContent } from "@tiptap/core";

/**
 * ユーザーページ作成・確認結果
 */
export interface UserPageResult {
  pageId: string;
  pageCreated: boolean;
  iconSet: boolean;
  linkedToNote: boolean;
  error?: string;
}

/**
 * ユーザーページ作成パラメータ
 */
export interface UserPageParams {
  userId: string;
  userSlug: string;
  noteId: string;
  avatarUrl?: string | null;
  fullName?: string | null;
}

/**
 * ユーザーページが存在するかチェック
 */
export async function checkUserPageExists(
  userId: string, 
  userSlug: string
): Promise<{ exists: boolean; pageId: string | null }> {
  const supabase = await createClient();
  
  const { data: existingPage, error } = await supabase
    .from("pages")
    .select("id")
    .eq("user_id", userId)
    .eq("title", userSlug)
    .single();
    
  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    throw error;
  }
  
  return {
    exists: Boolean(existingPage),
    pageId: existingPage?.id || null
  };
}

/**
 * ユーザーページのデフォルトコンテンツ生成
 */
export function generateUserPageContent(
  userSlug: string,
  avatarUrl?: string | null,
  fullName?: string | null
): JSONContent {
  const displayName = fullName || userSlug;
  const imageUrl = avatarUrl || "/default-avatar.png";
  
  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: displayName }]
      },
      {
        type: "paragraph",
        content: [
          {
            type: "image",
            attrs: {
              src: imageUrl,
              alt: `${displayName}のアバター`,
              title: "ユーザーアイコン"
            }
          }
        ]
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: `こんにちは！${displayName}です。` }
        ]
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "このページは自動的に作成されました。自由に編集してください。" }
        ]
      }
    ]
  };
}

/**
 * ユーザーページを作成または取得し、ノートに紐付け
 */
export async function ensureUserPageInNote(
  params: UserPageParams
): Promise<UserPageResult> {
  const { userId, userSlug, noteId, avatarUrl, fullName } = params;
  
  try {
    // 1. ページ存在確認
    const { exists, pageId: existingPageId } = await checkUserPageExists(userId, userSlug);
    
    let pageId: string;
    let pageCreated = false;
    let iconSet = false;
    
    if (exists && existingPageId) {
      // 既存ページを使用
      pageId = existingPageId;
      console.log(`[ensureUserPageInNote] 既存ユーザーページを使用: ${userSlug} (${pageId})`);
    } else {
      // 新規ページ作成
      const pageContent = generateUserPageContent(userSlug, avatarUrl, fullName);
      
      const newPage = await createPage({
        user_id: userId,
        title: userSlug,
        content_tiptap: pageContent,
        is_public: false, // ユーザーページは基本的に非公開
      }, true); // 自動サムネイル生成を有効
      
      pageId = newPage.id;
      pageCreated = true;
      iconSet = Boolean(avatarUrl); // アバターがあればアイコンが設定された
      
      console.log(`[ensureUserPageInNote] 新規ユーザーページを作成: ${userSlug} (${pageId})`);
    }
    
    // 2. ノートとの紐付け確認・実行
    let linkedToNote = false;
    try {
      await linkPageToNote(noteId, pageId);
      linkedToNote = true;
      console.log(`[ensureUserPageInNote] ノートに紐付け完了: ${noteId} - ${pageId}`);
    } catch (linkError: any) {
      // 既に紐付け済みの場合はエラーを無視
      if (linkError.code === '23505') { // unique constraint violation
        linkedToNote = true;
        console.log(`[ensureUserPageInNote] 既に紐付け済み: ${noteId} - ${pageId}`);
      } else {
        throw linkError;
      }
    }
    
    return {
      pageId,
      pageCreated,
      iconSet,
      linkedToNote,
    };
    
  } catch (error) {
    console.error("[ensureUserPageInNote] エラー:", error);
    throw error;
  }
}

/**
 * ユーザー情報を取得
 */
export async function getUserInfo(userId: string): Promise<{
  userSlug: string | null;
  avatarUrl: string | null;
  fullName: string | null;
}> {
  const supabase = await createClient();
  
  const { data: account, error } = await supabase
    .from("accounts")
    .select("user_slug, avatar_url, full_name")
    .eq("id", userId)
    .single();
    
  if (error) {
    throw error;
  }
  
  return {
    userSlug: account.user_slug,
    avatarUrl: account.avatar_url,
    fullName: account.full_name,
  };
}
```

### 2.2 既存ファイルの修正

#### app/_actions/notes/joinNoteByLink.ts の修正
```typescript
"use server";

import { getSupabaseClient } from "./getSupabaseClient";
import { ensureUserPageInNote, getUserInfo } from "../user-page";

export async function joinNoteByLink(token: string) {
  const supabase = await getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("User not authenticated");

  // 既存のリンク検証・note_shares挿入処理
  const { data: link, error: linkError } = await supabase
    .from("share_links")
    .select("resource_id, resource_type, permission_level, expires_at")
    .eq("token", token)
    .single();
  if (linkError) throw linkError;
  if (link.resource_type !== "note") throw new Error("Invalid resource type");
  if (link.expires_at && new Date(link.expires_at) < new Date())
    throw new Error("Link has expired");

  const { data, error } = await supabase
    .from("note_shares")
    .insert([
      {
        note_id: link.resource_id,
        shared_with_user_id: user.id,
        permission_level: link.permission_level,
      },
    ])
    .select("*")
    .single();
  if (error) throw error;

  // ✅ 新規追加: ユーザーページ自動作成・紐付け
  try {
    const userInfo = await getUserInfo(user.id);
    
    if (userInfo.userSlug) {
      const userPageResult = await ensureUserPageInNote({
        userId: user.id,
        userSlug: userInfo.userSlug,
        noteId: link.resource_id,
        avatarUrl: userInfo.avatarUrl,
        fullName: userInfo.fullName,
      });
      
      console.log("[joinNoteByLink] ユーザーページ処理完了:", userPageResult);
    } else {
      console.warn("[joinNoteByLink] user_slugが未設定のため、ユーザーページを作成できませんでした");
    }
  } catch (userPageError) {
    // ユーザーページ作成エラーはログ出力のみ（ノート参加処理は成功させる）
    console.error("[joinNoteByLink] ユーザーページ作成エラー:", userPageError);
  }

  return data;
}
```

#### app/_actions/notes/joinNotePublic.ts の修正
```typescript
"use server";

import { getSupabaseClient } from "./getSupabaseClient";
import { ensureUserPageInNote, getUserInfo } from "../user-page";

export async function joinNotePublic(slug: string) {
  const supabase = await getSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("User not authenticated");

  // 既存のノート検索・note_shares挿入処理
  const { data: note, error: noteError } = await supabase
    .from("notes")
    .select("id")
    .eq("slug", slug)
    .eq("visibility", "public")
    .single();
  if (noteError || !note) throw noteError;

  const { data, error } = await supabase
    .from("note_shares")
    .insert([
      {
        note_id: note.id,
        shared_with_user_id: user.id,
        permission_level: "editor",
      },
    ])
    .select("*")
    .single();
  if (error) throw error;

  // ✅ 新規追加: ユーザーページ自動作成・紐付け
  try {
    const userInfo = await getUserInfo(user.id);
    
    if (userInfo.userSlug) {
      const userPageResult = await ensureUserPageInNote({
        userId: user.id,
        userSlug: userInfo.userSlug,
        noteId: note.id,
        avatarUrl: userInfo.avatarUrl,
        fullName: userInfo.fullName,
      });
      
      console.log("[joinNotePublic] ユーザーページ処理完了:", userPageResult);
    } else {
      console.warn("[joinNotePublic] user_slugが未設定のため、ユーザーページを作成できませんでした");
    }
  } catch (userPageError) {
    // ユーザーページ作成エラーはログ出力のみ（ノート参加処理は成功させる）
    console.error("[joinNotePublic] ユーザーページ作成エラー:", userPageError);
  }

  return data;
}
```

## 3. エラーハンドリング戦略

### 3.1 エラーの分類と対応

#### 致命的エラー（処理を停止）
- ユーザー認証失敗
- データベース接続エラー
- 不正なパラメータ

#### 非致命的エラー（ログ出力のみ）
- user_slug未設定
- ユーザーページ作成失敗
- ノート紐付け失敗（重複エラー除く）

### 3.2 具体的なエラーハンドリング
```typescript
// 非致命的エラーの処理例
try {
  await ensureUserPageInNote(params);
} catch (error: any) {
  if (error.code === '23505') {
    // unique constraint violation - 既に存在する場合は正常
    console.log("既に存在するリソース:", error.detail);
  } else {
    // その他のエラーはログ出力のみ
    console.error("ユーザーページ処理エラー:", error);
  }
  // ノート参加処理は継続
}
```

## 4. テスト戦略

### 4.1 単体テスト

#### ユーティリティ関数
```typescript
// generateUserPageContent のテスト
describe('generateUserPageContent', () => {
  it('アバターURLありの場合', () => {
    const content = generateUserPageContent('testuser', 'https://example.com/avatar.png', 'Test User');
    expect(content.content[1].content[0].attrs.src).toBe('https://example.com/avatar.png');
  });
  
  it('アバターURLなしの場合', () => {
    const content = generateUserPageContent('testuser', null, 'Test User');
    expect(content.content[1].content[0].attrs.src).toBe('/default-avatar.png');
  });
});
```

#### Server Action
```typescript
// checkUserPageExists のテスト
describe('checkUserPageExists', () => {
  it('存在する場合', async () => {
    // モックデータ準備
    const result = await checkUserPageExists('user-id', 'testuser');
    expect(result.exists).toBe(true);
    expect(result.pageId).toBeDefined();
  });
  
  it('存在しない場合', async () => {
    const result = await checkUserPageExists('user-id', 'nonexistent');
    expect(result.exists).toBe(false);
    expect(result.pageId).toBeNull();
  });
});
```

### 4.2 統合テスト

#### ノート参加フロー
```typescript
describe('joinNoteByLink with user page creation', () => {
  it('新規ユーザーのノート参加', async () => {
    // 1. テストユーザー作成
    // 2. ノート参加トークン生成
    // 3. joinNoteByLink実行
    // 4. ユーザーページ作成確認
    // 5. ノート紐付け確認
  });
  
  it('既存ユーザーのノート参加', async () => {
    // 1. 既存ユーザーページありでテスト
    // 2. 重複作成されないことを確認
  });
});
```

## 5. パフォーマンス考慮事項

### 5.1 データベースアクセス最適化
- `checkUserPageExists`で単一クエリでの存在確認
- `createPage`内の自動サムネイル生成を活用
- トランザクション処理は既存のSupabase RLSに依存

### 5.2 エラー処理の最適化
- 非致命的エラーでの処理継続
- 重複エラーの適切な処理
- ログレベルの適切な設定

## 6. 将来の拡張性

### 6.1 設定可能な項目
- ユーザーページのテンプレート選択
- アイコンサイズの指定
- 公開設定の選択

### 6.2 国際化対応
- デフォルトメッセージの多言語化
- 日付・時刻の地域設定対応

## 7. 実装順序

1. **Step 1**: `app/_actions/user-page.ts`の基本関数実装
2. **Step 2**: `generateUserPageContent`のテスト・調整
3. **Step 3**: `ensureUserPageInNote`の実装・テスト
4. **Step 4**: `joinNoteByLink.ts`の修正・テスト
5. **Step 5**: `joinNotePublic.ts`の修正・テスト
6. **Step 6**: 統合テスト・エラーハンドリング調整
7. **Step 7**: パフォーマンステスト・最適化
