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
	const pageNumbers = Array.from(
		{ length: totalPages },
		(_, i) => i + 1,
	).filter((page) => {
		return (
			page <= 3 || page > totalPages - 3 || Math.abs(page - currentPage) <= 2
		);
	});

	return (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						href={`${baseUrl}&page=${currentPage - 1}`}
						aria-disabled={currentPage <= 1}
						className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
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
						aria-disabled={currentPage >= totalPages}
						className={
							currentPage >= totalPages ? "pointer-events-none opacity-50" : ""
						}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
