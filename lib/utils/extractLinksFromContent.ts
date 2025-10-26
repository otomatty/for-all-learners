/**
 * Extract UnifiedLinkMarks from TipTap content
 * Utility for parsing content_tiptap JSON and extracting all link marks
 */

import type { JSONContent } from "@tiptap/core";
import type { UnifiedLinkAttributes } from "@/lib/tiptap-extensions/unified-link-mark/types";

/**
 * Extracted link information
 */
export interface ExtractedLink {
	key: string; // Normalized link text
	text: string; // Original link text
	markId: string; // Mark ID
	position: number; // Position in content (for sorting)
	variant: "bracket" | "tag";
	pageId?: string | null; // Target page ID (if exists)
}

/**
 * Extract all UnifiedLinkMarks from TipTap JSON content
 * Recursively traverses the content tree to find all link marks
 */
export function extractLinksFromContent(content: JSONContent): ExtractedLink[] {
	const links: ExtractedLink[] = [];
	let position = 0;

	function traverse(node: JSONContent): void {
		// Check if node has marks
		if (node.marks && Array.isArray(node.marks)) {
			for (const mark of node.marks) {
				// Check if mark is UnifiedLinkMark
				if (
					mark.type === "unilink" &&
					mark.attrs &&
					typeof mark.attrs === "object"
				) {
					const attrs = mark.attrs as Partial<UnifiedLinkAttributes>;

					// Extract link information
					if (attrs.key && attrs.text && attrs.markId && attrs.variant) {
						links.push({
							key: attrs.key,
							text: attrs.text,
							markId: attrs.markId,
							position: position++,
							variant: attrs.variant,
							pageId: attrs.pageId || null,
						});
					}
				}
			}
		}

		// Recursively traverse child nodes
		if (node.content && Array.isArray(node.content)) {
			for (const child of node.content) {
				traverse(child);
			}
		}
	}

	// Start traversal from root
	traverse(content);

	return links;
}

/**
 * Count unique link keys in content
 * Returns a map of link key to count
 */
export function countLinksByKey(content: JSONContent): Map<string, number> {
	const links = extractLinksFromContent(content);
	const countMap = new Map<string, number>();

	for (const link of links) {
		const count = countMap.get(link.key) || 0;
		countMap.set(link.key, count + 1);
	}

	return countMap;
}

/**
 * Get unique link keys from content
 */
export function getUniqueLinkKeys(content: JSONContent): string[] {
	const links = extractLinksFromContent(content);
	const uniqueKeys = new Set(links.map((link) => link.key));
	return Array.from(uniqueKeys);
}
