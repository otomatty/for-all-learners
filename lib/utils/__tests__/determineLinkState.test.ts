/**
 * determineLinkState utility tests
 */

import { describe, expect, it } from "vitest";
import {
	determineLinkState,
	getLinkStateClassName,
	isNormalLinkStyle,
} from "../determineLinkState";

describe("determineLinkState", () => {
	describe("Rule 1: Page exists", () => {
		it("should return 'exists' when pageId is provided", () => {
			const result = determineLinkState("page-123", 5);
			expect(result).toBe("exists");
		});

		it("should return 'exists' when pageId is provided regardless of linkCount", () => {
			expect(determineLinkState("page-123", 1)).toBe("exists");
			expect(determineLinkState("page-123", 10)).toBe("exists");
			expect(determineLinkState("page-123", 100)).toBe("exists");
		});
	});

	describe("Rule 2: Page doesn't exist, but multiple links exist (link group)", () => {
		it("should return 'grouped' when pageId is null and linkCount > 1", () => {
			const result = determineLinkState(null, 2);
			expect(result).toBe("grouped");
		});

		it("should return 'grouped' for various linkCounts > 1", () => {
			expect(determineLinkState(null, 2)).toBe("grouped");
			expect(determineLinkState(null, 5)).toBe("grouped");
			expect(determineLinkState(null, 10)).toBe("grouped");
			expect(determineLinkState(null, 100)).toBe("grouped");
		});

		it("should return 'grouped' when pageId is undefined and linkCount > 1", () => {
			expect(determineLinkState(undefined, 2)).toBe("grouped");
			expect(determineLinkState(undefined, 5)).toBe("grouped");
		});
	});

	describe("Rule 3: Page doesn't exist and only one link exists", () => {
		it("should return 'missing' when pageId is null and linkCount === 1", () => {
			const result = determineLinkState(null, 1);
			expect(result).toBe("missing");
		});

		it("should return 'missing' when pageId is undefined and linkCount === 1", () => {
			const result = determineLinkState(undefined, 1);
			expect(result).toBe("missing");
		});

		it("should return 'missing' when pageId is null and linkCount === 0", () => {
			// Edge case: no links at all
			const result = determineLinkState(null, 0);
			expect(result).toBe("missing");
		});
	});
});

describe("getLinkStateClassName", () => {
	it("should return correct class name for 'exists'", () => {
		expect(getLinkStateClassName("exists")).toBe("link-exists");
	});

	it("should return correct class name for 'grouped'", () => {
		expect(getLinkStateClassName("grouped")).toBe("link-grouped");
	});

	it("should return correct class name for 'missing'", () => {
		expect(getLinkStateClassName("missing")).toBe("link-missing");
	});
});

describe("isNormalLinkStyle", () => {
	it("should return true for 'exists' state", () => {
		expect(isNormalLinkStyle("exists")).toBe(true);
	});

	it("should return true for 'grouped' state", () => {
		expect(isNormalLinkStyle("grouped")).toBe(true);
	});

	it("should return false for 'missing' state", () => {
		expect(isNormalLinkStyle("missing")).toBe(false);
	});
});

describe("Integration scenarios", () => {
	it("should handle typical wiki-style link group scenario", () => {
		// User creates [React] link in Page A
		expect(determineLinkState(null, 1)).toBe("missing");

		// User creates another [React] link in Page B
		expect(determineLinkState(null, 2)).toBe("grouped");

		// User creates React page
		expect(determineLinkState("react-page-id", 2)).toBe("exists");
	});

	it("should handle edge case of link count decreasing", () => {
		// Start with link group (multiple links)
		expect(determineLinkState(null, 3)).toBe("grouped");

		// Two pages deleted, only one link remains
		expect(determineLinkState(null, 1)).toBe("missing");
	});
});
