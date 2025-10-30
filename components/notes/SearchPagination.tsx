/**
 * SearchPagination Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (このファイルを import している場所):
 *   └─ app/(protected)/search/page.tsx
 *
 * Dependencies (このファイルが import している外部ファイル):
 *   └─ @/components/ui/pagination
 *
 * Related Files:
 *   └─ Issue: docs/01_issues/open/2025_10/20251029_XX_xxx.md
 */

import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";

interface SearchPaginationProps {
	currentPage: number;
	totalPages: number;
	baseUrl: string;
}

export function SearchPagination({
	currentPage,
	totalPages,
	baseUrl,
}: SearchPaginationProps) {
	if (totalPages <= 1) {
		return null;
	}

	// ページ番号を生成（最初の3ページ、最後の3ページ、現在ページの前後2ページ）
	const pageNumbers = (() => {
		const pages = new Set<number>();
		// 最初の3ページ、最後の3ページ、現在ページの前後2ページを追加
		for (let i = 1; i <= Math.min(totalPages, 3); i++) pages.add(i);
		for (let i = Math.max(1, totalPages - 2); i <= totalPages; i++)
			pages.add(i);
		for (
			let i = Math.max(1, currentPage - 2);
			i <= Math.min(totalPages, currentPage + 2);
			i++
		)
			pages.add(i);
		return Array.from(pages).sort((a, b) => a - b);
	})();

	return (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						href={`${baseUrl}&page=${currentPage - 1}`}
						disabled={currentPage <= 1}
					/>
				</PaginationItem>

				{pageNumbers.map((page, index, array) => {
					// 連続していない場合は省略記号を挿入
					const showEllipsis = index > 0 && page - array[index - 1] > 1;

					return (
						<div key={page} className="contents">
							{showEllipsis && (
								<PaginationItem>
									<PaginationEllipsis />
								</PaginationItem>
							)}
							<PaginationItem>
								<PaginationLink
									href={`${baseUrl}&page=${page}`}
									isActive={page === currentPage}
								>
									{page}
								</PaginationLink>
							</PaginationItem>
						</div>
					);
				})}

				<PaginationItem>
					<PaginationNext
						href={`${baseUrl}&page=${currentPage + 1}`}
						disabled={currentPage >= totalPages}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
