import { describe, test, expect } from "vitest";
import {
	extractLinksFromContent,
	countLinksByKey,
	getUniqueLinkKeys,
} from "../extractLinksFromContent";
import type { JSONContent } from "@tiptap/core";

describe("extractLinksFromContent", () => {
	test("should extract links from simple content", () => {
		const content: JSONContent = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "Check out ",
						},
						{
							type: "text",
							text: "React Documentation",
							marks: [
								{
									type: "unilink",
									attrs: {
										text: "React Documentation",
										variant: "bracket",
										key: "react documentation",
										markId: "mark-test-001",
									},
								},
							],
						},
					],
				},
			],
		};

		const links = extractLinksFromContent(content);

		expect(links).toHaveLength(1);
		expect(links[0]).toMatchObject({
			key: "react documentation",
			text: "React Documentation",
			variant: "bracket",
		});
	});

	test("should extract multiple links from content", () => {
		const content: JSONContent = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "Link1",
							marks: [
								{
									type: "unilink",
									attrs: {
										text: "First Link",
										variant: "bracket",
										key: "first link",
										markId: "mark-test-002",
									},
								},
							],
						},
						{
							type: "text",
							text: " and ",
						},
						{
							type: "text",
							text: "Link2",
							marks: [
								{
									type: "unilink",
									attrs: {
										text: "Second Link",
										variant: "bracket",
										key: "second link",
										markId: "mark-test-003",
									},
								},
							],
						},
					],
				},
			],
		};

		const links = extractLinksFromContent(content);

		expect(links).toHaveLength(2);
		expect(links[0].text).toBe("First Link");
		expect(links[1].text).toBe("Second Link");
	});

	test("should extract links from nested content", () => {
		const content: JSONContent = {
			type: "doc",
			content: [
				{
					type: "heading",
					attrs: { level: 1 },
					content: [
						{
							type: "text",
							text: "Title",
							marks: [
								{
									type: "unilink",
									attrs: {
										text: "Header Link",
										variant: "bracket",
										key: "header link",
										markId: "mark-test-004",
									},
								},
							],
						},
					],
				},
				{
					type: "blockquote",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "Quote",
									marks: [
										{
											type: "unilink",
											attrs: {
												text: "Quote Link",
												variant: "bracket",
												key: "quote link",
												markId: "mark-test-005",
											},
										},
									],
								},
							],
						},
					],
				},
			],
		};

		const links = extractLinksFromContent(content);

		expect(links).toHaveLength(2);
		expect(links[0].text).toBe("Header Link");
		expect(links[1].text).toBe("Quote Link");
	});

	test("should normalize keys correctly", () => {
		const content: JSONContent = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "Test",
							marks: [
								{
									type: "unilink",
									attrs: {
										text: "React  Documentation",
										variant: "bracket",
										key: "react documentation",
										markId: "mark-test-006",
									},
								},
							],
						},
					],
				},
			],
		};

		const links = extractLinksFromContent(content);

		expect(links[0].key).toBe("react documentation");
	});

	test("should handle external links", () => {
		const content: JSONContent = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "Google",
							marks: [
								{
									type: "unilink",
									attrs: {
										text: "Google",
										variant: "bracket",
										key: "google",
										markId: "mark-test-007",
										href: "https://google.com",
									},
								},
							],
						},
					],
				},
			],
		};

		const links = extractLinksFromContent(content);

		expect(links).toHaveLength(1);
		expect(links[0].variant).toBe("bracket");
	});

	test("should handle tag links", () => {
		const content: JSONContent = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "JavaScript",
							marks: [
								{
									type: "unilink",
									attrs: {
										text: "JavaScript",
										variant: "tag",
										key: "javascript",
										markId: "mark-test-008",
									},
								},
							],
						},
					],
				},
			],
		};

		const links = extractLinksFromContent(content);

		expect(links).toHaveLength(1);
		expect(links[0].variant).toBe("tag");
	});

	test("should return empty array for content without links", () => {
		const content: JSONContent = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "Plain text without links",
						},
					],
				},
			],
		};

		const links = extractLinksFromContent(content);

		expect(links).toHaveLength(0);
	});

	test("should handle empty content", () => {
		const content: JSONContent = {
			type: "doc",
			content: [],
		};

		const links = extractLinksFromContent(content);

		expect(links).toHaveLength(0);
	});

	test("should extract pageId when present", () => {
		const content: JSONContent = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "Link",
							marks: [
								{
									type: "unilink",
									attrs: {
										text: "Page Link",
										variant: "bracket",
										key: "page link",
										markId: "mark-test-009",
										pageId: "page-123",
									},
								},
							],
						},
					],
				},
			],
		};

		const links = extractLinksFromContent(content);

		expect(links[0].pageId).toBe("page-123");
	});
});

describe("countLinksByKey", () => {
	test("should count links by key", () => {
		const content: JSONContent = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "Link1",
							marks: [
								{
									type: "unilink",
									attrs: {
										text: "React",
										variant: "bracket",
										key: "react",
										markId: "mark-test-010",
									},
								},
							],
						},
						{
							type: "text",
							text: " ",
						},
						{
							type: "text",
							text: "Link2",
							marks: [
								{
									type: "unilink",
									attrs: {
										text: "React",
										variant: "bracket",
										key: "react",
										markId: "mark-test-011",
									},
								},
							],
						},
						{
							type: "text",
							text: " ",
						},
						{
							type: "text",
							text: "Link3",
							marks: [
								{
									type: "unilink",
									attrs: {
										text: "Vue",
										variant: "bracket",
										key: "vue",
										markId: "mark-test-012",
									},
								},
							],
						},
					],
				},
			],
		};

		const counts = countLinksByKey(content);

		expect(counts).toEqual(
			new Map([
				["react", 2],
				["vue", 1],
			]),
		);
	});

	test("should return empty object for content without links", () => {
		const content: JSONContent = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "No links",
						},
					],
				},
			],
		};

		const counts = countLinksByKey(content);

		expect(counts).toEqual(new Map());
	});
});

describe("getUniqueLinkKeys", () => {
	test("should return unique link keys", () => {
		const content: JSONContent = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "Link1",
							marks: [
								{
									type: "unilink",
									attrs: {
										text: "React",
										variant: "bracket",
										key: "react",
										markId: "mark-test-013",
									},
								},
							],
						},
						{
							type: "text",
							text: " ",
						},
						{
							type: "text",
							text: "Link2",
							marks: [
								{
									type: "unilink",
									attrs: {
										text: "React",
										variant: "bracket",
										key: "react",
										markId: "mark-test-014",
									},
								},
							],
						},
						{
							type: "text",
							text: " ",
						},
						{
							type: "text",
							text: "Link3",
							marks: [
								{
									type: "unilink",
									attrs: {
										text: "Vue",
										variant: "bracket",
										key: "vue",
										markId: "mark-test-015",
									},
								},
							],
						},
					],
				},
			],
		};

		const keys = getUniqueLinkKeys(content);

		expect(keys).toHaveLength(2);
		expect(keys).toContain("react");
		expect(keys).toContain("vue");
	});

	test("should return empty array for content without links", () => {
		const content: JSONContent = {
			type: "doc",
			content: [],
		};

		const keys = getUniqueLinkKeys(content);

		expect(keys).toHaveLength(0);
	});
});
