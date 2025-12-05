/**
 * Test helpers for Cards hooks
 *
 * Provides common utilities for testing Cards-related custom hooks:
 * - Mock Supabase client factory
 * - QueryClientProvider wrapper
 * - Mock data constants
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { vi } from "vitest";
import type { LocalCard } from "@/lib/db/types";

// Mock user data
export const mockUser = {
	id: "user-123",
	email: "test@example.com",
	app_metadata: {},
	user_metadata: {},
	aud: "authenticated",
	created_at: "2025-01-01T00:00:00Z",
};

// Mock card data (legacy format for Supabase tests)
export const mockCard = {
	id: "card-123",
	user_id: "user-123",
	deck_id: "deck-123",
	front_content: { type: "doc", content: [] },
	back_content: { type: "doc", content: [] },
	next_review_at: "2025-01-02T00:00:00Z",
	created_at: "2025-01-01T00:00:00Z",
	updated_at: "2025-01-01T00:00:00Z",
};

// Mock LocalCard data for Repository tests
export const mockLocalCard: LocalCard = {
	id: "card-123",
	user_id: "user-123",
	deck_id: "deck-123",
	front_content: { type: "doc", content: [] },
	back_content: { type: "doc", content: [] },
	source_audio_url: null,
	source_ocr_image_url: null,
	ease_factor: 2.5,
	repetition_count: 0,
	review_interval: 1,
	next_review_at: "2025-01-02T00:00:00Z",
	stability: 0,
	difficulty: 0,
	last_reviewed_at: null,
	created_at: "2025-01-01T00:00:00Z",
	updated_at: "2025-01-01T00:00:00Z",
	sync_status: "synced",
	local_updated_at: "2025-01-01T00:00:00Z",
	synced_at: "2025-01-01T00:00:00Z",
	server_updated_at: "2025-01-01T00:00:00Z",
};

// Mock deck data
export const mockDeck = {
	id: "deck-123",
	title: "Test Deck",
	user_id: "user-123",
	created_at: "2025-01-01T00:00:00Z",
	updated_at: "2025-01-01T00:00:00Z",
};

// Mock user settings data
export const mockUserSettings = {
	user_id: "user-123",
	locale: "ja",
};

/**
 * Creates a mock Supabase client with configurable behavior
 */
export function createMockSupabaseClient() {
	const mockAuthGetUser = vi.fn();
	const mockFrom = vi.fn();
	const mockRpc = vi.fn();
	const mockFunctions = {
		invoke: vi.fn(),
	};

	return {
		auth: {
			getUser: mockAuthGetUser,
		},
		from: mockFrom,
		rpc: mockRpc,
		functions: mockFunctions,
	} as unknown as SupabaseClient;
}

/**
 * Mock createClient function for tests
 * Stores the reference so tests can configure it
 */
let currentMockClient: SupabaseClient | null = null;

export function setMockSupabaseClient(client: SupabaseClient | null): void {
	currentMockClient = client;
}

export function getMockSupabaseClient(): SupabaseClient | null {
	return currentMockClient;
}

/**
 * Mock implementation of createClient for vi.mock
 */
export const mockCreateClient = vi.fn(() => {
	if (currentMockClient) {
		return currentMockClient;
	}
	// Return a default mock if none is set
	return createMockSupabaseClient();
});

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
