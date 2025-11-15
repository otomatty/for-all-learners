/**
 * Navigation Utilities
 * Handles page navigation with context awareness
 */

"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import logger from "@/lib/logger";

/**
 * Navigate to a specific page by ID
 * Simple navigation to /pages/:id
 *
 * @param pageId Page ID to navigate to
 */
export function navigateToPage(pageId: string): void {
	try {
		// Client-side navigation in Next.js App Router
		if (typeof window !== "undefined") {
			window.location.href = `/notes/default/${pageId}`;
		}
	} catch (error) {
		logger.error({ pageId, error }, "Navigation failed");
		toast.error("ページの表示に失敗しました");
	}
}

/**
 * Navigate to page with context awareness
 * Supports note context: /notes/:slug/:id or /pages/:id
 * Phase 3.1: Unified navigation considering noteSlug
 *
 * Updated to use client-side navigation (router.push) instead of window.location.href
 * for better UX and performance.
 *
 * @param pageId Page ID to navigate to
 * @param noteSlug Optional note slug for context-aware URL
 * @param isNewPage Flag indicating if this is a newly created page
 */
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

			// Note: For client-side navigation with better UX, use the useNavigateToPage hook
			// This function uses window.location.href for backward compatibility
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

/**
 * Hook for client-side navigation to a page
 * Use this in React components for better UX with client-side navigation
 *
 * @returns Function to navigate to a page
 * @example
 * ```tsx
 * const navigateToPage = useNavigateToPage();
 * navigateToPage(pageId, noteSlug);
 * ```
 */
export function useNavigateToPage() {
	const router = useRouter();

	return (pageId: string, noteSlug?: string | null, isNewPage = false) => {
		try {
			const queryParam = isNewPage ? "?newPage=true" : "";
			const href = noteSlug
				? `/notes/${encodeURIComponent(noteSlug)}/${pageId}${queryParam}`
				: `/notes/default/${pageId}${queryParam}`;

			router.push(href);
		} catch (error) {
			logger.error(
				{ pageId, noteSlug, isNewPage, error },
				"[UnifiedResolver] Navigation failed",
			);
			toast.error("ページの表示に失敗しました");
		}
	};
}
