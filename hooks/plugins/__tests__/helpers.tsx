/**
 * Test helpers for Plugins hooks
 *
 * Provides common utilities for testing Plugins-related custom hooks:
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

// Mock plugin metadata
export const mockPluginMetadata = {
	id: "plugin-123",
	pluginId: "com.example.plugin",
	name: "Test Plugin",
	version: "1.0.0",
	description: "Test description",
	author: "Test Author",
	homepage: "https://example.com",
	repository: "https://github.com/example/plugin",
	manifest: {
		id: "com.example.plugin",
		name: "Test Plugin",
		version: "1.0.0",
		description: "Test description",
		author: "Test Author",
		extensionPoints: {
			editor: false,
			ai: false,
			ui: false,
			dataProcessor: false,
			integration: false,
		},
		configSchema: {
			type: "object",
			properties: {},
		},
		defaultConfig: {},
	},
	codeUrl: "https://example.com/plugin.js",
	isOfficial: false,
	isReviewed: false,
	downloadsCount: 0,
	ratingAverage: undefined,
	ratingCount: undefined,
	createdAt: new Date("2025-01-01T00:00:00Z"),
	updatedAt: new Date("2025-01-01T00:00:00Z"),
};

// Mock plugin row (database format)
export const mockPluginRow = {
	id: mockPluginMetadata.id,
	plugin_id: mockPluginMetadata.pluginId,
	name: mockPluginMetadata.name,
	version: mockPluginMetadata.version,
	description: mockPluginMetadata.description,
	author: mockPluginMetadata.author,
	homepage: mockPluginMetadata.homepage,
	repository: mockPluginMetadata.repository,
	manifest: mockPluginMetadata.manifest,
	code_url: mockPluginMetadata.codeUrl,
	is_official: mockPluginMetadata.isOfficial,
	is_reviewed: mockPluginMetadata.isReviewed,
	downloads_count: mockPluginMetadata.downloadsCount,
	rating_average: mockPluginMetadata.ratingAverage,
	rating_count: mockPluginMetadata.ratingCount,
	created_at: mockPluginMetadata.createdAt.toISOString(),
	updated_at: mockPluginMetadata.updatedAt.toISOString(),
};

// Mock user plugin
export const mockUserPlugin = {
	id: "user-plugin-123",
	userId: "user-123",
	pluginId: "com.example.plugin",
	installedVersion: "1.0.0",
	enabled: true,
	config: undefined,
	installedAt: new Date("2025-01-01T00:00:00Z"),
};

// Mock user plugin row (database format)
export const mockUserPluginRow = {
	id: mockUserPlugin.id,
	user_id: mockUserPlugin.userId,
	plugin_id: mockUserPlugin.pluginId,
	installed_version: mockUserPlugin.installedVersion,
	enabled: mockUserPlugin.enabled,
	config: mockUserPlugin.config,
	installed_at: mockUserPlugin.installedAt.toISOString(),
	last_used_at: null,
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
		storage: {
			from: vi.fn().mockReturnValue({
				upload: vi.fn(),
				createSignedUrl: vi.fn(),
			}),
		},
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
		ne: vi.fn().mockReturnThis(),
		in: vi.fn().mockReturnThis(),
		or: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		range: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		single: vi.fn().mockResolvedValue({ data, error }),
		maybeSingle: vi.fn().mockResolvedValue({ data, error }),
	};

	// Make the chain resolve to data/error at the end
	chain.single.mockResolvedValue({ data, error });
	chain.maybeSingle.mockResolvedValue({ data, error });

	return chain;
}
