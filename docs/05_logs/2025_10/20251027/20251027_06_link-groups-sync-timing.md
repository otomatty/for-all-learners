# リンクグループ同期タイミング分析

**日付**: 2025-10-27

---

## 🔄 現在の同期タイミング

### 1. ページ作成時（`createPage`）

**ファイル**: `app/_actions/pages.ts` (66行目)

```typescript
export async function createPage(page, autoGenerateThumbnail = true) {
  // ... ページ挿入 ...
  
  // 1. Sync link groups for the new page
  if (data.content_tiptap) {
    await syncLinkGroupsForPage(data.id, data.content_tiptap as JSONContent);
  }
  
  // 2. Connect link groups that match this page title
  const normalizedKey = normalizeTitleToKey(data.title);
  await connectLinkGroupToPage(normalizedKey, data.id);
}
```

**発火条件**:
- ✅ 新しいページが作成されたとき
- ✅ ページにリンクが含まれている場合

---

### 2. ページ更新時（`updatePage`）

**ファイル**: `app/_actions/updatePage.ts` (134行目)

```typescript
export async function updatePage({ id, title, content, ... }) {
  // ... ページ更新 ...
  
  // 5) Phase 1 (Link Group): Sync link groups for this page
  await syncLinkGroupsForPage(id, parsedContent);
}
```

**発火条件**:
- ✅ ページが編集されて保存されたとき
- ✅ 自動保存（2秒のデバウンス）が実行されたとき
- ✅ 手動保存（Ctrl+S / Cmd+S）されたとき

---

### 3. ページ削除時

**ファイル**: `app/_actions/pages.ts`

```typescript
export async function deletePage(id: string) {
  // Delete link groups for this page
  await deleteLinkGroupsForPage(id);
  // ... ページ削除 ...
}
```

**発火条件**:
- ✅ ページが削除されたとき

---

## ❌ 既存ページに対する同期が不足

### 問題点

**既存のページ（すでに作成済み）**に対しては、以下の場合のみ同期される：
- ページを**再編集して保存**したとき
- → つまり、**何も変更せずに存在しているページは同期されない**

### 影響

既存のページに `[[リンク]]` が含まれていても：
- ❌ データベースの `link_groups` テーブルにデータがない
- ❌ `link_occurrences` テーブルにデータがない
- ❌ リンクグループとして表示されない

---

## 💡 解決策：バッチ同期機能の実装

### オプション1: 全ページ一括同期（管理者向け）

**実装場所**: `app/_actions/syncLinkGroups.ts`

```typescript
/**
 * Sync link groups for all pages (batch operation)
 * Use this for initial migration or periodic maintenance
 */
export async function syncAllLinkGroups(): Promise<{
  success: boolean;
  processed: number;
  errors: number;
}> {
  try {
    const supabase = await createClient();
    
    // Get all pages with content
    const { data: pages, error } = await supabase
      .from('pages')
      .select('id, content_tiptap')
      .not('content_tiptap', 'is', null);
    
    if (error || !pages) {
      throw error;
    }
    
    let processed = 0;
    let errors = 0;
    
    for (const page of pages) {
      try {
        await syncLinkGroupsForPage(
          page.id, 
          page.content_tiptap as JSONContent
        );
        processed++;
        logger.info({ pageId: page.id }, 'Synced link groups');
      } catch (error) {
        errors++;
        logger.error({ pageId: page.id, error }, 'Failed to sync');
      }
    }
    
    logger.info({ processed, errors }, 'Batch sync completed');
    
    return { success: true, processed, errors };
  } catch (error) {
    logger.error({ error }, 'Batch sync failed');
    return { success: false, processed: 0, errors: 0 };
  }
}
```

**使用方法**:
```typescript
// 管理者画面から実行
// または、スクリプトとして実行
import { syncAllLinkGroups } from '@/app/_actions/syncLinkGroups';

const result = await syncAllLinkGroups();
console.log(`Processed: ${result.processed}, Errors: ${result.errors}`);
```

---

### オプション2: ページ表示時に同期（自動）

**実装場所**: `app/(protected)/pages/[id]/page.tsx`

```typescript
export default async function PageDetailPage({ params }) {
  const page = await getPageById(id);
  
  // Check if this page has been synced
  const needsSync = await checkIfPageNeedsSync(page.id);
  
  if (needsSync) {
    // Sync in background (don't block page rendering)
    syncLinkGroupsForPage(page.id, page.content_tiptap)
      .catch(error => {
        logger.error({ pageId: page.id, error }, 'Background sync failed');
      });
  }
  
  // ... rest of page ...
}
```

**メリット**:
- ✅ ユーザーが既存ページを開いたときに自動同期
- ✅ 手動操作不要
- ✅ 段階的に全ページが同期される

**デメリット**:
- ⚠️ 初回表示時にわずかな遅延
- ⚠️ すべてのページが開かれるまで完全に同期されない

---

### オプション3: マイグレーションスクリプト（推奨）

**実装場所**: `scripts/migrate-link-groups.ts`

```typescript
#!/usr/bin/env bun

import { createClient } from '@/lib/supabase/server';
import { syncLinkGroupsForPage } from '@/app/_actions/syncLinkGroups';
import type { JSONContent } from '@tiptap/core';

async function main() {
  console.log('🔄 Starting link groups migration...');
  
  const supabase = await createClient();
  
  const { data: pages, error } = await supabase
    .from('pages')
    .select('id, title, content_tiptap')
    .not('content_tiptap', 'is', null);
  
  if (error || !pages) {
    console.error('❌ Failed to fetch pages:', error);
    process.exit(1);
  }
  
  console.log(`📄 Found ${pages.length} pages to process`);
  
  let processed = 0;
  let errors = 0;
  
  for (const page of pages) {
    try {
      await syncLinkGroupsForPage(
        page.id,
        page.content_tiptap as JSONContent
      );
      processed++;
      console.log(`✅ [${processed}/${pages.length}] Synced: ${page.title}`);
    } catch (error) {
      errors++;
      console.error(`❌ Failed to sync: ${page.title}`, error);
    }
  }
  
  console.log('\n📊 Migration completed:');
  console.log(`  ✅ Processed: ${processed}`);
  console.log(`  ❌ Errors: ${errors}`);
}

main();
```

**実行方法**:
```bash
bun run scripts/migrate-link-groups.ts
```

---

## 📋 推奨実装順序

### Phase 1: 即座に対応（今すぐ）

1. **マイグレーションスクリプトを作成**
   - 既存ページを一括で同期
   - 一度実行すれば完了

2. **スクリプトを実行**
   - すべての既存ページのリンクグループを生成

### Phase 2: 将来的な改善

1. **ページ表示時の自動同期**
   - 同期漏れを防ぐ
   - バックグラウンドで実行

2. **管理画面に同期ボタン追加**
   - 管理者が手動で再同期可能
   - トラブル時の対応用

---

## ✅ 今すぐ実装すべきこと

最も簡単で効果的な方法：

### マイグレーションスクリプトの作成

```bash
# スクリプトを作成
touch scripts/migrate-link-groups.ts

# 実行
bun run scripts/migrate-link-groups.ts
```

このスクリプトを実行すると：
1. すべての既存ページのリンクを抽出
2. `link_groups` テーブルにデータを挿入
3. `link_occurrences` テーブルにデータを挿入
4. → リンクグループが表示されるようになる

---

**最終更新**: 2025-10-27
