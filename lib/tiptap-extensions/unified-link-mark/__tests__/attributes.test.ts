/**
 * attributes.ts のユニットテスト
 * Mark 属性定義のテスト
 */

import { describe, expect, it } from "vitest";
import { setupJSDOMEnvironment } from "@/lib/__tests__/helpers";
import { unifiedLinkAttributes } from "../attributes";
import type { UnifiedLinkAttributes } from "../types";

// Setup jsdom environment for this test
setupJSDOMEnvironment();

describe("UnifiedLinkMark Attributes", () => {
	describe("attribute definitions", () => {
		it("should define all required attributes", () => {
			const requiredAttributes = [
				"variant",
				"raw",
				"text",
				"key",
				"pageId",
				"href",
				"state",
				"exists",
				"created",
				"markId",
			];

			for (const attr of requiredAttributes) {
				expect(unifiedLinkAttributes).toHaveProperty(attr);
			}
		});

		it("should have correct default values", () => {
			expect(unifiedLinkAttributes.variant.default).toBe("bracket");
			expect(unifiedLinkAttributes.raw.default).toBe("");
			expect(unifiedLinkAttributes.text.default).toBe("");
			expect(unifiedLinkAttributes.key.default).toBe("");
			expect(unifiedLinkAttributes.pageId.default).toBeNull();
			expect(unifiedLinkAttributes.href.default).toBe("#");
			expect(unifiedLinkAttributes.state.default).toBe("pending");
			expect(unifiedLinkAttributes.exists.default).toBe(false);
			expect(unifiedLinkAttributes.created.default).toBe(false);
			expect(unifiedLinkAttributes.markId.default).toBe("");
		});
	});

	describe("variant attribute", () => {
		it("should parse variant from HTML", () => {
			const element = document.createElement("a");
			element.setAttribute("data-variant", "tag");

			const result = unifiedLinkAttributes.variant.parseHTML(element);
			expect(result).toBe("tag");
		});

		it("should default to bracket when not specified", () => {
			const element = document.createElement("a");

			const result = unifiedLinkAttributes.variant.parseHTML(element);
			expect(result).toBe("bracket");
		});

		it("should render variant to HTML", () => {
			const result = unifiedLinkAttributes.variant.renderHTML({
				variant: "tag",
			} as unknown as UnifiedLinkAttributes);

			expect(result).toEqual({ "data-variant": "tag" });
		});
	});

	describe("state attribute", () => {
		it("should parse state from HTML", () => {
			const element = document.createElement("a");
			element.setAttribute("data-state", "exists");

			const result = unifiedLinkAttributes.state.parseHTML(element);
			expect(result).toBe("exists");
		});

		it("should default to pending when not specified", () => {
			const element = document.createElement("a");

			const result = unifiedLinkAttributes.state.parseHTML(element);
			expect(result).toBe("pending");
		});

		it("should render state to HTML", () => {
			const result = unifiedLinkAttributes.state.renderHTML({
				state: "exists",
			} as unknown as UnifiedLinkAttributes);

			expect(result).toEqual({ "data-state": "exists" });
		});
	});

	describe("exists attribute", () => {
		it("should parse true from HTML", () => {
			const element = document.createElement("a");
			element.setAttribute("data-exists", "true");

			const result = unifiedLinkAttributes.exists.parseHTML(element);
			expect(result).toBe(true);
		});

		it("should parse false from HTML", () => {
			const element = document.createElement("a");
			element.setAttribute("data-exists", "false");

			const result = unifiedLinkAttributes.exists.parseHTML(element);
			expect(result).toBe(false);
		});

		it("should render exists as string", () => {
			const result = unifiedLinkAttributes.exists.renderHTML({
				exists: true,
			} as unknown as UnifiedLinkAttributes);

			expect(result).toEqual({ "data-exists": "true" });
		});
	});

	describe("pageId attribute", () => {
		it("should parse pageId from HTML", () => {
			const element = document.createElement("a");
			element.setAttribute("data-page-id", "page-123");

			const result = unifiedLinkAttributes.pageId.parseHTML(element);
			expect(result).toBe("page-123");
		});

		it("should return null when not specified", () => {
			const element = document.createElement("a");

			const result = unifiedLinkAttributes.pageId.parseHTML(element);
			expect(result).toBeNull();
		});

		it("should render pageId to HTML", () => {
			const result = unifiedLinkAttributes.pageId.renderHTML({
				pageId: "page-123",
			} as unknown as UnifiedLinkAttributes);

			expect(result).toEqual({ "data-page-id": "page-123" });
		});

		it("should render empty object when pageId is null", () => {
			const result = unifiedLinkAttributes.pageId.renderHTML({
				pageId: null,
			} as unknown as UnifiedLinkAttributes);

			expect(result).toEqual({});
		});
	});

	describe("key attribute", () => {
		it("should parse key from HTML", () => {
			const element = document.createElement("a");
			element.setAttribute("data-key", "test-key");

			const result = unifiedLinkAttributes.key.parseHTML(element);
			expect(result).toBe("test-key");
		});

		it("should render key to HTML when present", () => {
			const result = unifiedLinkAttributes.key.renderHTML({
				key: "test-key",
			} as unknown as UnifiedLinkAttributes);

			expect(result).toEqual({ "data-key": "test-key" });
		});

		it("should render key even when null", () => {
			const result = unifiedLinkAttributes.key.renderHTML({
				key: null,
			} as unknown as UnifiedLinkAttributes);

			expect(result).toEqual({ "data-key": null });
		});
	});

	describe("created attribute", () => {
		it("should parse true from HTML", () => {
			const element = document.createElement("a");
			element.setAttribute("data-created", "true");

			const result = unifiedLinkAttributes.created.parseHTML(element);
			expect(result).toBe(true);
		});

		it("should render created to HTML", () => {
			const result = unifiedLinkAttributes.created.renderHTML({
				created: true,
			} as unknown as UnifiedLinkAttributes);

			expect(result).toEqual({ "data-created": "true" });
		});

		it("should not render when created is false", () => {
			const result = unifiedLinkAttributes.created.renderHTML({
				created: false,
			} as unknown as UnifiedLinkAttributes);

			expect(result).toEqual({});
		});
	});

	describe("text attributes", () => {
		it("should parse raw from HTML", () => {
			const element = document.createElement("a");
			element.setAttribute("data-raw", "Test Title");

			const result = unifiedLinkAttributes.raw.parseHTML(element);
			expect(result).toBe("Test Title");
		});

		it("should parse text from HTML", () => {
			const element = document.createElement("a");
			element.setAttribute("data-text", "Display Text");

			const result = unifiedLinkAttributes.text.parseHTML(element);
			expect(result).toBe("Display Text");
		});

		it("should render raw to HTML", () => {
			const result = unifiedLinkAttributes.raw.renderHTML({
				raw: "example",
			} as unknown as UnifiedLinkAttributes);

			expect(result).toEqual({ "data-raw": "example" });
		});

		it("should render text to HTML", () => {
			const result = unifiedLinkAttributes.text.renderHTML({
				text: "example",
			} as unknown as UnifiedLinkAttributes);

			expect(result).toEqual({ "data-text": "example" });
		});
	});

	describe("href attribute", () => {
		it("should parse href from HTML", () => {
			const element = document.createElement("a");
			element.setAttribute("href", "/pages/123");

			const result = unifiedLinkAttributes.href.parseHTML(element);
			expect(result).toBe("/pages/123");
		});

		it("should default to # when not specified", () => {
			const element = document.createElement("a");

			const result = unifiedLinkAttributes.href.parseHTML(element);
			expect(result).toBe("#");
		});

		it("should render href to HTML", () => {
			const result = unifiedLinkAttributes.href.renderHTML({
				href: "/pages/123",
			} as unknown as UnifiedLinkAttributes);

			expect(result).toEqual({ href: "/pages/123" });
		});
	});

	describe("markId attribute", () => {
		it("should parse markId from HTML", () => {
			const element = document.createElement("a");
			element.setAttribute("data-mark-id", "unilink-123-abc");

			const result = unifiedLinkAttributes.markId.parseHTML(element);
			expect(result).toBe("unilink-123-abc");
		});

		it("should render markId to HTML", () => {
			const result = unifiedLinkAttributes.markId.renderHTML({
				markId: "unilink-123-abc",
			} as unknown as UnifiedLinkAttributes);

			expect(result).toEqual({ "data-mark-id": "unilink-123-abc" });
		});
	});
});
