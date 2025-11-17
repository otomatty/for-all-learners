/**
 * Test helpers for storage hooks
 *
 * Provides common utilities for testing storage-related hooks:
 * - Mock Supabase client factory
 * - Mock file data
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { vi } from "vitest";

/**
 * Creates a mock Supabase client with configurable behavior
 */
export function createMockSupabaseClient() {
	const mockAuthGetUser = vi.fn().mockResolvedValue({
		data: { user: null },
		error: null,
	});
	const mockStorageUpload = vi.fn();
	const mockStorageGetPublicUrl = vi.fn();
	const mockStorageCreateSignedUrl = vi.fn();
	const mockStorageList = vi.fn();

	// Create a more complete mock that satisfies StorageFileApi interface
	const mockStorageFrom = vi.fn((_bucketName: string) => {
		const mockApi = {
			upload: mockStorageUpload,
			getPublicUrl: mockStorageGetPublicUrl,
			createSignedUrl: mockStorageCreateSignedUrl,
			list: mockStorageList,
			// Add minimal required properties to satisfy StorageFileApi
			url: vi.fn(),
			headers: {},
			fetch: vi.fn(),
			uploadOrUpdate: vi.fn(),
		};
		return mockApi as unknown;
	});

	return {
		auth: {
			getUser: mockAuthGetUser,
		},
		storage: {
			from: mockStorageFrom,
		},
	} as unknown as SupabaseClient;
}

/**
 * Creates a mock File object
 */
export function createMockFile(
	name: string,
	_size: number,
	type: string,
): File {
	const blob = new Blob(["test content"], { type });
	return new File([blob], name, { type });
}
