# Phase 4: Server Actions 統合 - 実装状況分析

**作業日**: 2025-10-28
**分析者**: AI Assistant  
**ステータス**: 📊 分析完了

---

## 📋 Phase 4 の目標

`/pages` 専用の Server Actions を廃止し、`/notes` の Actions に統一する。

**具体的には**:
- `getPagesByUser()` を `getNotePages()` に置き換え
- `/api/pages` エンドポイントを削除または `/api/notes/{slug}/pages` に統合
- すべての呼び出し元を修正

---

## 🔍 現在の実装状況

### 1. `getPagesByUser()` の実装

**ファイル**: `app/_actions/pages.ts`

```typescript
export async function getPagesByUser(
	userId: string,
	limit = 100,
	offset = 0,
	sortBy: "updated" | "created" = "updated",
): Promise<{
	pages: Database["public"]["Tables"]["pages"]["Row"][];
	totalCount: number;
}> {
	const supabase = await createClient();
	const sortColumn = sortBy === "updated" ? "updated_at" : "created_at";
	const { data, error, count } = await supabase
		.from("pages")
		.select("*", { count: "exact" })
		.eq("user_id", userId)
		.order(sortColumn, { ascending: false })
		.range(offset, offset + limit - 1);
	if (error) throw error;
	return { pages: data ?? [], totalCount: count ?? 0 };
}
```

**特徴**:
- ユーザーIDで直接フィルタリング
- `pages` テーブルから直接取得
- ノートとの関連を考慮しない

---

### 2. `getNotePages()` の実装

**ファイル**: `app/_actions/notes/getNotePages.ts`

```typescript
export async function getNotePages({
	slug,
	limit,
	offset,
	sortBy,
}: {
	slug: string;
	limit: number;
	offset: number;
	sortBy: "updated" | "created";
}): Promise<{
	pages: Database["public"]["Tables"]["pages"]["Row"][];
	totalCount: number;
}> {
	const supabase = await getSupabaseClient();

	// Handle special "default" slug
	let note: { id: string } | null = null;
	let noteError: Error | null = null;

	if (slug === "default") {
		// Get user's default note by is_default_note flag
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error("User not authenticated");

		const result = await supabase
			.from("notes")
			.select("id")
			.eq("owner_id", user.id)
			.eq("is_default_note", true)
			.maybeSingle();
		note = result.data;
		noteError = result.error;
	} else {
		// Fetch note ID by slug
		const result = await supabase
			.from("notes")
			.select("id")
			.eq("slug", slug)
			.single();
		note = result.data;
		noteError = result.error;
	}

	if (noteError || !note) throw new Error("Note not found");

	// Fetch pages via RPC
	const { data: rpcData, error: rpcError } = await supabase.rpc(
		"get_note_pages",
		{
			p_note_id: note.id,
			p_limit: limit,
			p_offset: offset,
			p_sort: sortBy,
		},
	);
	if (rpcError) throw rpcError;
	const pages = (rpcData?.[0]?.pages ?? []) as Database["public"]["Tables"]["pages"]["Row"][];
	const totalCount = rpcData?.[0]?.total_count ?? 0;
	return { pages, totalCount };
}
```

**特徴**:
- ノート slug でフィルタリング
- `note_page_links` テーブル経由で取得
- `slug = "default"` の特殊処理あり
- RPC `get_note_pages` を使用（高速化）

---

### 3. `getPagesByUser()` の使用箇所

検索結果より、以下の3箇所で使用されていることが判明：

#### 3.1 `/api/pages` エンドポイント

**ファイル**: `app/api/pages/route.ts`

```typescript
export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const userId = searchParams.get("userId");
	const limit = Number(searchParams.get("limit") ?? "100");
	const offset = Number(searchParams.get("offset") ?? "0");
	const sortBy = (searchParams.get("sortBy") as "updated" | "created") || "updated";

	if (!userId) {
		return NextResponse.json({ error: "Missing userId" }, { status: 400 });
	}

	try {
		const { pages, totalCount } = await getPagesByUser(userId, limit, offset, sortBy);
		return NextResponse.json({ pages, totalCount });
	} catch (err) {
		console.error("[API /pages] error", err);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
```

**使用状況**: クライアントコンポーネントから呼び出される

---

#### 3.2 `app/(protected)/pages/_components/my-pages-list.tsx`

**ファイル**: `app/(protected)/pages/_components/my-pages-list.tsx`

```typescript
const fetchPages = useCallback(async (reset = false) => {
	setLoading(true);
	try {
		const res = await fetch(
			`/api/pages?userId=${userId}&limit=${limit}&offset=${reset ? 0 : offset}&sortBy=${sortBy}`,
		);
		const data: PaginatedResult = await res.json();
		// ...
	} catch (err) {
		console.error("MyPagesList fetch error:", err);
	} finally {
		setLoading(false);
	}
}, [userId, sortBy, offset]);
```

**使用状況**: `/api/pages` を間接的に呼び出し

---

#### 3.3 `app/(protected)/pages/_components/pages-list-container.tsx`

**ファイル**: `app/(protected)/pages/_components/pages-list-container.tsx`

```typescript
const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error } = 
	useInfiniteQuery<{ pages: PageRow[]; totalCount: number }, Error>({
		queryKey: ["pages", userId, sortBy],
		queryFn: async ({ pageParam = 0 }) => {
			const res = await fetch(
				`/api/pages?userId=${userId}&limit=${limit}&offset=${pageParam}&sortBy=${sortBy}`,
			);
			if (!res.ok) {
				throw new Error("Failed to fetch pages");
			}
			return res.json();
		},
		// ...
	});
```

**使用状況**: `/api/pages` を間接的に呼び出し（React Query 使用）

---

#### 3.4 `app/(protected)/notes/[slug]/[id]/page.tsx`

**ファイル**: `app/(protected)/notes/[slug]/[id]/page.tsx`

```typescript
const [myPages, sharedPageShares] = await Promise.all([
	getPagesByUser(user.id),
	getSharedPagesByUser(user.id),
]);
const sharedPages = sharedPageShares.map((share) => share.pages);
const allPages = [...(myPages?.pages ?? []), ...(sharedPages ?? [])];
const pagesMap = new Map<string, string>(
	allPages.map((p) => [p.title, p.id]),
);
```

**使用状況**: ページタイトル→IDのマッピング作成のため全ページを取得

---

## 📊 統合の影響範囲

### 直接的な影響

| ファイル | 種類 | 影響度 | 備考 |
|---------|------|--------|------|
| `app/api/pages/route.ts` | API | 🔴 高 | エンドポイント削除または統合 |
| `app/(protected)/pages/_components/my-pages-list.tsx` | Client | 🔴 高 | `/api/pages` を使用 |
| `app/(protected)/pages/_components/pages-list-container.tsx` | Client | 🔴 高 | `/api/pages` を使用 |
| `app/(protected)/notes/[slug]/[id]/page.tsx` | Server | 🟡 中 | Server Action 直接使用 |

### 間接的な影響

| ファイル | 種類 | 影響度 | 備考 |
|---------|------|--------|------|
| `app/(protected)/pages/page-client.tsx` | Client | 🔴 高 | リダイレクト済みだが残存 |
| `app/(protected)/pages/page.tsx` | Server | 🟢 低 | リダイレクト済み |

---

## 🎯 統合戦略

### 戦略1: `/api/pages` を廃止し `/api/notes/default/pages` に統一 ✅ 推奨

**メリット**:
- URL構造が一貫する
- `/notes/{slug}/pages` パターンに統一
- 既存の `/api/notes/[slug]/pages` を活用可能

**デメリット**:
- クライアントコンポーネントの修正が必要

**実装手順**:
1. クライアントコンポーネントで `/api/pages` → `/api/notes/default/pages` に変更
2. `/api/pages/route.ts` を削除
3. テスト実行

---

### 戦略2: `/api/pages` を `/api/notes/default/pages` へのエイリアスとして維持

**メリット**:
- 既存コードの変更が最小限

**デメリット**:
- 冗長な実装が残る
- 保守性が低下

**評価**: ❌ 推奨しない

---

### 戦略3: `getPagesByUser()` を `getNotePages({ slug: "default", ... })` のラッパーに変更

**メリット**:
- 既存のインターフェースを維持
- 段階的な移行が可能

**デメリット**:
- 冗長な関数が残る
- 最終的には削除が必要

**評価**: ⚠️ 暫定的な手段として有効

---

## 🚧 実装の課題

### 課題1: `app/(protected)/pages/_components/` の扱い

**現状**:
- `/pages` ルートはリダイレクト済み
- しかし `_components/` 配下のコンポーネントはまだ残存

**問題点**:
- `my-pages-list.tsx` と `pages-list-container.tsx` は実質的に使用されていない
- しかし、ファイルとしては存在している

**解決策**:
1. Phase 5 で削除予定
2. Phase 4 では参照を `/notes/[slug]/_components/` に統一

---

### 課題2: `app/(protected)/notes/[slug]/[id]/page.tsx` での全ページ取得

**現状**:
```typescript
const [myPages, sharedPageShares] = await Promise.all([
	getPagesByUser(user.id),
	getSharedPagesByUser(user.id),
]);
```

**問題点**:
- ページタイトル→IDマッピング作成のため全ページを取得
- `getPagesByUser()` は直接 `pages` テーブルから取得（高速）
- `getNotePages({ slug: "default" })` は `note_page_links` 経由（やや遅い）

**解決策案**:

#### 案1: `getNotePages()` を使用
```typescript
const { pages: myPages } = await getNotePages({
	slug: "default",
	limit: 10000, // 全件取得
	offset: 0,
	sortBy: "updated",
});
```

**メリット**: 統一性が高い
**デメリット**: パフォーマンス低下の可能性

#### 案2: 新しい専用関数を作成
```typescript
// app/_actions/notes/getAllUserPages.ts
export async function getAllUserPages(userId: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("pages")
		.select("id, title")
		.eq("user_id", userId);
	if (error) throw error;
	return data;
}
```

**メリット**: パフォーマンスが最適
**デメリット**: 新しい関数が増える

#### 案3: デフォルトノートのページを直接取得
```typescript
const { data: defaultNote } = await supabase
	.from("notes")
	.select("id")
	.eq("owner_id", user.id)
	.eq("is_default_note", true)
	.single();

const { data: myPages } = await supabase
	.from("pages")
	.select("id, title")
	.in("id", (
		await supabase
			.from("note_page_links")
			.select("page_id")
			.eq("note_id", defaultNote.id)
	).data.map(l => l.page_id));
```

**メリット**: デフォルトノートと整合性がある
**デメリット**: クエリが複雑

**推奨**: 案2（専用関数作成）- パフォーマンスと保守性のバランスが最適

---

## 📝 Phase 4 実装計画（詳細版）

### Step 1: クライアントコンポーネントの修正

#### 1.1 `my-pages-list.tsx` の修正

**ファイル**: `app/(protected)/pages/_components/my-pages-list.tsx`

**変更内容**:
```typescript
// Before
const res = await fetch(
	`/api/pages?userId=${userId}&limit=${limit}&offset=${reset ? 0 : offset}&sortBy=${sortBy}`,
);

// After
const res = await fetch(
	`/api/notes/default/pages?limit=${limit}&offset=${reset ? 0 : offset}&sortBy=${sortBy}`,
);
```

**注意点**:
- このファイルは Phase 5 で削除予定
- 実際には使用されていない可能性が高い（リダイレクト済み）

---

#### 1.2 `pages-list-container.tsx` の修正

**ファイル**: `app/(protected)/pages/_components/pages-list-container.tsx`

**変更内容**:
```typescript
// Before
queryFn: async ({ pageParam = 0 }) => {
	const res = await fetch(
		`/api/pages?userId=${userId}&limit=${limit}&offset=${pageParam}&sortBy=${sortBy}`,
	);
	if (!res.ok) {
		throw new Error("Failed to fetch pages");
	}
	return res.json();
},

// After
queryFn: async ({ pageParam = 0 }) => {
	const res = await fetch(
		`/api/notes/default/pages?limit=${limit}&offset=${pageParam}&sortBy=${sortBy}`,
	);
	if (!res.ok) {
		throw new Error("Failed to fetch pages");
	}
	return res.json();
},
```

**注意点**:
- queryKey も変更が必要
```typescript
// Before
queryKey: ["pages", userId, sortBy],

// After
queryKey: ["note-pages", "default", sortBy],
```

---

### Step 2: Server Component の修正

#### 2.1 `app/(protected)/notes/[slug]/[id]/page.tsx` の修正

**ファイル**: `app/(protected)/notes/[slug]/[id]/page.tsx`

**オプション1**: 新しい専用関数を作成 ✅ 推奨

```typescript
// 1. app/_actions/notes/getAllUserPages.ts を作成
export async function getAllUserPages(userId: string): Promise<Array<{ id: string; title: string }>> {
	const supabase = await getSupabaseClient();
	const { data, error } = await supabase
		.from("pages")
		.select("id, title")
		.eq("user_id", userId);
	if (error) throw error;
	return data ?? [];
}

// 2. page.tsx で使用
import { getAllUserPages } from "@/app/_actions/notes/getAllUserPages";

const [myPages, sharedPageShares] = await Promise.all([
	getAllUserPages(user.id),
	getSharedPagesByUser(user.id),
]);
```

**オプション2**: `getNotePages()` を使用

```typescript
import { getNotePages } from "@/app/_actions/notes";

const { pages: myPages } = await getNotePages({
	slug: "default",
	limit: 10000, // 全件取得
	offset: 0,
	sortBy: "updated",
});
```

**推奨**: オプション1（専用関数）

---

### Step 3: `/api/pages` エンドポイントの削除

#### 3.1 ファイル削除

**ファイル**: `app/api/pages/route.ts`

**手順**:
1. Step 1, 2 が完了していることを確認
2. `grep -r "/api/pages" app/` で残存参照を確認
3. ファイルを削除
4. `bun dev` でエラーがないことを確認

---

### Step 4: `getPagesByUser()` の削除または非推奨化

#### オプション1: 完全削除 ✅ 推奨

**ファイル**: `app/_actions/pages.ts`

**手順**:
1. Step 1-3 が完了していることを確認
2. `grep -r "getPagesByUser" app/` で残存参照を確認
3. 関数を削除
4. テスト実行

---

#### オプション2: 非推奨化（段階的移行）

```typescript
/**
 * @deprecated Use getNotePages({ slug: "default", ... }) instead
 * This function will be removed in Phase 5.
 */
export async function getPagesByUser(
	userId: string,
	limit = 100,
	offset = 0,
	sortBy: "updated" | "created" = "updated",
): Promise<{
	pages: Database["public"]["Tables"]["pages"]["Row"][];
	totalCount: number;
}> {
	// Redirect to getNotePages
	const { getNotePages } = await import("./notes/getNotePages");
	return getNotePages({ slug: "default", limit, offset, sortBy });
}
```

---

## ✅ 実装チェックリスト

### Step 1: クライアントコンポーネント修正
- [ ] `my-pages-list.tsx` の `/api/pages` → `/api/notes/default/pages` 変更
- [ ] `pages-list-container.tsx` の `/api/pages` → `/api/notes/default/pages` 変更
- [ ] queryKey の変更
- [ ] ローカルで動作確認

### Step 2: Server Component 修正
- [ ] `getAllUserPages()` 関数を作成
- [ ] `app/(protected)/notes/[slug]/[id]/page.tsx` で使用
- [ ] ローカルで動作確認

### Step 3: API エンドポイント削除
- [ ] Step 1, 2 完了確認
- [ ] `grep -r "/api/pages" app/` で残存参照確認
- [ ] `app/api/pages/route.ts` を削除
- [ ] ビルドエラー確認

### Step 4: Server Action 削除
- [ ] Step 1-3 完了確認
- [ ] `grep -r "getPagesByUser" app/` で残存参照確認
- [ ] `getPagesByUser()` を削除
- [ ] テスト実行

### Step 5: 総合テスト
- [ ] `/notes/default` でページ一覧が正しく表示される
- [ ] `/notes/default/[id]` で個別ページが正しく表示される
- [ ] ページリンクが正しく機能する
- [ ] 無限スクロールが正常に動作する
- [ ] ソート機能が正常に動作する

---

## 🧪 テスト項目

### ユニットテスト
- [ ] `getAllUserPages()` のテスト
  - 正常系: ユーザーIDで全ページを取得
  - 異常系: ユーザーが存在しない
  - 異常系: ページが0件

### 統合テスト
- [ ] `/api/notes/default/pages` のテスト
  - 正常系: ページネーション動作
  - 正常系: ソート動作
  - 異常系: 認証エラー

### E2Eテスト
- [ ] `/notes/default` アクセス
- [ ] ページ一覧表示
- [ ] 無限スクロール
- [ ] ページ詳細表示
- [ ] ページリンク機能

---

## 📊 リスク評価

| リスク項目 | 発生確率 | 影響度 | 対策 |
|-----------|---------|--------|------|
| API エンドポイント変更によるクライアント側エラー | 🟡 中 | 🔴 高 | 段階的にリファクタリング、テスト強化 |
| パフォーマンス低下 | 🟢 低 | 🟡 中 | `getAllUserPages()` で最適化 |
| 既存の参照漏れ | 🟡 中 | 🟡 中 | grep 検索で徹底確認 |
| ビルドエラー | 🟢 低 | 🔴 高 | TypeScript 型チェック |

**総合リスク評価**: 🟡 中

**対策**:
- 段階的な実装（Step 1 → 2 → 3 → 4）
- 各ステップでテスト実行
- ロールバック計画を準備

---

## 🔄 ロールバック計画

### Step 1-2 のロールバック
```bash
git revert <commit-hash>
```

### Step 3-4 のロールバック
```bash
# ファイル復元
git checkout HEAD~1 -- app/api/pages/route.ts
git checkout HEAD~1 -- app/_actions/pages.ts
```

---

## 📈 期待される効果

### コードの削減
- `/api/pages/route.ts` 削除: 約30行
- `getPagesByUser()` 削除: 約20行
- **合計**: 約50行のコード削減

### 保守性の向上
- API エンドポイントが統一される
- Server Actions が統一される
- `/notes` 配下に機能が集約される

### パフォーマンス
- `getAllUserPages()` により最適化
- RPC `get_note_pages` の活用

---

## 📝 次のアクション

### 即座に実施
1. `getAllUserPages()` 関数を作成
2. Step 1: クライアントコンポーネント修正
3. Step 2: Server Component 修正
4. ローカルで動作確認

### 順次実施
5. Step 3: API エンドポイント削除
6. Step 4: Server Action 削除
7. 総合テスト実行
8. Phase 4 完了レポート作成

---

## 🔗 関連ドキュメント

- [Phase 1-3 完了レポート](./20251028_04_pages-notes-consolidation-final.md)
- [実装計画](../../03_plans/pages-notes-consolidation/20251028_01_implementation-plan.md)
- [設計ドキュメント](../../02_research/2025_10/20251028_02_default-note-design.md)

---

**作成者**: AI Assistant (GitHub Copilot)
**最終更新**: 2025-10-28
**ステータス**: 📊 分析完了
