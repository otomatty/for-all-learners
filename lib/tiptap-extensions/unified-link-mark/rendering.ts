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
	const { variant, ...rest } = HTMLAttributes;
	const variantClass = `unilink--${variant}`;

	return [
		"a",
		mergeAttributes(options.HTMLAttributes, rest, {
			class: `${options.HTMLAttributes.class} ${variantClass}`,
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

				// Convert PageLinkMark → UnifiedLinkMark
				const pageId = node.getAttribute("data-page-id");
				const state = node.getAttribute("data-state") || "pending";
				const exists = node.getAttribute("data-exists") === "true";
				const href = node.getAttribute("href") || "#";
				const external = node.getAttribute("data-external") === "true";

				// Skip external links (future support)
				if (external) {
					logger.warn(
						{ node: node.outerHTML },
						"[UnifiedLinkMark] External link migration not yet supported",
					);
					return false;
				}

				// Generate UnifiedLinkMark format attributes
				const attrs = {
					variant: "bracket",
					pageId,
					state,
					exists,
					href,
					key: "", // resolver will resolve later
					raw: node.textContent || "",
					text: node.textContent || "",
					markId: `migrated-${Date.now()}-${Math.random()
						.toString(36)
						.slice(2, 8)}`,
					created: false,
				};

				return attrs;
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
				const state = node.getAttribute("data-state") || "missing";

				// Note: key is used for internal identification, not for URL generation
				// For missing pages, we store the title as-is for later page creation
				// URL generation uses pageId (UUID) when the page exists
				const normalizedKey = pageTitle
					? pageTitle.toLowerCase().trim().replace(/\s+/g, "_")
					: "";

				// Generate UnifiedLinkMark format attributes
				const attrs = {
					variant: "bracket",
					pageId: null, // Will be set when page is created
					state,
					exists: false,
					href: "#", // Placeholder until page is created
					key: normalizedKey,
					raw: pageTitle || "",
					text: pageTitle || "",
					markId: `migrated-${Date.now()}-${Math.random()
						.toString(36)
						.slice(2, 8)}`,
					created: false,
				};

				return attrs;
			},
		},
	];
}
