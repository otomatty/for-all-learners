/**
 * Tests for TargetPageCard component
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { LinkGroupPage } from "@/types/link-group";
import { TargetPageCard } from "../target-page-card";

describe("TargetPageCard", () => {
	test("should render page title", () => {
		const page: LinkGroupPage = {
			id: "page-1",
			title: "React Framework",
			thumbnail_url: null,
			content_tiptap: { type: "doc", content: [] },
			updated_at: "2025-01-01T00:00:00Z",
		};

		render(<TargetPageCard page={page} />);

		expect(screen.getByText("React Framework")).toBeInTheDocument();
	});

	test("should render thumbnail when thumbnail_url exists", () => {
		const page: LinkGroupPage = {
			id: "page-2",
			title: "Vue Framework",
			thumbnail_url: "https://example.com/thumbnail.jpg",
			content_tiptap: { type: "doc", content: [] },
			updated_at: "2025-01-01T00:00:00Z",
		};

		render(<TargetPageCard page={page} />);

		const image = screen.getByRole("img", { name: "Vue Framework" });
		expect(image).toBeInTheDocument();
		expect(image).toHaveAttribute(
			"src",
			expect.stringContaining("thumbnail.jpg"),
		);
	});

	test("should render preview text when no thumbnail", () => {
		const page: LinkGroupPage = {
			id: "page-3",
			title: "Angular Framework",
			thumbnail_url: null,
			content_tiptap: {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "This is the preview text for Angular framework.",
							},
						],
					},
				],
			},
			updated_at: "2025-01-01T00:00:00Z",
		};

		render(<TargetPageCard page={page} />);

		expect(
			screen.getByText("This is the preview text for Angular framework."),
		).toBeInTheDocument();
	});

	test("should render empty state when no thumbnail and no content", () => {
		const page: LinkGroupPage = {
			id: "page-4",
			title: "Empty Page",
			thumbnail_url: null,
			content_tiptap: { type: "doc", content: [] },
			updated_at: "2025-01-01T00:00:00Z",
		};

		render(<TargetPageCard page={page} />);

		expect(screen.getByText("プレビューなし")).toBeInTheDocument();
	});

	test("should link to correct page", () => {
		const page: LinkGroupPage = {
			id: "page-5",
			title: "TypeScript",
			thumbnail_url: null,
			content_tiptap: { type: "doc", content: [] },
			updated_at: "2025-01-01T00:00:00Z",
		};

		render(<TargetPageCard page={page} />);

		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", "/pages/page-5");
	});

	test("should render with ring border styling", () => {
		const page: LinkGroupPage = {
			id: "page-6",
			title: "Test Page",
			thumbnail_url: null,
			content_tiptap: { type: "doc", content: [] },
			updated_at: "2025-01-01T00:00:00Z",
		};

		const { container } = render(<TargetPageCard page={page} />);

		const link = container.querySelector("a");
		expect(link).toHaveClass("ring-2", "ring-primary/20");
	});
});
