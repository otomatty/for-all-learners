/**
 * Tests for PageDetailLoading component
 * Tests for Phase 1: Loading state UI
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import PageDetailLoading from "../loading";

describe("PageDetailLoading", () => {
	test("renders back link", () => {
		render(<PageDetailLoading />);
		expect(screen.getByText("ページ一覧に戻る")).toBeInTheDocument();
	});

	test("renders skeleton UI elements", () => {
		const { container } = render(<PageDetailLoading />);

		// Check for skeleton elements
		const skeletons = container.querySelectorAll("[class*='animate-pulse']");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	test("renders card structure", () => {
		const { container } = render(<PageDetailLoading />);

		// Check for card element
		const card = container.querySelector("[class*='card']");
		expect(card).toBeInTheDocument();
	});

	test("renders multiple skeleton lines for content", () => {
		const { container } = render(<PageDetailLoading />);

		// Check for skeleton elements in content area
		const contentSkeletons = container.querySelectorAll(
			"[class*='animate-pulse'][class*='h-4']",
		);
		expect(contentSkeletons.length).toBeGreaterThanOrEqual(3);
	});
});
