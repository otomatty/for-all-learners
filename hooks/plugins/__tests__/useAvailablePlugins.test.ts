/**
 * Tests for useAvailablePlugins hook
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useAvailablePlugins } from "../useAvailablePlugins";
import {
	createMockSupabaseClient,
	createWrapper,
	mockPluginMetadata,
	mockUser,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");

describe("useAvailablePlugins", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});
	it("should fetch available plugins successfully", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockData = [
			{
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
			},
		];

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({
				data: mockData,
				error: null,
			}),
			eq: vi.fn().mockReturnThis(),
			or: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			range: vi.fn().mockReturnThis(),
		};

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(() => useAvailablePlugins(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.length).toBeGreaterThan(0);
	});

	it("should handle filters correctly", async () => {
		mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
			data: { user: mockUser },
			error: null,
		});

		const mockQuery = {
			select: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			or: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			range: vi.fn().mockReturnThis(),
		};

		// Make the final range() call resolve
		mockQuery.range.mockResolvedValue({
			data: [],
			error: null,
		});

		mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery);

		const { result } = renderHook(
			() =>
				useAvailablePlugins({
					isOfficial: true,
					isReviewed: true,
					extensionPoint: "editor",
					search: "test",
					limit: 10,
					offset: 0,
				}),
			{
				wrapper: createWrapper(),
			},
		);

		await waitFor(() => {
			expect(result.current.isSuccess || result.current.isError).toBe(true);
		});

		expect(mockQuery.eq).toHaveBeenCalled();
	});
});
