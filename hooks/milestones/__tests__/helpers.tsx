/**
 * Test helpers for Milestones hooks
 *
 * Provides common utilities for testing Milestones-related custom hooks:
 * - Mock Supabase client factory
 * - QueryClientProvider wrapper
 * - Mock data constants
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { vi } from "vitest";

// Mock milestone data
export const mockMilestone = {
	id: "milestone-123",
	timeframe: "2025-Q1",
	title: "Test Milestone",
	description: "Test description",
	status: "in-progress" as const,
	progress: 50,
	image_url: null,
	features: ["feature1", "feature2"],
	related_links: [{ label: "Link", url: "https://example.com" }],
	sort_order: 1,
	created_at: "2025-01-01T00:00:00Z",
	updated_at: "2025-01-01T00:00:00Z",
};

/**
 * Creates a mock Supabase client with configurable behavior
 */
export function createMockSupabaseClient() {
	const mockAuthGetUser = vi.fn();
	const mockFrom = vi.fn();
	const mockRpc = vi.fn();

	return {
		auth: {
			getUser: mockAuthGetUser,
		},
		from: mockFrom,
		rpc: mockRpc,
	} as unknown as SupabaseClient;
}

/**
 * Creates a QueryClientProvider wrapper for testing hooks
 */
export function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
			mutations: {
				retry: false,
			},
		},
	});

	return function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};
}

/**
 * Helper to create a mock query chain (from().select().eq()...)
 */
export function createMockQueryChain<T = unknown>(
	data: T,
	error: unknown = null,
) {
	const chain = {
		select: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		single: vi.fn().mockResolvedValue({ data, error }),
		maybeSingle: vi.fn().mockResolvedValue({ data, error }),
	};

	chain.single.mockResolvedValue({ data, error });
	chain.maybeSingle.mockResolvedValue({ data, error });

	return chain;
}
