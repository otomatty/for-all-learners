/**
 * DayCell Component Tests
 *
 * Tests for the calendar day cell component that displays plugin extension badges.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/dashboard/_components/ActivityCalendar/CalendarGrid.tsx
 *
 * Dependencies:
 *   ├─ app/(protected)/dashboard/_components/ActivityCalendar/types.ts
 *   └─ app/(protected)/dashboard/_components/ActivityCalendar/ActivityIndicator.tsx
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DayCell } from "../DayCell";
import type { DailyActivitySummary } from "../types";

describe("DayCell", () => {
	const createMockDay = (
		overrides?: Partial<DailyActivitySummary>,
	): DailyActivitySummary => ({
		date: "2025-01-15",
		isToday: false,
		activityLevel: "good",
		learning: {
			totalCards: 20,
			reviewedCards: 15,
			newCards: 5,
			correctRate: 85,
			totalMinutes: 30,
		},
		notes: {
			pagesCreated: 0,
			pagesUpdated: 0,
			linksCreated: 0,
			totalEditMinutes: 0,
		},
		...overrides,
	});

	it("should render null cell when day is null", () => {
		const { container } = render(<DayCell day={null} isSelected={false} />);

		expect(container.firstChild).toHaveClass("bg-muted");
	});

	it("should render day number", () => {
		const day = createMockDay();
		render(<DayCell day={day} isSelected={false} />);

		expect(screen.getByText("15")).toBeInTheDocument();
	});

	it("should render activity level indicator", () => {
		const day = createMockDay({ activityLevel: "excellent" });
		const { container } = render(<DayCell day={day} isSelected={false} />);

		// Activity indicator should be rendered
		expect(container.querySelector(".text-base")).toBeInTheDocument();
	});

	it("should render plugin extension badges", () => {
		const day = createMockDay({
			pluginExtensions: [
				{
					badge: "42 lines",
					badgeColor: "bg-green-100 text-green-700",
					tooltip: "GitHub commits",
				},
				{
					badge: "📊",
					tooltip: "Stats",
				},
			],
		});

		render(<DayCell day={day} isSelected={false} />);

		expect(screen.getByText("42 lines")).toBeInTheDocument();
		expect(screen.getByText("📊")).toBeInTheDocument();
	});

	it("should apply custom badge color", () => {
		const day = createMockDay({
			pluginExtensions: [
				{
					badge: "Test",
					badgeColor: "bg-red-100 text-red-700",
				},
			],
		});

		const { container } = render(<DayCell day={day} isSelected={false} />);

		const badge = container.querySelector(".bg-red-100");
		expect(badge).toBeInTheDocument();
	});

	it("should apply default badge color when not specified", () => {
		const day = createMockDay({
			pluginExtensions: [
				{
					badge: "Test",
				},
			],
		});

		const { container } = render(<DayCell day={day} isSelected={false} />);

		const badge = container.querySelector(".bg-blue-100");
		expect(badge).toBeInTheDocument();
	});

	it("should show tooltip on badge hover", () => {
		const day = createMockDay({
			pluginExtensions: [
				{
					badge: "Test",
					tooltip: "Custom tooltip",
				},
			],
		});

		render(<DayCell day={day} isSelected={false} />);

		const badge = screen.getByText("Test");
		expect(badge).toHaveAttribute("title", "Custom tooltip");
	});

	it("should use badge text as tooltip when tooltip not provided", () => {
		const day = createMockDay({
			pluginExtensions: [
				{
					badge: "Test Badge",
				},
			],
		});

		render(<DayCell day={day} isSelected={false} />);

		const badge = screen.getByText("Test Badge");
		expect(badge).toHaveAttribute("title", "Test Badge");
	});

	it("should not render badges when pluginExtensions is empty", () => {
		const day = createMockDay({
			pluginExtensions: [],
		});

		const { container } = render(<DayCell day={day} isSelected={false} />);

		expect(container.querySelector(".flex.flex-wrap")).not.toBeInTheDocument();
	});

	it("should not render badge when badge text is missing", () => {
		const day = createMockDay({
			pluginExtensions: [
				{
					tooltip: "No badge",
				},
			],
		});

		render(<DayCell day={day} isSelected={false} />);

		expect(screen.queryByText("No badge")).not.toBeInTheDocument();
	});

	it("should render multiple badges", () => {
		const day = createMockDay({
			pluginExtensions: [
				{ badge: "Badge 1" },
				{ badge: "Badge 2" },
				{ badge: "Badge 3" },
			],
		});

		render(<DayCell day={day} isSelected={false} />);

		expect(screen.getByText("Badge 1")).toBeInTheDocument();
		expect(screen.getByText("Badge 2")).toBeInTheDocument();
		expect(screen.getByText("Badge 3")).toBeInTheDocument();
	});

	it("should highlight selected day", () => {
		const day = createMockDay();
		const { container } = render(<DayCell day={day} isSelected={true} />);

		const button = container.querySelector("button");
		expect(button).toHaveClass("ring-2", "ring-blue-500");
	});

	it("should highlight today", () => {
		const day = createMockDay({ isToday: true });
		const { container } = render(<DayCell day={day} isSelected={false} />);

		const button = container.querySelector("button");
		expect(button).toHaveClass("ring-2", "ring-blue-400");
	});
});
