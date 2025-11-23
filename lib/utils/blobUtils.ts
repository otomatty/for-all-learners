/**
 * Blob Utilities
 *
 * Utility functions for converting between base64 strings and Blob objects
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   ├─ app/api/batch/unified/route.ts
 *   ├─ app/api/batch/multi-file/route.ts
 *
 * Dependencies (External files that this file uses):
 *   └─ None (pure utility functions)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

/**
 * Convert base64 string to Blob
 *
 * @param base64 - Base64 encoded string (may include data URI prefix)
 * @param mimeType - MIME type for the Blob
 * @returns Blob object
 *
 * @example
 * ```typescript
 * const blob = base64ToBlob("data:image/png;base64,iVBORw0KG...", "image/png");
 * ```
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
	const base64Data = base64.split(",")[1] || base64;
	const binaryString = Buffer.from(base64Data, "base64");
	return new Blob([binaryString], { type: mimeType });
}

/**
 * Get MIME type for file type
 *
 * @param fileType - File type ("pdf" | "image" | "audio")
 * @returns MIME type string
 *
 * @example
 * ```typescript
 * const mimeType = getMimeTypeForFileType("pdf"); // "application/pdf"
 * ```
 */
export function getMimeTypeForFileType(
	fileType: "pdf" | "image" | "audio",
): string {
	const mimeTypes = {
		pdf: "application/pdf",
		image: "image/png", // Default to PNG for images
		audio: "audio/mp3", // Default to MP3 for audio
	};
	return mimeTypes[fileType];
}
