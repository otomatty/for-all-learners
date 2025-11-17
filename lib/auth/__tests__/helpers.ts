/**
 * Test helpers for Tauri auth functions
 *
 * Provides common utilities for testing Tauri authentication:
 * - Mock Supabase client factory
 * - Mock window.__TAURI__ setup
 * - Mock user data
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { vi } from "vitest";

// Mock user data
export const mockUser = {
	id: "user-123",
	email: "test@example.com",
	app_metadata: {},
	user_metadata: {
		full_name: "Test User",
		avatar_url: "https://example.com/avatar.jpg",
	},
	aud: "authenticated",
	created_at: "2025-01-01T00:00:00Z",
};

// Mock session data
export const mockSession = {
	access_token: "mock-access-token",
	refresh_token: "mock-refresh-token",
	expires_in: 3600,
	expires_at: Date.now() / 1000 + 3600,
	token_type: "bearer",
	user: mockUser,
};

/**
 * Creates a mock Supabase client with configurable behavior
 */
export function createMockSupabaseClient() {
	const mockAuthGetUser = vi.fn();
	const mockAuthGetSession = vi.fn();
	const mockAuthSetSession = vi.fn();
	const mockAuthExchangeCodeForSession = vi.fn();
	const mockAuthSignInWithOAuth = vi.fn();
	const mockAuthSignInWithOtp = vi.fn();
	const mockAuthOnAuthStateChange = vi.fn();

	return {
		auth: {
			getUser: mockAuthGetUser,
			getSession: mockAuthGetSession,
			setSession: mockAuthSetSession,
			exchangeCodeForSession: mockAuthExchangeCodeForSession,
			signInWithOAuth: mockAuthSignInWithOAuth,
			signInWithOtp: mockAuthSignInWithOtp,
			onAuthStateChange: mockAuthOnAuthStateChange,
		},
	} as unknown as SupabaseClient;
}

/**
 * Sets up mock window.__TAURI__ for Tauri environment
 */
export function setupTauriMock() {
	Object.defineProperty(window, "__TAURI__", {
		value: {
			invoke: vi.fn(),
			event: {
				listen: vi.fn(),
			},
		},
		configurable: true,
		writable: true,
	});
}

/**
 * Cleans up mock window.__TAURI__
 */
export function cleanupTauriMock() {
	delete (window as { __TAURI__?: unknown }).__TAURI__;
}
