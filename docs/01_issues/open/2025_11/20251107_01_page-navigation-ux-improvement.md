# ページ一覧からのページ遷移UX改善

**作成日**: 2025-11-07  
**優先度**: 🔴 High  
**ステータス**: 📋 Open  
**カテゴリ**: UX改善 / モバイル対応

---

## 📋 問題の要約

### 現在の問題点

1. **視覚的フィードバックの欠如**
   - ページカードをクリックしても、どのページをクリックしたのかがわかりにくい
   - 特にスマートフォンでタップした際の反応が不明確

2. **遷移の遅延**
   - ページ詳細はサーバーコンポーネントでデータ取得が完了するまで何も表示されない
   - ローディング状態が表示されないため、ユーザーは「反応がない」と感じる

3. **フルページリロード**
   - `window.location.href` を使用している箇所があり、フルページリロードが発生
   - クライアントサイドナビゲーションの恩恵を受けられない

---

## 🎯 改善目標

1. **即座の視覚的フィードバック**: クリックしたページを即座にハイライト
2. **即座のページ遷移**: クリックと同時にページ遷移を開始
3. **ローディング状態の表示**: データ取得中にスケルトンUIを表示
4. **スムーズなナビゲーション**: クライアントサイドナビゲーションを活用

---

## 🔍 現在の実装状況

### 関連ファイル

#### 1. ページ一覧コンポーネント
- **ファイル**: `components/notes/PagesList/PagesList.tsx`
- **実装**: Next.js の `<Link>` コンポーネントを使用
- **問題**: クリック時の視覚的フィードバックがない

```91:94:components/notes/PagesList/PagesList.tsx
				<Link
					key={page.id}
					href={`/notes/${encodeURIComponent(slug)}/${encodeURIComponent(page.id)}`}
				>
```

#### 2. ページ詳細ページ
- **ファイル**: `app/(protected)/notes/[slug]/[id]/page.tsx`
- **実装**: サーバーコンポーネントでデータ取得
- **問題**: ローディング状態の表示がない（`loading.tsx` が存在しない）

#### 3. ナビゲーション関数
- **ファイル**: `lib/unilink/resolver/navigation.ts`
- **実装**: `window.location.href` を使用
- **問題**: フルページリロードが発生

```36:58:lib/unilink/resolver/navigation.ts
export function navigateToPageWithContext(
	pageId: string,
	noteSlug?: string | null,
	isNewPage = false,
): void {
	try {
		if (typeof window !== "undefined") {
			const queryParam = isNewPage ? "?newPage=true" : "";

			const href = noteSlug
				? `/notes/${encodeURIComponent(noteSlug)}/${pageId}${queryParam}`
				: `/notes/default/${pageId}${queryParam}`;

			window.location.href = href;
		}
	} catch (error) {
		logger.error(
			{ pageId, noteSlug, isNewPage, error },
			"[UnifiedResolver] Navigation failed",
		);
		toast.error("ページの表示に失敗しました");
	}
}
```

---

## 💡 改善案

### アプローチ 1: 段階的改善（推奨）

#### Phase 1: ローディング状態の追加

1. **`loading.tsx` の作成**
   - `app/(protected)/notes/[slug]/[id]/loading.tsx` を作成
   - ページ詳細のスケルトンUIを表示

2. **視覚的フィードバックの追加**
   - `PagesList.tsx` でクリック時にローディング状態を表示
   - クリックしたカードをハイライト

#### Phase 2: クライアントサイドナビゲーション

1. **`PagesList.tsx` の改善**
   - `useRouter()` と `router.push()` を使用
   - `useTransition()` でローディング状態を管理

2. **ナビゲーション関数の改善**
   - `navigateToPageWithContext()` を `router.push()` ベースに変更

#### Phase 3: プリフェッチの活用

1. **リンクのプリフェッチ**
   - Next.js の `<Link>` の `prefetch` プロパティを活用
   - ホバー時にデータを事前取得

---

### アプローチ 2: オプティミスティックUI（上級）

1. **即座のページ表示**
   - ページ一覧で既に取得済みのデータ（タイトル、サムネイル）を即座に表示
   - 詳細データは後から取得して更新

2. **スワイプナビゲーション**
   - モバイルでスワイプで前後のページに移動

---

## 📝 実装詳細

### 1. ローディング状態の追加

#### `app/(protected)/notes/[slug]/[id]/loading.tsx`

```tsx
import { Container } from "@/components/layouts/container";
import { BackLink } from "@/components/ui/back-link";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function PageDetailLoading() {
	return (
		<Container>
			<BackLink title="ページ一覧に戻る" path="#" />
			<Card className="mt-4">
				<CardHeader>
					<Skeleton className="h-8 w-64" />
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-3/4" />
					</div>
				</CardContent>
			</Card>
		</Container>
	);
}
```

### 2. PagesList の改善

#### `components/notes/PagesList/PagesList.tsx` の変更

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// ... other imports

export function PagesList({
	pages,
	slug = "all-pages",
	gridCols = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
}: PagesListProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [clickedPageId, setClickedPageId] = useState<string | null>(null);

	const handlePageClick = (pageId: string) => {
		setClickedPageId(pageId);
		startTransition(() => {
			router.push(`/notes/${encodeURIComponent(slug)}/${encodeURIComponent(pageId)}`);
		});
	};

	// ... rest of component

	return (
		<div className={`grid gap-2 md:gap-4 ${gridCols}`}>
			{pages.map((page) => (
				<Card
					key={page.id}
					onClick={() => handlePageClick(page.id)}
					className={cn(
						"h-full overflow-hidden transition-all hover:shadow-md py-4 gap-2 cursor-pointer",
						clickedPageId === page.id && "ring-2 ring-primary",
						isPending && clickedPageId === page.id && "opacity-50"
					)}
				>
					{/* ... card content */}
				</Card>
			))}
		</div>
	);
}
```

### 3. ナビゲーション関数の改善

#### `lib/unilink/resolver/navigation.ts` の変更

```tsx
import { useRouter } from "next/navigation";

// Client-side navigation hook
export function useNavigateToPage() {
	const router = useRouter();
	
	return (pageId: string, noteSlug?: string | null, isNewPage = false) => {
		const queryParam = isNewPage ? "?newPage=true" : "";
		const href = noteSlug
			? `/notes/${encodeURIComponent(noteSlug)}/${pageId}${queryParam}`
			: `/notes/default/${pageId}${queryParam}`;
		
		router.push(href);
	};
}

// Server-side navigation (fallback)
export function navigateToPageWithContext(
	pageId: string,
	noteSlug?: string | null,
	isNewPage = false,
): void {
	// ... existing implementation for server-side use
}
```

---

## ✅ 期待される効果

1. **UXの向上**
   - クリックしたページが即座にハイライトされる
   - ローディング状態が明確に表示される
   - スムーズなページ遷移

2. **パフォーマンスの向上**
   - クライアントサイドナビゲーションによる高速化
   - プリフェッチによる事前データ取得

3. **モバイル体験の改善**
   - タップ時の視覚的フィードバックが明確
   - ローディング状態が分かりやすい

---

## 🔗 関連ファイル

- `components/notes/PagesList/PagesList.tsx` - ページ一覧コンポーネント
- `app/(protected)/notes/[slug]/[id]/page.tsx` - ページ詳細ページ
- `lib/unilink/resolver/navigation.ts` - ナビゲーション関数
- `lib/tiptap-extensions/unified-link-mark/plugins/click-handler-plugin.ts` - リンククリックハンドラー

---

## 📌 実装優先度

1. **Phase 1（高優先度）**: ローディング状態の追加
2. **Phase 2（中優先度）**: クライアントサイドナビゲーション
3. **Phase 3（低優先度）**: プリフェッチの最適化

---

## 🧪 テスト項目

- [ ] ページカードをクリックした際に即座にハイライトされる
- [ ] ページ遷移中にローディング状態が表示される
- [ ] データ取得完了後にページが正しく表示される
- [ ] モバイルデバイスでタップ時の反応が明確
- [ ] エラー時の適切な処理

