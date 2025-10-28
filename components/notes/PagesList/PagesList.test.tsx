import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { Database } from "@/types/database.types";
import { PagesList } from "./PagesList";

type PageRow = Database["public"]["Tables"]["pages"]["Row"];

const mockPages: PageRow[] = [
	{
		id: "1",
		user_id: "user-1",
		title: "Test Page 1",
		thumbnail_url: null,
		content_tiptap: {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [{ type: "text", text: "Test content 1" }],
				},
			],
		},
		scrapbox_page_id: null,
		scrapbox_page_list_synced_at: null,
		scrapbox_page_content_synced_at: null,
		is_public: false,
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: "2",
		user_id: "user-1",
		title: "Test Page 2",
		thumbnail_url: "https://example.com/image.jpg",
		content_tiptap: {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [{ type: "text", text: "Test content 2" }],
				},
			],
		},
		scrapbox_page_id: null,
		scrapbox_page_list_synced_at: null,
		scrapbox_page_content_synced_at: null,
		is_public: false,
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
];

describe("PagesList", () => {
	test("renders empty state when no pages", () => {
		render(<PagesList pages={[]} />);
		expect(screen.getByText("ページがありません")).toBeInTheDocument();
	});

	test("renders page cards when pages exist", () => {
		render(<PagesList pages={mockPages} slug="test-note" />);
		expect(screen.getByText("Test Page 1")).toBeInTheDocument();
		expect(screen.getByText("Test Page 2")).toBeInTheDocument();
	});

	test("uses default slug when not provided", () => {
		const { container } = render(<PagesList pages={mockPages} />);
		const links = container.querySelectorAll("a");
		// biome-ignore lint/style/noNonNullAssertion: test code
		expect(links[0]!.getAttribute("href")).toBe("/notes/all-pages/1");
	});

	test("uses provided slug for links", () => {
		const { container } = render(
			<PagesList pages={mockPages} slug="my-note" />,
		);
		const links = container.querySelectorAll("a");
		// biome-ignore lint/style/noNonNullAssertion: test code
		expect(links[0]!.getAttribute("href")).toBe("/notes/my-note/1");
	});

	test("applies custom grid columns", () => {
		const { container } = render(
			<PagesList pages={mockPages} gridCols="grid-cols-1 md:grid-cols-2" />,
		);
		const grid = container.querySelector(".grid");
		expect(grid?.className).toContain("grid-cols-1");
		expect(grid?.className).toContain("md:grid-cols-2");
	});
});
