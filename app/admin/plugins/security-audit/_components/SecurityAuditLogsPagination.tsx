"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";

interface SecurityAuditLogsPaginationProps {
	currentPage: number;
	totalPages: number;
}

export function SecurityAuditLogsPagination({
	currentPage,
	totalPages,
}: SecurityAuditLogsPaginationProps) {
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

	// Show page numbers around current page
	const pageNumbers: number[] = [];
	const maxVisiblePages = 7;
	let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
	const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

	if (endPage - startPage < maxVisiblePages - 1) {
		startPage = Math.max(1, endPage - maxVisiblePages + 1);
	}

	for (let i = startPage; i <= endPage; i++) {
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
				{startPage > 1 && (
					<>
						<PaginationItem>
							<PaginationLink onClick={() => handlePageChange(1)}>
								1
							</PaginationLink>
						</PaginationItem>
						{startPage > 2 && (
							<PaginationItem>
								<span className="px-2">...</span>
							</PaginationItem>
						)}
					</>
				)}
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
				{endPage < totalPages && (
					<>
						{endPage < totalPages - 1 && (
							<PaginationItem>
								<span className="px-2">...</span>
							</PaginationItem>
						)}
						<PaginationItem>
							<PaginationLink onClick={() => handlePageChange(totalPages)}>
								{totalPages}
							</PaginationLink>
						</PaginationItem>
					</>
				)}
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
