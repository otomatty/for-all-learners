/**
 * Tests for GroupedPageCard component
 * @vitest-environment jsdom
 */

import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { GroupedPageCard } from "../grouped-page-card";
import type { LinkGroupPage } from "@/types/link-group";

describe("GroupedPageCard", () => {
	test("should render page title", () => {
		const page: LinkGroupPage = {
			id: "page-1",
			title: "Referencing Page 1",
			thumbnail_url: null,
			content_tiptap: { type: "doc", content: [] },
			updated_at: "2025-01-01T00:00:00Z",
		};

		render(<GroupedPageCard page={page} />);

		expect(screen.getByText("Referencing Page 1")).toBeInTheDocument();
	});

	test("should render thumbnail when thumbnail_url exists", () => {
		const page: LinkGroupPage = {
			id: "page-2",
			title: "Referencing Page 2",
			thumbnail_url: "https://example.com/thumb.jpg",
			content_tiptap: { type: "doc", content: [] },
			updated_at: "2025-01-01T00:00:00Z",
		};

		render(<GroupedPageCard page={page} />);

		const image = screen.getByRole("img", { name: "Referencing Page 2" });
		expect(image).toBeInTheDocument();
		expect(image).toHaveAttribute("src", expect.stringContaining("thumb.jpg"));
	});

	test("should render preview text when no thumbnail", () => {
		const page: LinkGroupPage = {
			id: "page-3",
			title: "Referencing Page 3",
			thumbnail_url: null,
			content_tiptap: {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "This page references the target link.",
							},
						],
					},
				],
			},
			updated_at: "2025-01-01T00:00:00Z",
		};

		render(<GroupedPageCard page={page} />);

		expect(
			screen.getByText("This page references the target link."),
		).toBeInTheDocument();
	});

	test("should render empty state when no thumbnail and no content", () => {
		const page: LinkGroupPage = {
			id: "page-4",
			title: "Empty Referencing Page",
			thumbnail_url: null,
			content_tiptap: { type: "doc", content: [] },
			updated_at: "2025-01-01T00:00:00Z",
		};

		render(<GroupedPageCard page={page} />);

		expect(screen.getByText("プレビューなし")).toBeInTheDocument();
	});

	test("should link to correct page", () => {
		const page: LinkGroupPage = {
			id: "page-5",
			title: "Link Test Page",
			thumbnail_url: null,
			content_tiptap: { type: "doc", content: [] },
			updated_at: "2025-01-01T00:00:00Z",
		};

		render(<GroupedPageCard page={page} />);

		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", "/pages/page-5");
	});

	test("should not have ring border styling", () => {
		const page: LinkGroupPage = {
			id: "page-6",
			title: "Test Page",
			thumbnail_url: null,
			content_tiptap: { type: "doc", content: [] },
			updated_at: "2025-01-01T00:00:00Z",
		};

		const { container } = render(<GroupedPageCard page={page} />);

		const link = container.querySelector("a");
		expect(link).not.toHaveClass("ring-2");
		expect(link).not.toHaveClass("ring-primary/20");
	});
});
