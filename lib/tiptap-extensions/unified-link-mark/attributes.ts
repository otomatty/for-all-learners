/**
 * UnifiedLinkMark attribute definitions
 * Defines all mark attributes with parse and render logic
 */

import type { UnifiedLinkAttributes } from "./types";

/**
 * Mark attribute definitions
 */
export const unifiedLinkAttributes = {
	variant: {
		default: "bracket",
		parseHTML: (element: HTMLElement) =>
			element.getAttribute("data-variant") || "bracket",
		renderHTML: (attributes: UnifiedLinkAttributes) => ({
			"data-variant": attributes.variant,
		}),
	},
	raw: {
		default: "",
		parseHTML: (element: HTMLElement) => {
			// 1. Priority: data-raw attribute (new format)
			const dataRaw = element.getAttribute("data-raw");
			if (dataRaw !== null) return dataRaw;

			// 2. Fallback: data-page-title attribute (legacy format)
			const pageTitle = element.getAttribute("data-page-title");
			if (pageTitle !== null) return pageTitle;

			// 3. Last resort: text content
			return element.textContent || "";
		},
		renderHTML: (attributes: UnifiedLinkAttributes) => ({
			"data-raw": attributes.raw,
		}),
	},
	text: {
		default: "",
		parseHTML: (element: HTMLElement) => {
			// 1. Priority: data-text attribute (new format)
			const dataText = element.getAttribute("data-text");
			if (dataText !== null) return dataText;

			// 2. Fallback: data-page-title attribute (legacy format)
			const pageTitle = element.getAttribute("data-page-title");
			if (pageTitle !== null) return pageTitle;

			// 3. Last resort: text content
			return element.textContent || "";
		},
		renderHTML: (attributes: UnifiedLinkAttributes) => ({
			"data-text": attributes.text,
		}),
	},
	key: {
		default: "",
		parseHTML: (element: HTMLElement) => {
			// 1. Priority: data-key attribute (new format)
			const dataKey = element.getAttribute("data-key");
			if (dataKey !== null) return dataKey;

			// 2. Fallback: data-page-title attribute lowercase (legacy format)
			const pageTitle = element.getAttribute("data-page-title");
			if (pageTitle !== null) return pageTitle.toLowerCase();

			// 3. No fallback for key - keep empty string
			return "";
		},
		renderHTML: (attributes: UnifiedLinkAttributes) => ({
			"data-key": attributes.key,
		}),
	},
	pageId: {
		default: null,
		parseHTML: (element: HTMLElement) => element.getAttribute("data-page-id"),
		renderHTML: (attributes: UnifiedLinkAttributes) =>
			attributes.pageId ? { "data-page-id": attributes.pageId } : {},
	},
	href: {
		default: "#",
		parseHTML: (element: HTMLElement) => element.getAttribute("href") || "#",
		renderHTML: (attributes: UnifiedLinkAttributes) => ({
			href: attributes.href,
		}),
	},
	state: {
		default: "pending",
		parseHTML: (element: HTMLElement) =>
			element.getAttribute("data-state") || "pending",
		renderHTML: (attributes: UnifiedLinkAttributes) => ({
			"data-state": attributes.state,
		}),
	},
	exists: {
		default: false,
		parseHTML: (element: HTMLElement) =>
			element.getAttribute("data-exists") === "true",
		renderHTML: (attributes: UnifiedLinkAttributes) => ({
			"data-exists": String(attributes.exists),
		}),
	},
	created: {
		default: false,
		parseHTML: (element: HTMLElement) =>
			element.getAttribute("data-created") === "true",
		renderHTML: (attributes: UnifiedLinkAttributes) =>
			attributes.created ? { "data-created": "true" } : {},
	},
	markId: {
		default: "",
		parseHTML: (element: HTMLElement) =>
			element.getAttribute("data-mark-id") || "",
		renderHTML: (attributes: UnifiedLinkAttributes) => ({
			"data-mark-id": attributes.markId,
		}),
	},
};
