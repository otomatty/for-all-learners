import { describe, test, expect } from "vitest";
import {
	determineLinkGroupState,
	shouldDisplayAsRegularLink,
	getLinkGroupStateClass,
} from "../link-group-state";

describe("determineLinkGroupState", () => {
	test("should return 'exists' when pageId is provided", () => {
		const state = determineLinkGroupState("page-123", 0);
		expect(state).toBe("exists");
	});

	test("should return 'grouped' when pageId is null and linkCount > 1", () => {
		const state = determineLinkGroupState(null, 5);
		expect(state).toBe("grouped");
	});

	test("should return 'grouped' when pageId is undefined and linkCount > 1", () => {
		const state = determineLinkGroupState(undefined, 3);
		expect(state).toBe("grouped");
	});

	test("should return 'missing' when pageId is null and linkCount <= 1", () => {
		const state = determineLinkGroupState(null, 1);
		expect(state).toBe("missing");
	});

	test("should return 'missing' when pageId is undefined and linkCount is 0", () => {
		const state = determineLinkGroupState(undefined, 0);
		expect(state).toBe("missing");
	});

	test("should return 'missing' when both pageId and linkCount are not provided", () => {
		const state = determineLinkGroupState(null, 0);
		expect(state).toBe("missing");
	});
});

describe("shouldDisplayAsRegularLink", () => {
	test("should return true when state is 'exists'", () => {
		const result = shouldDisplayAsRegularLink("exists");
		expect(result).toBe(true);
	});

	test("should return true when state is 'grouped'", () => {
		const result = shouldDisplayAsRegularLink("grouped");
		expect(result).toBe(true);
	});

	test("should return false when state is 'missing'", () => {
		const result = shouldDisplayAsRegularLink("missing");
		expect(result).toBe(false);
	});
});

describe("getLinkGroupStateClass", () => {
	test("should return 'unilink--exists' when state is 'exists'", () => {
		const className = getLinkGroupStateClass("exists");
		expect(className).toBe("unilink--exists");
	});

	test("should return 'unilink--grouped' when state is 'grouped'", () => {
		const className = getLinkGroupStateClass("grouped");
		expect(className).toBe("unilink--grouped");
	});

	test("should return 'unilink--missing' when state is 'missing'", () => {
		const className = getLinkGroupStateClass("missing");
		expect(className).toBe("unilink--missing");
	});
});

describe("Link group state integration", () => {
	test("should handle complete flow for existing page", () => {
		const pageId = "page-123";
		const linkCount = 5;

		const state = determineLinkGroupState(pageId, linkCount);
		const shouldDisplay = shouldDisplayAsRegularLink(state);
		const className = getLinkGroupStateClass(state);

		expect(state).toBe("exists");
		expect(shouldDisplay).toBe(true);
		expect(className).toBe("unilink--exists");
	});

	test("should handle complete flow for grouped link", () => {
		const pageId = null;
		const linkCount = 5;

		const state = determineLinkGroupState(pageId, linkCount);
		const shouldDisplay = shouldDisplayAsRegularLink(state);
		const className = getLinkGroupStateClass(state);

		expect(state).toBe("grouped");
		expect(shouldDisplay).toBe(true);
		expect(className).toBe("unilink--grouped");
	});

	test("should handle complete flow for missing link", () => {
		const pageId = null;
		const linkCount = 1;

		const state = determineLinkGroupState(pageId, linkCount);
		const shouldDisplay = shouldDisplayAsRegularLink(state);
		const className = getLinkGroupStateClass(state);

		expect(state).toBe("missing");
		expect(shouldDisplay).toBe(false);
		expect(className).toBe("unilink--missing");
	});
});
