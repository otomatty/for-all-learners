import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useDashboardStats } from "../useDashboardStats";
import { mockSupabaseClient, renderHookWithProvider } from "./helpers";

vi.mock("@/lib/supabase/client");

describe("useDashboardStats", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	it("should fetch dashboard stats successfully", async () => {
		const userId = "test-user-id";

		// Mock all the count queries - each returns count: 10
		const mockCountResult = {
			count: 10,
			error: null,
		};

		const mockActionLogsResult = {
			data: [
				{ action_type: "audio", duration: 100 },
				{ action_type: "ocr", duration: 50 },
				{ action_type: "learn", duration: 200 },
				{ action_type: "memo", duration: 30 },
			],
			error: null,
		};

		// Track call count to differentiate between queries
		let callCount = 0;
		mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
			if (table === "action_logs") {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue(mockActionLogsResult),
					}),
				};
			}
			// For pages, cards, learning_logs tables
			// Queries 0, 3, 6 are total counts (eq only)
			// Queries 1, 2, 4, 5, 7, 8 use eq().lt()
			return {
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockImplementation(() => {
						const currentCall = callCount++;
						// Queries 0 (totalPages), 3 (totalCards), 6 (totalProblems) use eq() only
						if (currentCall === 0 || currentCall === 3 || currentCall === 6) {
							return Promise.resolve(mockCountResult);
						}
						// Other queries use eq().lt()
						return {
							lt: vi.fn().mockResolvedValue(mockCountResult),
						};
					}),
				}),
			};
		});

		const { result } = renderHookWithProvider(() => useDashboardStats(userId));

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual({
			totalPages: 10,
			previousTotalPages: 10,
			previousWeekTotalPages: 10,
			totalCards: 10,
			previousTotalCards: 10,
			previousWeekTotalCards: 10,
			totalProblems: 10,
			previousTotalProblems: 10,
			previousWeekTotalProblems: 10,
			totalTime: 380,
			audioTime: 100,
			ocrTime: 50,
			learnTime: 200,
			memoTime: 30,
		});
	});

	it("should handle errors gracefully", async () => {
		const userId = "test-user-id";

		mockSupabaseClient.from = vi.fn().mockReturnValue({
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					lt: vi.fn().mockResolvedValue({
						count: null,
						error: { message: "Database error" },
					}),
				}),
			}),
		});

		const { result } = renderHookWithProvider(() => useDashboardStats(userId));

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toEqual({ message: "Database error" });
	});

	it("should handle empty action logs", async () => {
		const userId = "test-user-id";

		const mockCountQuery = vi.fn().mockResolvedValue({
			count: 0,
			error: null,
		});

		const mockActionLogsQuery = vi.fn().mockResolvedValue({
			data: [],
			error: null,
		});

		mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
			if (table === "action_logs") {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue(mockActionLogsQuery()),
					}),
				};
			}
			return {
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						lt: vi.fn().mockResolvedValue(mockCountQuery()),
					}),
					lt: vi.fn().mockResolvedValue(mockCountQuery()),
				}),
			};
		});

		const { result } = renderHookWithProvider(() => useDashboardStats(userId));

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.totalTime).toBe(0);
		expect(result.current.data?.audioTime).toBe(0);
		expect(result.current.data?.ocrTime).toBe(0);
		expect(result.current.data?.learnTime).toBe(0);
		expect(result.current.data?.memoTime).toBe(0);
	});
});
