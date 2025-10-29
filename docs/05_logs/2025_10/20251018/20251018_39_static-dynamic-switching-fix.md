# 🔧 Static/Dynamic 切り替わり問題の修正 - 2025-10-18

## 📍 問題の特定

`next dev` ツールのパネルで **static ↔ dynamic が無限に切り替わっていた**原因を特定しました。

### 根本原因

1. **キャッシュ設定の不完全さ**
   - ページコンポーネント `app/(protected)/pages/[id]/page.tsx` に `export const dynamic = "force-dynamic";` は設定されていた
   - しかし `export const dynamicParams = true;` が欠落していた

2. **revalidatePathの欠落**
   - `autoSetThumbnailOnPageView()` でデータベースを更新してもキャッシュ無効化 (`revalidatePath`) がなかった
   - 更新後、Next.js がデータ変更を検出 → 動的評価に切り替え
   - しかし無効化がないため、再度static判定に戻る → 無限ループ

3. **データベース更新による暗黙的な再評価**
   - サムネイル自動設定時に `pages` テーブルを更新
   - Supabase リアルタイムが変更を通知
   - ページが再評価される

---

## ✅ 実施した修正

### 修正 1: `dynamicParams` 設定を追加

**ファイル**: `app/(protected)/pages/[id]/page.tsx`

```typescript
// Disable static caching for dynamic page content
// This page fetches user-specific data from Supabase, so it must be rendered dynamically
export const dynamic = "force-dynamic";

// Allow dynamic params to be generated at request time
// Without this, Next.js may try to prerender static params during build
export const dynamicParams = true;
```

**効果**:
- 動的パラメータ `[id]` が静的プリレンダリングの対象にならない
- すべてのリクエストで動的に処理される

### 修正 2: `revalidatePath` を追加

**ファイル**: `app/_actions/autoSetThumbnail.ts`

```typescript
// Revalidate the page cache after thumbnail update
revalidatePath(`/pages/${pageId}`);
```

**効果**:
- サムネイル更新後、キャッシュが明示的に無効化される
- Next.js が統一的にキャッシュ管理できるようになる
- static ↔ dynamic の無限ループを防止

---

## 🔍 動作原理

### Before (問題あり)

```
1. ページ表示 (dynamic = force-dynamic)
2. autoSetThumbnailOnPageView() でDBを更新
3. Next.js がデータ変更を検出
4. キャッシュ無効化がないため、次のリクエストで再判定
5. データは更新されたまま → static と判定
6. 数ミリ秒後、DBから新しいデータを読み込む
7. 前回と同じデータ → dynamic に変更
8. 1 に戻る → 無限ループ
```

### After (修正後)

```
1. ページ表示 (dynamic = force-dynamic, dynamicParams = true)
2. autoSetThumbnailOnPageView() でDBを更新
3. revalidatePath で明示的にキャッシュ無効化
4. 次のリクエストで、キャッシュなしで新しいデータを取得
5. ページが安定して rendering される
```

---

## 📋 テスト項目

- [ ] ページ遷移時に static ↔ dynamic が切り替わらないことを確認
- [ ] next dev ツールパネルで page type が一定に保たれることを確認
- [ ] サムネイル自動設定後に、次のリクエストで反映されることを確認
- [ ] ページ切り替え時に、前のページのキャッシュが使われないことを確認
- [ ] パフォーマンス（レスポンス時間）が安定していることを確認

---

## 📚 関連ドキュメント

- 前回の無限ループ問題: `docs/08_worklogs/2025_10/20251018_01_infinite-post-loop.md`
- IntersectionObserver 修正: `docs/08_worklogs/2025_10/20251018_30_intersectionobserver-cleanup-fix.md`
- キャッシング問題: `docs/issues/open/20251018_02_missing-cache-config.md`

---

## 🎯 重要度

**High** - パフォーマンスと安定性に直結する問題

---

## 作成日

2025-10-18
