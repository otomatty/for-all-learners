/**
 * Test helpers for Learning Logs hooks
 *
 * Provides common utilities for testing Learning Logs-related custom hooks:
 * - Mock Supabase client factory
 * - QueryClientProvider wrapper
 * - Mock data constants
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { vi } from "vitest";

// Mock user data
export const mockUser = {
	id: "user-123",
	email: "test@example.com",
	app_metadata: {},
	user_metadata: {},
	aud: "authenticated",
	created_at: "2025-01-01T00:00:00Z",
};

// Mock learning log data
export const mockLearningLog = {
	id: "log-123",
	user_id: "user-123",
	card_id: "card-123",
	question_id: null,
	answered_at: "2025-01-01T00:00:00Z",
	is_correct: true,
	user_answer: null,
	practice_mode: "review" as const,
	review_interval: 1,
	next_review_at: "2025-01-02T00:00:00Z",
	response_time: 0,
	effort_time: 0,
	attempt_count: 1,
	quality: 3,
};

// Mock card data
export const mockCard = {
	id: "card-123",
	user_id: "user-123",
	deck_id: "deck-123",
	stability: 1.0,
	difficulty: 0.3,
	last_reviewed_at: null,
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
		neq: vi.fn().mockReturnThis(),
		in: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		range: vi.fn().mockReturnThis(),
		lte: vi.fn().mockReturnThis(),
		gte: vi.fn().mockReturnThis(),
		lt: vi.fn().mockReturnThis(),
		single: vi.fn().mockResolvedValue({ data, error }),
		maybeSingle: vi.fn().mockResolvedValue({ data, error }),
		limit: vi.fn().mockReturnThis(),
		offset: vi.fn().mockReturnThis(),
	};

	// Make the chain resolve to data/error at the end
	chain.single.mockResolvedValue({ data, error });
	chain.maybeSingle.mockResolvedValue({ data, error });

	return chain;
}
