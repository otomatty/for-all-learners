# スタイリング調整に関する複数の改善issue

## 📅 基本情報

- **発見日**: 2025年11月04日
- **発見者**: SugaiAkimasa
- **ステータス**: Open
- **重要度**: Medium

## 🔍 問題の概要

このissueは、複数の細かいスタイリング調整をまとめて対応するためのissueです。主に以下の2つの問題が含まれます：

1. **ダークモードの対応**: 一部のコンポーネントでダークモード時のスタイリングが適切に適用されていない
2. **ローディングスケルトンの表示個数**: `/notes/default`などの`loading.tsx`のカードスケルトンの表示個数を実際のカードリストと同じ個数にする

## 📝 問題の詳細

### 問題 1: ダークモードの対応

#### 現状の説明

プロジェクトではダークモードのCSS変数は定義されているが（`app/globals.css`）、一部のコンポーネントでダークモード時のスタイリングが適切に適用されていない可能性があります。

#### 発見場所

- **ファイルパス**: `app/globals.css`
- **関連コンポーネント**: 
  - 各ページコンポーネント
  - UIコンポーネント（`components/ui/`）
  - カスタムコンポーネント（`components/notes/`, `components/pages/` など）

#### なぜ問題なのか

- **影響範囲**: ダークモードを使用しているユーザーの視認性が低下する可能性がある
- **リスク**: ユーザー体験の低下、アクセシビリティの問題
- **技術的負債**: ダークモード対応が不完全なまま残ると、将来的な修正が困難になる

#### 確認が必要な箇所

1. ハードコードされた色（`bg-gray-100`など）がダークモード対応の変数（`bg-background`など）に置き換えられているか
2. テキスト色が適切にダークモード対応の変数（`text-foreground`, `text-muted-foreground`など）を使用しているか
3. ボーダーやシャドウが適切にダークモード対応されているか

### 問題 2: ローディングスケルトンの表示個数調整

#### 現状の説明

`/notes/[slug]`ページの`PagesListSkeleton`コンポーネントが、固定で36個のスケルトンを表示しています。また、グリッドレイアウトも実際の`PagesList`コンポーネントと一致していません。

#### 発見場所

- **ファイルパス**: `app/(protected)/notes/[slug]/_components/pages-list-skeleton.tsx`
- **行番号**: L5-L13
- **関連コンポーネント**: 
  - `app/(protected)/notes/[slug]/page-client.tsx` (L123)
  - `components/notes/PagesList/PagesList.tsx` (L75, L89)

#### 問題のあるコード

```5:13:app/(protected)/notes/[slug]/_components/pages-list-skeleton.tsx
const SKELETON_COUNT = 36;
const skeletonKeys = Array.from(
	{ length: SKELETON_COUNT },
	(_, i) => `skeleton-${i}`,
);

export function PagesListSkeleton() {
	return (
		<div className="grid gap-2 md:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
```

#### 実際のコードとの比較

実際の`PagesList`コンポーネントは以下のグリッドレイアウトを使用しています：

```75:89:components/notes/PagesList/PagesList.tsx
	gridCols = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
}: PagesListProps) {
	if (pages.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-40 border rounded-lg">
				<p className="text-muted-foreground">ページがありません</p>
				<p className="text-sm text-muted-foreground">
					「新規ページ」ボタンからページを作成してください
				</p>
			</div>
		);
	}

	return (
		<div className={`grid gap-2 md:gap-4 ${gridCols}`}>
```

#### なぜ問題なのか

- **影響範囲**: ローディング時のUI表示が実際のコンテンツと一致しない
- **リスク**: ユーザーに混乱を招く可能性がある（レイアウトシフトの発生）
- **技術的負債**: スケルトンと実際のコンテンツが一致しないことで、UXの一貫性が損なわれる

## 💡 提案する解決策

### アプローチ 1: PagesListSkeletonの改善（推奨）

#### 実装内容

1. **グリッドレイアウトの統一**: `PagesListSkeleton`のグリッドレイアウトを`PagesList`と同じにする
   - `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6`に変更

2. **スケルトン個数の動的化**: 固定の36個ではなく、実際のページ数に基づいて表示する
   - オプション: `totalCount`プロパティを受け取るようにする
   - もしくは、画面サイズに応じた適切な個数を計算する（例: 画面幅に応じて表示可能なカード数を計算し、その2-3倍を表示）

```typescript
interface PagesListSkeletonProps {
	/**
	 * 表示するスケルトンの個数
	 * 指定がない場合は、画面サイズに応じた適切な個数を計算
	 */
	count?: number;
	/**
	 * グリッドレイアウトの設定
	 * デフォルトはPagesListと同じ設定
	 */
	gridCols?: string;
}

export function PagesListSkeleton({ 
	count, 
	gridCols = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" 
}: PagesListSkeletonProps = {}) {
	// countが指定されていない場合は、画面サイズに応じた適切な個数を計算
	const skeletonCount = count ?? calculateOptimalSkeletonCount();
	
	return (
		<div className={`grid gap-2 md:gap-4 ${gridCols}`}>
			{Array.from({ length: skeletonCount }, (_, i) => (
				// ... skeleton content
			))}
		</div>
	);
}
```

**メリット**:
- 実際のコンテンツと一致したローディングUIを提供できる
- レイアウトシフトを防げる
- 再利用性が高い

**デメリット**:
- 実装がやや複雑になる可能性がある

**実装難易度**: Medium
**推定工数**: 1-2時間

### アプローチ 2: ダークモード対応の確認と修正

#### 実装内容

1. **全コンポーネントの確認**: ダークモード非対応のハードコードされた色を検索
2. **変数への置き換え**: 見つかったハードコードされた色をCSS変数に置き換え
3. **視覚的確認**: ダークモードで各ページを確認し、視認性の問題がないか検証

#### 確認すべきパターン

- `bg-gray-*`, `bg-white`, `bg-black` → `bg-background`, `bg-card`など
- `text-gray-*`, `text-black`, `text-white` → `text-foreground`, `text-muted-foreground`など
- `border-gray-*` → `border-border`など

**メリット**:
- 一貫したダークモード対応ができる
- アクセシビリティの向上

**デメリット**:
- 全てのコンポーネントを確認する必要があり、工数がかかる

**実装難易度**: Medium
**推定工数**: 2-4時間（コンポーネント数による）

## 🔗 関連情報

### 関連ファイル

- `app/(protected)/notes/[slug]/_components/pages-list-skeleton.tsx`
- `components/notes/PagesList/PagesList.tsx`
- `app/(protected)/notes/[slug]/page-client.tsx`
- `app/globals.css`
- `components/ui/`内の各コンポーネント

### 参考資料

- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [shadcn/ui Dark Mode](https://ui.shadcn.com/docs/theming)

## 📊 進捗記録

### 2025-11-04: Issue作成

問題を整理し、issueとして記録しました。

## 📎 備考

- `/notes/default`には`loading.tsx`が存在しない可能性があります。必要に応じて作成も検討してください。
- 他のページ（`/notes/page.tsx`など）にも同様の問題がある可能性があります。

---

**作成日**: 2025年11月04日
**最終更新日**: 2025年11月04日

