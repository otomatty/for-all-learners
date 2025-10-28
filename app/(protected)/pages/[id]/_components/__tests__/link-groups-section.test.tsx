/**
 * Tests for LinkGroupsSection component
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { LinkGroupForUI } from "@/types/link-group";
import { LinkGroupsSection } from "../link-groups-section";

describe("LinkGroupsSection", () => {
	test("should render nothing when linkGroups is empty", () => {
		const { container } = render(
			<LinkGroupsSection linkGroups={[]} noteSlug={undefined} />,
		);
		expect(container.firstChild).toBeNull();
	});

	test("should render section with link groups", () => {
		const mockLinkGroups: LinkGroupForUI[] = [
			{
				key: "react",
				displayText: "React",
				linkGroupId: "link-group-1",
				pageId: "page-1",
				linkCount: 3,
				targetPage: {
					id: "page-1",
					title: "React Framework",
					thumbnail_url: null,
					content_tiptap: { type: "doc", content: [] },
					updated_at: "2025-01-01T00:00:00Z",
				},
				referencingPages: [
					{
						id: "page-2",
						title: "Page 2",
						thumbnail_url: null,
						content_tiptap: { type: "doc", content: [] },
						updated_at: "2025-01-01T00:00:00Z",
					},
				],
			},
		];

		render(
			<LinkGroupsSection linkGroups={mockLinkGroups} noteSlug={undefined} />,
		);

		expect(screen.getByText("関連ページ")).toBeInTheDocument();
		expect(screen.getByText("React")).toBeInTheDocument();
		expect(screen.getByText("React Framework")).toBeInTheDocument();
		expect(screen.getByText("Page 2")).toBeInTheDocument();
	});

	test("should render create page card when target page does not exist", () => {
		const mockLinkGroups: LinkGroupForUI[] = [
			{
				key: "undefined-link",
				displayText: "Undefined Link",
				linkGroupId: "link-group-2",
				pageId: null,
				linkCount: 2,
				targetPage: null,
				referencingPages: [
					{
						id: "page-3",
						title: "Page 3",
						thumbnail_url: null,
						content_tiptap: { type: "doc", content: [] },
						updated_at: "2025-01-01T00:00:00Z",
					},
				],
			},
		];

		render(
			<LinkGroupsSection linkGroups={mockLinkGroups} noteSlug={undefined} />,
		);

		expect(screen.getByText("Undefined Link")).toBeInTheDocument();
		expect(screen.getByText("新規ページを作成")).toBeInTheDocument();
		expect(screen.getByText("Page 3")).toBeInTheDocument();
	});

	test("should render multiple link groups", () => {
		const mockLinkGroups: LinkGroupForUI[] = [
			{
				key: "react",
				displayText: "React",
				linkGroupId: "link-group-1",
				pageId: "page-1",
				linkCount: 2,
				targetPage: {
					id: "page-1",
					title: "React",
					thumbnail_url: null,
					content_tiptap: { type: "doc", content: [] },
					updated_at: "2025-01-01T00:00:00Z",
				},
				referencingPages: [],
			},
			{
				key: "vue",
				displayText: "Vue",
				linkGroupId: "link-group-2",
				pageId: "page-2",
				linkCount: 2,
				targetPage: {
					id: "page-2",
					title: "Vue",
					thumbnail_url: null,
					content_tiptap: { type: "doc", content: [] },
					updated_at: "2025-01-01T00:00:00Z",
				},
				referencingPages: [],
			},
		];

		render(
			<LinkGroupsSection linkGroups={mockLinkGroups} noteSlug={undefined} />,
		);

		expect(screen.getByText("React")).toBeInTheDocument();
		expect(screen.getByText("Vue")).toBeInTheDocument();
	});

	test("should render multiple referencing pages", () => {
		const mockLinkGroups: LinkGroupForUI[] = [
			{
				key: "typescript",
				displayText: "TypeScript",
				linkGroupId: "link-group-3",
				pageId: "page-target",
				linkCount: 4,
				targetPage: {
					id: "page-target",
					title: "TypeScript",
					thumbnail_url: null,
					content_tiptap: { type: "doc", content: [] },
					updated_at: "2025-01-01T00:00:00Z",
				},
				referencingPages: [
					{
						id: "page-ref-1",
						title: "Ref Page 1",
						thumbnail_url: null,
						content_tiptap: { type: "doc", content: [] },
						updated_at: "2025-01-01T00:00:00Z",
					},
					{
						id: "page-ref-2",
						title: "Ref Page 2",
						thumbnail_url: null,
						content_tiptap: { type: "doc", content: [] },
						updated_at: "2025-01-01T00:00:00Z",
					},
					{
						id: "page-ref-3",
						title: "Ref Page 3",
						thumbnail_url: null,
						content_tiptap: { type: "doc", content: [] },
						updated_at: "2025-01-01T00:00:00Z",
					},
				],
			},
		];

		render(
			<LinkGroupsSection linkGroups={mockLinkGroups} noteSlug={undefined} />,
		);

		expect(screen.getByText("TypeScript")).toBeInTheDocument();
		expect(screen.getByText("Ref Page 1")).toBeInTheDocument();
		expect(screen.getByText("Ref Page 2")).toBeInTheDocument();
		expect(screen.getByText("Ref Page 3")).toBeInTheDocument();
	});

	test("should render with noteSlug prop", () => {
		const mockLinkGroups: LinkGroupForUI[] = [
			{
				key: "angular",
				displayText: "Angular",
				linkGroupId: "link-group-4",
				pageId: null,
				linkCount: 2,
				targetPage: null,
				referencingPages: [],
			},
		];

		render(
			<LinkGroupsSection linkGroups={mockLinkGroups} noteSlug="test-note" />,
		);

		expect(screen.getByText("Angular")).toBeInTheDocument();
		expect(screen.getByText("新規ページを作成")).toBeInTheDocument();
	});
});
