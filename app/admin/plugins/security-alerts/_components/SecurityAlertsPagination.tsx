"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

interface SecurityAlertsPaginationProps {
	currentPage: number;
	totalPages: number;
}

export function SecurityAlertsPagination({
	currentPage,
	totalPages,
}: SecurityAlertsPaginationProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const goToPage = (page: number) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("page", page.toString());
		router.push(`?${params.toString()}`, { scroll: false });
	};

	if (totalPages <= 1) {
		return null;
	}

	return (
		<div className="flex items-center justify-between">
			<div className="text-sm text-muted-foreground">
				ページ {currentPage} / {totalPages}
			</div>
			<div className="flex gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={() => goToPage(currentPage - 1)}
					disabled={currentPage <= 1}
				>
					<ChevronLeft className="h-4 w-4" />
					前へ
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => goToPage(currentPage + 1)}
					disabled={currentPage >= totalPages}
				>
					次へ
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
