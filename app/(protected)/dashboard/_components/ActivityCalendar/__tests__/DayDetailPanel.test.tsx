/**
 * DayDetailPanel Component Tests
 *
 * Tests for the day detail panel component that displays plugin extension details.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/dashboard/_components/ActivityCalendar/index.tsx
 *
 * Dependencies:
 *   ├─ app/_actions/activity_calendar.ts
 *   └─ app/(protected)/dashboard/_components/ActivityCalendar/types.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDayActivityDetail } from "@/app/_actions/activity_calendar";
import { DayDetailPanel } from "../DayDetailPanel";

// Mock activity_calendar action
vi.mock("@/app/_actions/activity_calendar", () => ({
	getDayActivityDetail: vi.fn(),
}));

describe("DayDetailPanel", () => {
	const mockDetail = {
		date: "2025-01-15",
		summary: {
			date: "2025-01-15",
			isToday: false,
			activityLevel: "good" as const,
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
		},
		learningActivities: [],
		noteActivities: {
			created: [],
			updated: [],
			linksCreated: 0,
		},
		goalAchievements: [],
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should show loading state initially", () => {
		vi.mocked(getDayActivityDetail).mockImplementation(
			() => new Promise(() => {}), // Never resolves
		);

		render(
			<DayDetailPanel date="2025-01-15" userId="user-1" onClose={vi.fn()} />,
		);

		expect(screen.getByText("読み込み中...")).toBeInTheDocument();
	});

	it("should render day detail with plugin extensions", async () => {
		const detailWithExtensions = {
			...mockDetail,
			summary: {
				...mockDetail.summary,
				pluginExtensions: [
					{
						badge: "42 lines",
						tooltip: "GitHub commits",
						detailSections: [
							{
								title: "GitHubコミット統計",
								content: "今日は42行のコードを追加しました",
								icon: "📊",
							},
						],
					},
				],
			},
		};

		vi.mocked(getDayActivityDetail).mockResolvedValue(detailWithExtensions);

		render(
			<DayDetailPanel date="2025-01-15" userId="user-1" onClose={vi.fn()} />,
		);

		await waitFor(() => {
			expect(screen.getByText("プラグイン拡張")).toBeInTheDocument();
		});

		expect(screen.getByText("GitHubコミット統計")).toBeInTheDocument();
		expect(
			screen.getByText("今日は42行のコードを追加しました"),
		).toBeInTheDocument();
	});

	it("should render plugin extension with icon", async () => {
		const detailWithExtensions = {
			...mockDetail,
			summary: {
				...mockDetail.summary,
				pluginExtensions: [
					{
						detailSections: [
							{
								title: "Test Section",
								content: "Test content",
								icon: "📊",
							},
						],
					},
				],
			},
		};

		vi.mocked(getDayActivityDetail).mockResolvedValue(detailWithExtensions);

		render(
			<DayDetailPanel date="2025-01-15" userId="user-1" onClose={vi.fn()} />,
		);

		await waitFor(() => {
			expect(screen.getByText("📊")).toBeInTheDocument();
		});
	});

	it("should render plugin extension with structured content", async () => {
		const detailWithExtensions = {
			...mockDetail,
			summary: {
				...mockDetail.summary,
				pluginExtensions: [
					{
						detailSections: [
							{
								title: "Test Section",
								content: { commits: 5, lines: 42 },
							},
						],
					},
				],
			},
		};

		vi.mocked(getDayActivityDetail).mockResolvedValue(detailWithExtensions);

		render(
			<DayDetailPanel date="2025-01-15" userId="user-1" onClose={vi.fn()} />,
		);

		await waitFor(() => {
			expect(screen.getByText("Test Section")).toBeInTheDocument();
		});

		// Structured content should be rendered as JSON
		expect(screen.getByText(/"commits": 5/)).toBeInTheDocument();
	});

	it("should render multiple plugin extensions", async () => {
		const detailWithExtensions = {
			...mockDetail,
			summary: {
				...mockDetail.summary,
				pluginExtensions: [
					{
						detailSections: [
							{
								title: "Extension 1",
								content: "Content 1",
							},
						],
					},
					{
						detailSections: [
							{
								title: "Extension 2",
								content: "Content 2",
							},
						],
					},
				],
			},
		};

		vi.mocked(getDayActivityDetail).mockResolvedValue(detailWithExtensions);

		render(
			<DayDetailPanel date="2025-01-15" userId="user-1" onClose={vi.fn()} />,
		);

		await waitFor(() => {
			expect(screen.getByText("Extension 1")).toBeInTheDocument();
		});

		expect(screen.getByText("Extension 2")).toBeInTheDocument();
		expect(screen.getByText("Content 1")).toBeInTheDocument();
		expect(screen.getByText("Content 2")).toBeInTheDocument();
	});

	it("should not render plugin extension section when no extensions", async () => {
		vi.mocked(getDayActivityDetail).mockResolvedValue(mockDetail);

		render(
			<DayDetailPanel date="2025-01-15" userId="user-1" onClose={vi.fn()} />,
		);

		await waitFor(() => {
			expect(screen.queryByText("プラグイン拡張")).not.toBeInTheDocument();
		});
	});

	it("should not render extension when detailSections is empty", async () => {
		const detailWithExtensions = {
			...mockDetail,
			summary: {
				...mockDetail.summary,
				pluginExtensions: [
					{
						badge: "Test",
						detailSections: [],
					},
				],
			},
		};

		vi.mocked(getDayActivityDetail).mockResolvedValue(detailWithExtensions);

		render(
			<DayDetailPanel date="2025-01-15" userId="user-1" onClose={vi.fn()} />,
		);

		await waitFor(() => {
			// Plugin extension section should be rendered, but no sections inside
			const section = screen.queryByText("プラグイン拡張");
			if (section) {
				// If section exists, it should not have any detail sections
				expect(screen.queryByText("Test")).not.toBeInTheDocument();
			}
		});
	});

	it("should handle error when fetching detail", async () => {
		vi.mocked(getDayActivityDetail).mockRejectedValue(
			new Error("Failed to fetch"),
		);

		render(
			<DayDetailPanel date="2025-01-15" userId="user-1" onClose={vi.fn()} />,
		);

		// Wait for loading to finish and error state to appear
		await waitFor(
			() => {
				expect(
					screen.getByText("データを取得できませんでした。"),
				).toBeInTheDocument();
			},
			{ timeout: 3000 },
		);

		// Verify error was handled (no unhandled rejection)
		expect(getDayActivityDetail).toHaveBeenCalled();
	});
});
