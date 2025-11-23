import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
	useIsUserPaid,
	useUserPlan,
	useUserPlanFeatures,
	useUserSubscription,
} from "../useSubscriptions";
import { mockSupabaseClient, renderHookWithProvider } from "./helpers";

vi.mock("@/lib/supabase/client");

describe("useSubscriptions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	describe("useUserSubscription", () => {
		it("should fetch user subscription successfully", async () => {
			const userId = "user-123";
			const mockSubscription = {
				id: "sub-123",
				user_id: userId,
				plan_id: "premium",
				status: "active",
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z",
			};

			const maybeSingleMock = vi.fn().mockResolvedValue({
				data: mockSubscription,
				error: null,
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						maybeSingle: maybeSingleMock,
					}),
				}),
			});

			const { result } = renderHookWithProvider(() =>
				useUserSubscription(userId),
			);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual(mockSubscription);
		});

		it("should return null when no subscription exists", async () => {
			const userId = "user-123";

			const maybeSingleMock = vi.fn().mockResolvedValue({
				data: null,
				error: null,
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						maybeSingle: maybeSingleMock,
					}),
				}),
			});

			const { result } = renderHookWithProvider(() =>
				useUserSubscription(userId),
			);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toBeNull();
		});

		it("should handle errors gracefully", async () => {
			const userId = "user-123";

			const maybeSingleMock = vi.fn().mockResolvedValue({
				data: null,
				error: { message: "Database error" },
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						maybeSingle: maybeSingleMock,
					}),
				}),
			});

			const { result } = renderHookWithProvider(() =>
				useUserSubscription(userId),
			);

			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});

			expect(result.current.error).toEqual({ message: "Database error" });
		});
	});

	describe("useIsUserPaid", () => {
		it("should return true for paid plan", async () => {
			const userId = "user-123";
			const mockSubscription = {
				id: "sub-123",
				user_id: userId,
				plan_id: "premium",
				status: "active",
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z",
			};

			const maybeSingleMock = vi.fn().mockResolvedValue({
				data: mockSubscription,
				error: null,
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						maybeSingle: maybeSingleMock,
					}),
				}),
			});

			const { result } = renderHookWithProvider(() => useIsUserPaid(userId));

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toBe(true);
		});

		it("should return false for free plan", async () => {
			const userId = "user-123";
			const mockSubscription = {
				id: "sub-123",
				user_id: userId,
				plan_id: "free",
				status: "active",
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z",
			};

			const maybeSingleMock = vi.fn().mockResolvedValue({
				data: mockSubscription,
				error: null,
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						maybeSingle: maybeSingleMock,
					}),
				}),
			});

			const { result } = renderHookWithProvider(() => useIsUserPaid(userId));

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toBe(false);
		});
	});

	describe("useUserPlanFeatures", () => {
		it("should return free plan features when no subscription", async () => {
			const userId = "user-123";

			const maybeSingleMock = vi.fn().mockResolvedValue({
				data: null,
				error: null,
			});

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						maybeSingle: maybeSingleMock,
						single: vi.fn(),
					}),
				}),
			});

			const { result } = renderHookWithProvider(() =>
				useUserPlanFeatures(userId),
			);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data?.maxDecks).toBe(10);
			expect(result.current.data?.canUsePlugins).toBe(false);
		});

		it("should return plan features for paid plan", async () => {
			const userId = "user-123";
			const mockSubscription = {
				id: "sub-123",
				user_id: userId,
				plan_id: "premium",
				status: "active",
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z",
			};

			const mockPlan = {
				id: "premium",
				name: "premium",
				features: {
					maxDecks: 100,
					maxCardsPerDeck: 1000,
					maxNotes: 100,
					maxPagesPerNote: 500,
					canUsePlugins: true,
					canUseAI: true,
					canUseOCR: true,
					canUseAudioRecording: true,
					canUseAdvancedQuiz: true,
					canUseAnalytics: true,
					canUseExport: true,
					canUseImport: true,
					canUseSync: true,
					canUseCollaboration: true,
					canUseCustomThemes: true,
					canUsePrioritySupport: true,
				},
			};

			mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
				if (table === "subscriptions") {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								maybeSingle: vi.fn().mockResolvedValue({
									data: mockSubscription,
									error: null,
								}),
							}),
						}),
					};
				}
				if (table === "plans") {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: mockPlan,
									error: null,
								}),
							}),
						}),
					};
				}
				return {};
			});

			const { result } = renderHookWithProvider(() =>
				useUserPlanFeatures(userId),
			);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data?.maxDecks).toBe(100);
			expect(result.current.data?.canUsePlugins).toBe(true);
		});
	});

	describe("useUserPlan", () => {
		it("should return plan information successfully", async () => {
			const userId = "user-123";
			const mockSubscription = {
				id: "sub-123",
				user_id: userId,
				plan_id: "premium",
				status: "active",
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z",
			};

			const mockPlan = {
				id: "premium",
				name: "premium",
				features: {
					maxDecks: 100,
					maxCardsPerDeck: 1000,
					maxNotes: 100,
					maxPagesPerNote: 500,
					canUsePlugins: true,
					canUseAI: true,
					canUseOCR: true,
					canUseAudioRecording: true,
					canUseAdvancedQuiz: true,
					canUseAnalytics: true,
					canUseExport: true,
					canUseImport: true,
					canUseSync: true,
					canUseCollaboration: true,
					canUseCustomThemes: true,
					canUsePrioritySupport: true,
				},
			};

			mockSupabaseClient.from = vi.fn().mockImplementation((table) => {
				if (table === "subscriptions") {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								maybeSingle: vi.fn().mockResolvedValue({
									data: mockSubscription,
									error: null,
								}),
							}),
						}),
					};
				}
				if (table === "plans") {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: mockPlan,
									error: null,
								}),
							}),
						}),
					};
				}
				return {};
			});

			const { result } = renderHookWithProvider(() => useUserPlan(userId));

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data?.id).toBe("premium");
			expect(result.current.data?.displayName).toBe("premium");
			expect(result.current.data?.features.maxDecks).toBe(100);
		});

		it("should return null when no subscription exists", async () => {
			const userId = "user-123";

			mockSupabaseClient.from = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						maybeSingle: vi.fn().mockResolvedValue({
							data: null,
							error: null,
						}),
					}),
				}),
			});

			const { result } = renderHookWithProvider(() => useUserPlan(userId));

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toBeNull();
		});
	});
});
