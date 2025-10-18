# 無限 POST 問題調査：Route の Dynamic/Static 切り替え - 2025-10-18

## 現象

開発モード（`bun dev`）でページエディタ（`/pages/[id]`）を開くと、Next.js DevTools パネルで route が `dynamic` ↔ `static` を**高速で無限に切り替わる**状態が発生。

## 根本原因の特定

### 1. ページコンポーネントの問題

**ファイル**: `app/(protected)/pages/[id]/page.tsx`

**問題点**:

- キャッシング設定が**全くない**
- 複数の Supabase クエリが毎回実行される
- `export const dynamic` や `export const revalidate` が設定されていない

**実行されるクエリ**:

1. `getUser()` - ユーザー情報取得
2. `supabase.from("pages").select("*")` - ページデータ取得
3. `getPagesByUser(user.id)` - ユーザーの全ページ取得
4. `getSharedPagesByUser(user.id)` - 共有ページ取得
5. ページリンク関連の複数クエリ
6. 被リンクページの取得クエリ

### 2. Next.js のキャッシング動作

データがキャッシングされていないため、以下のサイクルが発生：

```
1. ブラウザがリクエスト送信
   ↓
2. Server Component が実行（全クエリ実行）
   ↓
3. 結果がキャッシュされない（dynamic ページと判定）
   ↓
4. DevTools が `route: static → dynamic → static...` と表示
   ↓
5. Next.js が cache invalidation のサイクルを回す
   ↓
6. 無限ループ状態へ
```

### 3. 前回の修正との関係

前回は `auto-reconciler.ts` の `rebuild()` を削除し、無限 POST ループを改善しました。しかし、**root cause** は別にありました：

- `rebuild()` 削除 → auto-reconciler の無限ループは止まった
- しかし、Server Component のキャッシング問題は残存
- これが新たに dynamic/static の切り替えループを引き起こしている

## 実施した修正

### 修正 1: `export const dynamic = "force-dynamic"` を追加

**ファイル**: `app/(protected)/pages/[id]/page.tsx`

```typescript
// Disable static caching for dynamic page content
// This page fetches user-specific data from Supabase, so it must be rendered dynamically
export const dynamic = "force-dynamic";
```

**理由**:

- このページは常にユーザー固有のデータを扱うため、静的キャッシングは不適切
- 明示的に `force-dynamic` を指定することで、Next.js の自動判定を回避
- 予測不可能な cache invalidation サイクルを排除

### 修正 2: `.next/cache` を削除

```bash
rm -rf .next/cache
```

**理由**:

- 開発環境の古いキャッシュが残っていた可能性
- キャッシュを完全にリセットして、新しい設定で実行

## 期待される効果

✅ route が `dynamic` に固定される
✅ DevTools パネルで dynamic/static の切り替わりが止まる
✅ 無限ループが発生しない
✅ ページ読み込みが安定する

## 詳細なコード分析

### 検査したファイル

1. **`app/(protected)/pages/[id]/page.tsx`** (Server Component)

   - キャッシング設定なし → ✅ `export const dynamic = "force-dynamic"` を追加

2. **`app/(protected)/pages/[id]/_components/edit-page-form.tsx`** (Client Component)

   - 無限リロードなし
   - 複数の server action を呼び出し

3. **`app/(protected)/pages/[id]/_hooks/useEditorInitializer.ts`** (Hook)

   - ✅ 前回修正済（`preloadedRef` フラグで preloadPageTitles を 1 回のみ実行）
   - 状態良好

4. **`app/(protected)/pages/[id]/_hooks/useAutoSave.ts`** (Hook)

   - ✅ 前回修正済（`MIN_SAVE_INTERVAL = 3000ms`, 複数保存防止）
   - 状態良好

5. **`app/_actions/updatePage.ts`** (Server Action)
   - revalidatePath なし
   - データ更新後、自動的に Server Component が再実行される
   - 状態良好（revalidatePath は不要）

### 問題の根本原因（推測）

## 次のステップ

- [ ] 修正後の動作確認（DevTools で route が安定するか）
- [ ] ページ読み込み速度の測定
- [ ] ページ編集時の POST リクエストが正常か確認
- [ ] 本番環境（`npm run build && npm run start`）での動作確認

## 技術的背景

### Next.js の Dynamic Route 判定

Next.js は以下の条件で route を dynamic と判定：

- Cookies, Headers などの動的要素の使用
- `useSearchParams`, `useHeaders` などの dynamic API
- Server Action の実行
- キャッシング設定がない Supabase クエリ実行

### 問題のあるパターン

```typescript
// ❌ これはキャッシングされない（毎回実行）
export default async function PageDetail() {
  const data = await supabase.from("pages").select("*");
  // ...
}
```

### 修正後のパターン

```typescript
// ✅ これは明示的に dynamic と宣言
export const dynamic = "force-dynamic";

export default async function PageDetail() {
  const data = await supabase.from("pages").select("*");
  // キャッシング動作が一定になる
}
```

## 関連ドキュメント

- 前回の修正: `docs/08_worklogs/2025_10/20251018_34_final-summary.md`
- 無限ループバグ: `docs/issues/open/20251018_01_infinite-editor-preload-loop.md`
- 無限 POST デバッグ: `docs/08_worklogs/2025_10/20251018_37_infinite-post-debug-checklist.md`

## 作成日

2025-10-18 14:45 JST
