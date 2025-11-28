# Notes New Page 静的エクスポート対応 - 2025-01-25

## 📍 問題の概要

Next.jsの静的エクスポート（`output: "export"`）時に、`/notes/[slug]/new`と`/notes/default/new`の動的ルートで以下のエラーが発生：

```
Error: Page "/notes/[slug]/new" is missing "generateStaticParams()" so it cannot be used with "output: export" config.
```

## 🔍 原因

1. **ルートハンドラとページの競合**
   - `app/(protected)/notes/[slug]/new/route.ts`と`page.tsx`が同じパスに存在
   - Next.jsは同じパスに`route.ts`と`page.tsx`の両方を許可しない

2. **静的エクスポートでのルートハンドラの制限**
   - 静的エクスポートでは`route.ts`（API Route）は使用できない
   - 動的ルートには`generateStaticParams()`が必要

3. **`dynamicParams`の制限**
   - `dynamicParams: true`は静的エクスポートでは使用できない

## ✅ 実施した修正

### 1. ルートハンドラの削除

**削除したファイル:**
- `app/(protected)/notes/[slug]/new/route.ts`
- `app/(protected)/notes/default/new/route.ts`

**理由:**
- 静的エクスポートではルートハンドラが使用できない
- 同じパスに`page.tsx`と`route.ts`が存在すると競合する

### 2. ページコンポーネントの作成

**作成したファイル:**
- `app/(protected)/notes/[slug]/new/page.tsx`
- `app/(protected)/notes/default/new/page.tsx`

**実装内容:**
- `generateStaticParams()`を追加（空配列を返す）
- 静的エクスポート時はクライアントコンポーネントをレンダリング
- 通常のNext.jsではサーバー側ロジックを実行

### 3. クライアントコンポーネントの作成

**作成したファイル:**
- `app/(protected)/notes/[slug]/new/_components/NewPageClient.tsx`
- `app/(protected)/notes/default/new/_components/DefaultNewPageClient.tsx`

**実装内容:**
- `useEffect`でマウント時に自動的にページを作成
- Supabaseクライアントを使用してデータベース操作を実行
- 作成後にリダイレクト

## 📝 現在の実装

### `app/(protected)/notes/[slug]/new/page.tsx`

```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { NewPageClient } from "./_components/NewPageClient";

interface NewPageProps {
	params: Promise<{ slug: string }>;
}

// Generate static params for dynamic routes
// Returns empty array to enable dynamic rendering for all routes
// Phase 6: Next.js静的化とTauri統合 (Issue #157)
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
	return [];
}

export default async function NewPage({ params }: NewPageProps) {
	const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);

	if (isStaticExport) {
		return <NewPageClient />;
	}

	// サーバー側ロジック（通常のNext.js）
	const { slug } = await params;
	const supabase = await createClient();
	// ... 既存のサーバー側ロジック
}
```

### `app/(protected)/notes/[slug]/new/_components/NewPageClient.tsx`

```typescript
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export function NewPageClient() {
	const router = useRouter();
	const params = useParams();
	const slug = params?.slug as string | undefined;
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!slug) {
			setError("Note slug is required");
			setIsLoading(false);
			return;
		}

		const createNewPage = async () => {
			try {
				const supabase = createClient();

				// 認証チェック
				const { data: { user } } = await supabase.auth.getUser();
				if (!user) {
					router.push("/auth/login");
					return;
				}

				// ノートIDを取得
				const { data: note } = await supabase
					.from("notes")
					.select("id")
					.eq("slug", slug)
					.single();

				// ページを作成
				const { data: page } = await supabase
					.from("pages")
					.insert({
						user_id: user.id,
						title: "",
						content_tiptap: { type: "doc", content: [] },
						is_public: false,
					})
					.select("id")
					.single();

				// ノートとページをリンク
				await supabase
					.from("note_page_links")
					.insert({ note_id: note.id, page_id: page.id });

				// リダイレクト
				router.push(`/notes/${encodeURIComponent(slug)}/${encodeURIComponent(page.id)}`);
			} catch (err) {
				logger.error({ error: err }, "Failed to create new page");
				setError(err instanceof Error ? err.message : "Failed to create new page");
				setIsLoading(false);
			}
		};

		createNewPage();
	}, [slug, router]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-muted-foreground">ページを作成中...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-destructive">{error}</div>
			</div>
		);
	}

	return null;
}
```

## ⚠️ 注意事項

### 1. `generateStaticParams()`の必須性

静的エクスポートでは、動的ルートに対して`generateStaticParams()`が**必須**です。空配列を返すことで、このルートが動的に処理されることを示します。

### 2. `dynamicParams`は使用不可

```typescript
// ❌ 静的エクスポートでは使用できない
export const dynamicParams = true;

// ✅ 正しい実装
export async function generateStaticParams() {
	return [];
}
```

### 3. ルートハンドラとページの競合

同じパスに`route.ts`と`page.tsx`の両方を配置することはできません。静的エクスポートでは`route.ts`が使用できないため、`page.tsx`を使用する必要があります。

## 🔄 動作フロー

### 静的エクスポート時（Tauri）

1. ユーザーが`/notes/[slug]/new`にアクセス
2. `page.tsx`が`ENABLE_STATIC_EXPORT`を検出
3. `NewPageClient`コンポーネントをレンダリング
4. `useEffect`で自動的にページを作成
5. 作成後に`/notes/[slug]/[pageId]`にリダイレクト

### 通常のNext.js時

1. ユーザーが`/notes/[slug]/new`にアクセス
2. `page.tsx`がサーバー側で実行
3. 認証チェック、ノート取得、ページ作成を実行
4. 作成後に`/notes/[slug]/[pageId]`にリダイレクト

## 🐛 現在の課題

ビルド時に以下のエラーが発生している可能性があります：

```
Error: Page "/notes/[slug]/new" is missing "generateStaticParams()" so it cannot be used with "output: export" config.
```

### 確認事項

1. **ファイルの存在確認**
   ```bash
   ls -la app/\(protected\)/notes/\[slug\]/new/page.tsx
   ```

2. **`generateStaticParams()`の存在確認**
   ```bash
   grep -n "generateStaticParams" app/\(protected\)/notes/\[slug\]/new/page.tsx
   ```

3. **`.next`フォルダの削除**
   ```bash
   rm -rf .next
   ```

4. **ビルドキャッシュのクリア**
   ```bash
   rm -rf .next
   find . -name "*.tsbuildinfo" -delete
   ```

## 🔧 トラブルシューティング

### エラーが続く場合

1. **完全なクリーンビルド**
   ```bash
   rm -rf .next
   rm -rf node_modules/.cache
   bun run build
   ```

2. **ファイルの構文確認**
   - `generateStaticParams()`が正しくエクスポートされているか
   - 戻り値の型が正しいか
   - 空配列を返しているか

3. **Next.jsのバージョン確認**
   - Next.js 13+ が必要
   - `package.json`でバージョンを確認

4. **環境変数の確認**
   - `ENABLE_STATIC_EXPORT=true`が設定されているか
   - `next.config.ts`で正しく読み込まれているか

## 📚 関連ドキュメント

- [Next.js Static Exports](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
- [generateStaticParams](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)

## 📝 変更履歴

- 2025-01-25: 初版作成
  - ルートハンドラの削除
  - ページコンポーネントの作成
  - クライアントコンポーネントの作成
  - `generateStaticParams()`の追加
  - `dynamicParams`の削除（静的エクスポートでは使用不可）

