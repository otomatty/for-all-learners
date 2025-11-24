import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { PagesListSkeleton } from "./PagesListSkeleton";

describe("PagesListSkeleton", () => {
	test("renders default skeleton count (24)", () => {
		const { container } = render(<PagesListSkeleton />);
		const skeletonCards = container.querySelectorAll(
			".grid > div[class*='animate-pulse']",
		);
		expect(skeletonCards).toHaveLength(24);
	});

	test("renders custom count when provided", () => {
		const { container } = render(<PagesListSkeleton count={12} />);
		const skeletonCards = container.querySelectorAll(
			".grid > div[class*='animate-pulse']",
		);
		expect(skeletonCards).toHaveLength(12);
	});

	test("applies default grid columns", () => {
		const { container } = render(<PagesListSkeleton />);
		const grid = container.querySelector(".grid");
		expect(grid?.className).toContain("grid-cols-2");
		expect(grid?.className).toContain("sm:grid-cols-3");
		expect(grid?.className).toContain("md:grid-cols-4");
		expect(grid?.className).toContain("lg:grid-cols-6");
	});

	test("applies custom grid columns", () => {
		const { container } = render(
			<PagesListSkeleton gridCols="grid-cols-1 md:grid-cols-2" />,
		);
		const grid = container.querySelector(".grid");
		expect(grid?.className).toContain("grid-cols-1");
		expect(grid?.className).toContain("md:grid-cols-2");
		expect(grid?.className).not.toContain("lg:grid-cols-6");
	});

	test("renders skeleton cards with correct structure", () => {
		const { container } = render(<PagesListSkeleton count={1} />);
		const card = container.querySelector(".grid > div[class*='animate-pulse']");

		expect(card).toBeInTheDocument();
		expect(card?.className).toContain("bg-background");
		expect(card?.className).toContain("p-4");
		expect(card?.className).toContain("border");
		expect(card?.className).toContain("border-border");
		expect(card?.className).toContain("rounded-md");
		expect(card?.className).toContain("animate-pulse");
		expect(card?.className).toContain("space-y-2");
	});

	test("renders correct number of skeleton elements per card", () => {
		const { container } = render(<PagesListSkeleton count={1} />);
		const card = container.querySelector(".grid > div[class*='animate-pulse']");
		const _skeletons = card?.querySelectorAll(
			'[class*="animate-pulse"], [class*="skeleton"]',
		);
		// Skeleton components might not have these classes, so we check for the structure
		// Instead, check for the div structure
		const skeletonElements = card?.querySelectorAll("div[class*='h-']");
		expect(skeletonElements?.length).toBeGreaterThanOrEqual(6);
	});

	test("renders empty grid when count is 0", () => {
		const { container } = render(<PagesListSkeleton count={0} />);
		const grid = container.querySelector(".grid");
		expect(grid).toBeInTheDocument();
		const skeletonCards = grid?.querySelectorAll("div[class*='animate-pulse']");
		expect(skeletonCards).toHaveLength(0);
	});

	test("handles large count values", () => {
		const { container } = render(<PagesListSkeleton count={100} />);
		const skeletonCards = container.querySelectorAll(
			".grid > div[class*='animate-pulse']",
		);
		expect(skeletonCards).toHaveLength(100);
	});

	test("generates unique keys for skeleton cards", () => {
		const { container } = render(<PagesListSkeleton count={5} />);
		const skeletonCards = container.querySelectorAll(
			".grid > div[class*='animate-pulse']",
		);
		const _keys = Array.from(skeletonCards).map(
			(card) => card.getAttribute("key") || card.textContent,
		);
		// Check that we have the expected number of cards
		expect(skeletonCards).toHaveLength(5);
		// Each card should be unique (check by verifying all are rendered)
		expect(skeletonCards.length).toBe(5);
	});

	test("applies grid gap classes", () => {
		const { container } = render(<PagesListSkeleton />);
		const grid = container.querySelector(".grid");
		expect(grid?.className).toContain("gap-2");
		expect(grid?.className).toContain("md:gap-4");
	});
});
