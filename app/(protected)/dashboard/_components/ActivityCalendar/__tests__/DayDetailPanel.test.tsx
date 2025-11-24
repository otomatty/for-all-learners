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

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDayActivityDetail } from "@/hooks/activity_calendar";
import { DayDetailPanel } from "../DayDetailPanel";

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
	createClient: vi.fn(() => ({
		auth: {
			getUser: vi.fn().mockResolvedValue({
				data: { user: { id: "user-1" } },
				error: null,
			}),
		},
		from: vi.fn().mockReturnValue({
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			or: vi.fn().mockReturnThis(),
			gte: vi.fn().mockReturnThis(),
			lte: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({
				data: [],
				error: null,
			}),
		}),
	})),
}));

// Mock useDayActivityDetail hook
vi.mock("@/hooks/activity_calendar", () => ({
	useDayActivityDetail: vi.fn(),
}));

// Mock calendar registry
vi.mock("@/lib/plugins/calendar-registry", () => ({
	getDailyExtensionData: vi.fn().mockResolvedValue([]),
}));

// Create QueryClient wrapper for tests
function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

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
		// Default mock: return loading state
		vi.mocked(useDayActivityDetail).mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: false,
			error: null,
			isPending: false,
			isSuccess: false,
			isLoadingError: false,
			isRefetchError: false,
			status: "pending",
			fetchStatus: "idle",
			refetch: vi.fn(),
			dataUpdatedAt: 0,
			errorUpdatedAt: 0,
			failureCount: 0,
			failureReason: null,
			errorUpdateCount: 0,
			isFetched: false,
			isFetchedAfterMount: false,
			isInitialLoading: false,
			isPaused: false,
			isPlaceholderData: false,
			isRefetching: false,
			isStale: false,
			refetchOnMountOrArgChange: false,
		} as unknown as ReturnType<typeof useDayActivityDetail>);
	});

	it("should show loading state initially", () => {
		vi.mocked(useDayActivityDetail).mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
			error: null,
			isPending: true,
			isSuccess: false,
			isLoadingError: false,
			isRefetchError: false,
			status: "pending",
			fetchStatus: "fetching",
			refetch: vi.fn(),
			dataUpdatedAt: 0,
			errorUpdatedAt: 0,
			failureCount: 0,
			failureReason: null,
			errorUpdateCount: 0,
			isFetched: false,
			isFetchedAfterMount: false,
			isInitialLoading: true,
			isPaused: false,
			isPlaceholderData: false,
			isRefetching: false,
			isStale: false,
			refetchOnMountOrArgChange: false,
		} as unknown as ReturnType<typeof useDayActivityDetail>);

		render(
			<DayDetailPanel date="2025-01-15" userId="user-1" onClose={vi.fn()} />,
			{ wrapper: createWrapper() },
		);

		expect(screen.getByText("読み込み中...")).toBeInTheDocument();
	});

	it("should render day detail with plugin extensions", async () => {
		const { getDailyExtensionData } = await import(
			"@/lib/plugins/calendar-registry"
		);

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

		vi.mocked(useDayActivityDetail).mockReturnValue({
			data: mockDetail,
			isLoading: false,
			isError: false,
			error: null,
			isPending: false,
			isSuccess: true,
			isLoadingError: false,
			isRefetchError: false,
			status: "success",
			fetchStatus: "idle",
			refetch: vi.fn(),
			dataUpdatedAt: Date.now(),
			errorUpdatedAt: 0,
			failureCount: 0,
			failureReason: null,
			errorUpdateCount: 0,
			isFetched: true,
			isFetchedAfterMount: true,
			isInitialLoading: false,
			isPaused: false,
			isPlaceholderData: false,
			isRefetching: false,
			isStale: false,
			refetchOnMountOrArgChange: false,
		} as unknown as ReturnType<typeof useDayActivityDetail>);
		vi.mocked(getDailyExtensionData).mockResolvedValue(
			detailWithExtensions.summary.pluginExtensions || [],
		);

		render(
			<DayDetailPanel date="2025-01-15" userId="user-1" onClose={vi.fn()} />,
			{ wrapper: createWrapper() },
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
		const { getDailyExtensionData } = await import(
			"@/lib/plugins/calendar-registry"
		);

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

		vi.mocked(useDayActivityDetail).mockReturnValue({
			data: mockDetail,
			isLoading: false,
			isError: false,
			error: null,
			isPending: false,
			isSuccess: true,
			isLoadingError: false,
			isRefetchError: false,
			status: "success",
			fetchStatus: "idle",
			refetch: vi.fn(),
			dataUpdatedAt: Date.now(),
			errorUpdatedAt: 0,
			failureCount: 0,
			failureReason: null,
			errorUpdateCount: 0,
			isFetched: true,
			isFetchedAfterMount: true,
			isInitialLoading: false,
			isPaused: false,
			isPlaceholderData: false,
			isRefetching: false,
			isStale: false,
			refetchOnMountOrArgChange: false,
		} as unknown as ReturnType<typeof useDayActivityDetail>);
		vi.mocked(getDailyExtensionData).mockResolvedValue(
			detailWithExtensions.summary.pluginExtensions || [],
		);

		render(
			<DayDetailPanel date="2025-01-15" userId="user-1" onClose={vi.fn()} />,
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(screen.getByText("📊")).toBeInTheDocument();
		});
	});

	it("should render plugin extension with structured content", async () => {
		const { getDailyExtensionData } = await import(
			"@/lib/plugins/calendar-registry"
		);

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

		vi.mocked(useDayActivityDetail).mockReturnValue({
			data: mockDetail,
			isLoading: false,
			isError: false,
			error: null,
			isPending: false,
			isSuccess: true,
			isLoadingError: false,
			isRefetchError: false,
			status: "success",
			fetchStatus: "idle",
			refetch: vi.fn(),
			dataUpdatedAt: Date.now(),
			errorUpdatedAt: 0,
			failureCount: 0,
			failureReason: null,
			errorUpdateCount: 0,
			isFetched: true,
			isFetchedAfterMount: true,
			isInitialLoading: false,
			isPaused: false,
			isPlaceholderData: false,
			isRefetching: false,
			isStale: false,
			refetchOnMountOrArgChange: false,
		} as unknown as ReturnType<typeof useDayActivityDetail>);
		vi.mocked(getDailyExtensionData).mockResolvedValue(
			detailWithExtensions.summary.pluginExtensions || [],
		);

		render(
			<DayDetailPanel date="2025-01-15" userId="user-1" onClose={vi.fn()} />,
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(screen.getByText("Test Section")).toBeInTheDocument();
		});

		// Structured content should be rendered as JSON
		expect(screen.getByText(/"commits": 5/)).toBeInTheDocument();
	});

	it("should render multiple plugin extensions", async () => {
		const { getDailyExtensionData } = await import(
			"@/lib/plugins/calendar-registry"
		);

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

		vi.mocked(useDayActivityDetail).mockReturnValue({
			data: mockDetail,
			isLoading: false,
			isError: false,
			error: null,
			isPending: false,
			isSuccess: true,
			isLoadingError: false,
			isRefetchError: false,
			status: "success",
			fetchStatus: "idle",
			refetch: vi.fn(),
			dataUpdatedAt: Date.now(),
			errorUpdatedAt: 0,
			failureCount: 0,
			failureReason: null,
			errorUpdateCount: 0,
			isFetched: true,
			isFetchedAfterMount: true,
			isInitialLoading: false,
			isPaused: false,
			isPlaceholderData: false,
			isRefetching: false,
			isStale: false,
			refetchOnMountOrArgChange: false,
		} as unknown as ReturnType<typeof useDayActivityDetail>);
		vi.mocked(getDailyExtensionData).mockResolvedValue(
			detailWithExtensions.summary.pluginExtensions || [],
		);

		render(
			<DayDetailPanel date="2025-01-15" userId="user-1" onClose={vi.fn()} />,
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(screen.getByText("Extension 1")).toBeInTheDocument();
		});

		expect(screen.getByText("Extension 2")).toBeInTheDocument();
		expect(screen.getByText("Content 1")).toBeInTheDocument();
		expect(screen.getByText("Content 2")).toBeInTheDocument();
	});

	it("should not render plugin extension section when no extensions", async () => {
		vi.mocked(useDayActivityDetail).mockReturnValue({
			data: mockDetail,
			isLoading: false,
			isError: false,
			error: null,
			isPending: false,
			isSuccess: true,
			isLoadingError: false,
			isRefetchError: false,
			status: "success",
			fetchStatus: "idle",
			refetch: vi.fn(),
			dataUpdatedAt: Date.now(),
			errorUpdatedAt: 0,
			failureCount: 0,
			failureReason: null,
			errorUpdateCount: 0,
			isFetched: true,
			isFetchedAfterMount: true,
			isInitialLoading: false,
			isPaused: false,
			isPlaceholderData: false,
			isRefetching: false,
			isStale: false,
			refetchOnMountOrArgChange: false,
		} as unknown as ReturnType<typeof useDayActivityDetail>);

		render(
			<DayDetailPanel date="2025-01-15" userId="user-1" onClose={vi.fn()} />,
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(screen.queryByText("プラグイン拡張")).not.toBeInTheDocument();
		});
	});

	it("should not render extension when detailSections is empty", async () => {
		const { getDailyExtensionData } = await import(
			"@/lib/plugins/calendar-registry"
		);

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

		vi.mocked(useDayActivityDetail).mockReturnValue({
			data: mockDetail,
			isLoading: false,
			isError: false,
			error: null,
			isPending: false,
			isSuccess: true,
			isLoadingError: false,
			isRefetchError: false,
			status: "success",
			fetchStatus: "idle",
			refetch: vi.fn(),
			dataUpdatedAt: Date.now(),
			errorUpdatedAt: 0,
			failureCount: 0,
			failureReason: null,
			errorUpdateCount: 0,
			isFetched: true,
			isFetchedAfterMount: true,
			isInitialLoading: false,
			isPaused: false,
			isPlaceholderData: false,
			isRefetching: false,
			isStale: false,
			refetchOnMountOrArgChange: false,
		} as unknown as ReturnType<typeof useDayActivityDetail>);
		vi.mocked(getDailyExtensionData).mockResolvedValue(
			detailWithExtensions.summary.pluginExtensions || [],
		);

		render(
			<DayDetailPanel date="2025-01-15" userId="user-1" onClose={vi.fn()} />,
			{ wrapper: createWrapper() },
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
		vi.mocked(useDayActivityDetail).mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			error: new Error("Failed to fetch"),
			isPending: false,
			isSuccess: false,
			isLoadingError: true,
			isRefetchError: false,
			status: "error",
			fetchStatus: "idle",
			refetch: vi.fn(),
			dataUpdatedAt: 0,
			errorUpdatedAt: Date.now(),
			failureCount: 1,
			failureReason: new Error("Failed to fetch"),
			errorUpdateCount: 1,
			isFetched: true,
			isFetchedAfterMount: true,
			isInitialLoading: false,
			isPaused: false,
			isPlaceholderData: false,
			isRefetching: false,
			isStale: false,
			refetchOnMountOrArgChange: false,
		} as unknown as ReturnType<typeof useDayActivityDetail>);

		render(
			<DayDetailPanel date="2025-01-15" userId="user-1" onClose={vi.fn()} />,
			{ wrapper: createWrapper() },
		);

		// Wait for error state to appear
		await waitFor(
			() => {
				expect(
					screen.getByText("データを取得できませんでした。"),
				).toBeInTheDocument();
			},
			{ timeout: 3000 },
		);
	});
});
