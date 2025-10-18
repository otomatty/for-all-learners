"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";

interface InquiryPaginationProps {
	currentPage: number;
	totalPages: number;
}

export function InquiryPagination({
	currentPage,
	totalPages,
}: InquiryPaginationProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const handlePageChange = (page: number) => {
		if (page < 1 || page > totalPages) return;
		const params = new URLSearchParams(searchParams.toString());
		params.set("page", page.toString());
		router.push(`${pathname}?${params.toString()}`, { scroll: false });
	};

	if (totalPages <= 1) {
		return null;
	}

	// 簡単なページネーション表示 (より高度なものはshadcn/uiの例などを参考に)
	const pageNumbers = [];
	for (let i = 1; i <= totalPages; i++) {
		pageNumbers.push(i);
	}

	return (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
						disabled={currentPage === 1}
					/>
				</PaginationItem>
				{pageNumbers.map((page) => (
					<PaginationItem key={page}>
						<PaginationLink
							onClick={() => handlePageChange(page)}
							isActive={currentPage === page}
						>
							{page}
						</PaginationLink>
					</PaginationItem>
				))}
				<PaginationItem>
					<PaginationNext
						onClick={() =>
							handlePageChange(Math.min(totalPages, currentPage + 1))
						}
						disabled={currentPage === totalPages}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
