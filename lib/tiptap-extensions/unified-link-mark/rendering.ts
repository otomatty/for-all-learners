/**
 * UnifiedLinkMark rendering logic
 * Handles HTML rendering and parsing
 */

import { mergeAttributes } from "@tiptap/core";
import logger from "../../logger";
import type { UnifiedLinkMarkOptions } from "./types";

/**
 * Render the mark as HTML
 * @param HTMLAttributes - The mark attributes
 * @param options - The mark options
 * @returns HTML specification array
 */
export function renderHTML(
	HTMLAttributes: Record<string, unknown>,
	options: UnifiedLinkMarkOptions,
): ["a", Record<string, unknown>, 0] {
	const { variant, groupState, ...rest } = HTMLAttributes;
	const variantClass = `unilink--${variant}`;

	// Phase 1 (Link Group): Add group state class if available
	const groupStateClass = groupState ? `unilink--${groupState}` : "";

	// Combine all classes
	const allClasses = [
		options.HTMLAttributes.class,
		variantClass,
		groupStateClass,
	]
		.filter(Boolean)
		.join(" ");

	return [
		"a",
		mergeAttributes(options.HTMLAttributes, rest, {
			class: allClasses,
		}),
		0,
	];
}

/**
 * Parse HTML to mark
 * Supports both new UnifiedLinkMark format and legacy PageLinkMark format
 * @returns HTML parsing specification
 */
export function parseHTML() {
	return [
		// ① New format: UnifiedLinkMark (data-variant required)
		{
			tag: "a[data-variant]",
			getAttrs: (node: HTMLElement | string) => {
				if (typeof node === "string") return false;
				// Attributes are used as-is (return nothing to use defaults)
				return {};
			},
		},

		// ② Legacy format: PageLinkMark (data-page-id) - auto-convert
		{
			tag: "a[data-page-id]:not([data-variant])",
			getAttrs: (node: HTMLElement | string) => {
				if (typeof node === "string") return false;
				if (
					typeof window !== "undefined" &&
					!(node instanceof window.HTMLElement)
				) {
					return false;
				}
				if (typeof window === "undefined" && typeof node !== "object") {
					return false;
				}

				// Check for external links (future support)
				const external = node.getAttribute("data-external") === "true";
				if (external) {
					logger.warn(
						{ node: node.outerHTML },
						"[UnifiedLinkMark] External link migration not yet supported",
					);
					return false;
				}

				// Generate markId for migration
				const markId = `migrated-${Date.now()}-${Math.random()
					.toString(36)
					.slice(2, 8)}`;

				// Add data-mark-id to the element so parseHTML can pick it up
				node.setAttribute("data-mark-id", markId);
				node.setAttribute("data-variant", "bracket");
				node.setAttribute("data-raw", node.textContent || "");
				node.setAttribute("data-text", node.textContent || "");
				node.setAttribute("data-created", "false");

				// Return empty object to use parseHTML logic
				return {};
			},
		},

		// ③ Legacy format: PageLinkMark (data-page-title) - uncreated pages
		{
			tag: "a[data-page-title]:not([data-variant])",
			getAttrs: (node: HTMLElement | string) => {
				if (typeof node === "string") {
					return false;
				}
				if (
					typeof window !== "undefined" &&
					!(node instanceof window.HTMLElement)
				) {
					return false;
				}
				if (typeof window === "undefined" && typeof node !== "object") {
					return false;
				}

				const pageTitle = node.getAttribute("data-page-title");

				// Generate markId for migration
				const markId = `migrated-${Date.now()}-${Math.random()
					.toString(36)
					.slice(2, 8)}`;

				// Note: key is used for internal identification, not for URL generation
				// For missing pages, we store the title as-is for later page creation
				const normalizedKey = pageTitle
					? pageTitle.toLowerCase().trim().replace(/\s+/g, " ")
					: "";

				// Add data attributes to the element so parseHTML can pick them up
				node.setAttribute("data-mark-id", markId);
				node.setAttribute("data-variant", "bracket");
				node.setAttribute("data-raw", pageTitle || "");
				node.setAttribute("data-text", pageTitle || "");
				node.setAttribute("data-key", normalizedKey);
				node.setAttribute("data-created", "false");
				node.setAttribute("data-exists", "false");
				node.setAttribute("href", "#");

				// Return empty object to use parseHTML logic
				return {};
			},
		},
	];
}
