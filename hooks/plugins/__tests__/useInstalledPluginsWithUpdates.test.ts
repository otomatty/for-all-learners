/**
 * Tests for useInstalledPluginsWithUpdates hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - 更新情報付きでプラグイン取得成功
 * - TC-002: 正常系 - 更新ありのプラグインを検出
 * - TC-003: 正常系 - 更新なしのプラグインを検出
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { useInstalledPluginsWithUpdates } from "../useInstalledPluginsWithUpdates";
import {
	createMockSupabaseClient,
	createWrapper,
	mockPluginRow,
	mockUserPluginRow,
} from "./helpers";

// Mock Supabase client
vi.mock("@/lib/supabase/client");
vi.mock("../useInstalledPlugins", () => ({
	useInstalledPlugins: vi.fn(),
}));

describe("useInstalledPluginsWithUpdates", () => {
	let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSupabaseClient = createMockSupabaseClient();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as ReturnType<typeof createClient>,
		);
	});

	// TC-001: 正常系 - 更新情報付きでプラグイン取得成功
	test("TC-001: Should fetch plugins with update information", async () => {
		const { useInstalledPlugins } = await import("../useInstalledPlugins");

		const mockData = [
			{
				...mockUserPluginRow,
				metadata: mockPluginRow,
			},
		];

		vi.mocked(useInstalledPlugins).mockReturnValue({
			data: mockData.map((item) => ({
				id: item.id,
				userId: item.user_id,
				pluginId: item.plugin_id,
				installedVersion: item.installed_version,
				enabled: item.enabled,
				config: item.config,
				installedAt: new Date(item.installed_at),
				metadata: {
					id: item.metadata.id,
					pluginId: item.metadata.plugin_id,
					name: item.metadata.name,
					version: item.metadata.version,
					description: item.metadata.description,
					author: item.metadata.author,
					homepage: item.metadata.homepage,
					repository: item.metadata.repository,
					manifest: item.metadata.manifest,
					codeUrl: item.metadata.code_url,
					isOfficial: item.metadata.is_official,
					isReviewed: item.metadata.is_reviewed,
					downloadsCount: item.metadata.downloads_count,
					ratingAverage: item.metadata.rating_average,
					ratingCount: item.metadata.rating_count,
					createdAt: new Date(item.metadata.created_at),
					updatedAt: new Date(item.metadata.updated_at),
				},
			})),
			isSuccess: true,
			isError: false,
			isLoading: false,
			error: null,
		} as never);

		const { result } = renderHook(() => useInstalledPluginsWithUpdates(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.data).toBeDefined();
		});

		expect(result.current.data).toBeDefined();
		expect(result.current.data?.length).toBeGreaterThan(0);
		expect(result.current.data?.[0]?.hasUpdate).toBeDefined();
		expect(result.current.data?.[0]?.latestVersion).toBeDefined();
		expect(result.current.data?.[0]?.installedVersion).toBeDefined();
	});

	// TC-002: 正常系 - 更新ありのプラグインを検出
	test("TC-002: Should detect plugin with update available", async () => {
		const { useInstalledPlugins } = await import("../useInstalledPlugins");

		const updatedPluginRow = {
			...mockPluginRow,
			version: "2.0.0",
		};

		const mockData = [
			{
				...mockUserPluginRow,
				installed_version: "1.0.0",
				metadata: updatedPluginRow,
			},
		];

		vi.mocked(useInstalledPlugins).mockReturnValue({
			data: mockData.map((item) => ({
				id: item.id,
				userId: item.user_id,
				pluginId: item.plugin_id,
				installedVersion: item.installed_version,
				enabled: item.enabled,
				config: item.config,
				installedAt: new Date(item.installed_at),
				metadata: {
					id: item.metadata.id,
					pluginId: item.metadata.plugin_id,
					name: item.metadata.name,
					version: item.metadata.version,
					description: item.metadata.description,
					author: item.metadata.author,
					homepage: item.metadata.homepage,
					repository: item.metadata.repository,
					manifest: item.metadata.manifest,
					codeUrl: item.metadata.code_url,
					isOfficial: item.metadata.is_official,
					isReviewed: item.metadata.is_reviewed,
					downloadsCount: item.metadata.downloads_count,
					ratingAverage: item.metadata.rating_average,
					ratingCount: item.metadata.rating_count,
					createdAt: new Date(item.metadata.created_at),
					updatedAt: new Date(item.metadata.updated_at),
				},
			})),
			isSuccess: true,
			isError: false,
			isLoading: false,
			error: null,
		} as never);

		const { result } = renderHook(() => useInstalledPluginsWithUpdates(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.data).toBeDefined();
		});

		expect(result.current.data?.[0]?.hasUpdate).toBe(true);
		expect(result.current.data?.[0]?.latestVersion).toBe("2.0.0");
		expect(result.current.data?.[0]?.installedVersion).toBe("1.0.0");
	});

	// TC-003: 正常系 - 更新なしのプラグインを検出
	test("TC-003: Should detect plugin without update", async () => {
		const { useInstalledPlugins } = await import("../useInstalledPlugins");

		const mockData = [
			{
				...mockUserPluginRow,
				installed_version: "1.0.0",
				metadata: mockPluginRow, // version: "1.0.0"
			},
		];

		vi.mocked(useInstalledPlugins).mockReturnValue({
			data: mockData.map((item) => ({
				id: item.id,
				userId: item.user_id,
				pluginId: item.plugin_id,
				installedVersion: item.installed_version,
				enabled: item.enabled,
				config: item.config,
				installedAt: new Date(item.installed_at),
				metadata: {
					id: item.metadata.id,
					pluginId: item.metadata.plugin_id,
					name: item.metadata.name,
					version: item.metadata.version,
					description: item.metadata.description,
					author: item.metadata.author,
					homepage: item.metadata.homepage,
					repository: item.metadata.repository,
					manifest: item.metadata.manifest,
					codeUrl: item.metadata.code_url,
					isOfficial: item.metadata.is_official,
					isReviewed: item.metadata.is_reviewed,
					downloadsCount: item.metadata.downloads_count,
					ratingAverage: item.metadata.rating_average,
					ratingCount: item.metadata.rating_count,
					createdAt: new Date(item.metadata.created_at),
					updatedAt: new Date(item.metadata.updated_at),
				},
			})),
			isSuccess: true,
			isError: false,
			isLoading: false,
			error: null,
		} as never);

		const { result } = renderHook(() => useInstalledPluginsWithUpdates(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.data).toBeDefined();
		});

		expect(result.current.data?.[0]?.hasUpdate).toBe(false);
		expect(result.current.data?.[0]?.latestVersion).toBe("1.0.0");
		expect(result.current.data?.[0]?.installedVersion).toBe("1.0.0");
	});
});
