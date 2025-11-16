/**
 * Test helpers for Notes hooks
 *
 * Provides common utilities for testing Notes-related custom hooks:
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

// Mock note data
export const mockNote = {
	id: "note-123",
	slug: "test-note",
	title: "Test Note",
	description: "Test description",
	visibility: "private" as const,
	owner_id: "user-123",
	created_at: "2025-01-01T00:00:00Z",
	updated_at: "2025-01-01T00:00:00Z",
	page_count: 0,
	participant_count: 0,
	is_default_note: false,
};

// Mock page data
export const mockPage = {
	id: "page-123",
	title: "Test Page",
	content: "Test content",
	note_id: "note-123",
	created_at: "2025-01-01T00:00:00Z",
	updated_at: "2025-01-01T00:00:00Z",
};

// Mock share link data
export const mockShareLink = {
	token: "share-token-123",
	permission_level: "viewer",
	created_at: "2025-01-01T00:00:00Z",
	expires_at: null,
};

// Mock share data
export const mockShare = {
	shared_with_user_id: "user-456",
	permission_level: "editor" as const,
	created_at: "2025-01-01T00:00:00Z",
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
