/**
 * Tests for GroupedPageCard component
 * Note: happy-dom environment is already set up in vitest.config.mts
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { LinkGroupPage } from "@/types/link-group";
import { GroupedPageCard } from "../grouped-page-card";

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

		// Empty state: no thumbnail, no content preview (CardContent is empty)
		expect(screen.getByText("Empty Referencing Page")).toBeInTheDocument();
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
		expect(link).toHaveAttribute("href", "/notes/default/page-5");
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

		// The Card component should not have ring border classes (default variant)
		const card = container.querySelector('[data-slot="card"]');
		expect(card).not.toHaveClass("ring-2");
		expect(card).not.toHaveClass("ring-primary/20");
	});
});
