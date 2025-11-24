/**
 * Admin Types
 *
 * Type definitions for admin-related APIs and components
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import these types):
 *   ├─ app/api/admin/batch-update-thumbnails/route.ts
 *   ├─ app/api/admin/batch-update-thumbnails/stats/route.ts
 *   └─ app/admin/_components/ThumbnailBatchUpdate.tsx
 */

export interface BatchUpdateResult {
	totalProcessed: number;
	successCount: number;
	errorCount: number;
	processingTimeMs: number;
	details: Array<{
		pageId: string;
		title: string;
		success: boolean;
		thumbnailUrl?: string;
		error?: string;
	}>;
}

export interface ThumbnailStats {
	totalPages: number;
	withThumbnail: number;
	withoutThumbnail: number;
	withImages: number;
}
