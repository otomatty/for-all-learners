/**
 * Plugin Publisher Tests
 *
 * Unit tests for plugin publishing functionality.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (test runner)
 *
 * Dependencies:
 *   ├─ lib/plugins/plugin-publisher.ts
 *   └─ types/plugin.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/plugin-cli-publish.md
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as loggerModule from "@/lib/logger";
import type { Database } from "@/types/database.types";
import type { PluginManifest } from "@/types/plugin";
import { publishPluginToMarketplace } from "../plugin-publisher";

// Mock fs operations
vi.mock("node:fs", async () => {
	const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
	const mockExistsSync = vi.fn();
	const mockReadFileSync = vi.fn();
	return {
		...actual,
		existsSync: mockExistsSync,
		readFileSync: mockReadFileSync,
		default: {
			existsSync: mockExistsSync,
			readFileSync: mockReadFileSync,
		},
	};
});

// Mock logger
vi.mock("@/lib/logger", () => ({
	default: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	},
}));

describe("publishPluginToMarketplace", () => {
	let mockSupabase: SupabaseClient<Database>;
	let mockExistsSync: ReturnType<typeof vi.fn>;
	let mockReadFileSync: ReturnType<typeof vi.fn>;
	let infoSpy: ReturnType<typeof vi.spyOn>;
	let errorSpy: ReturnType<typeof vi.spyOn>;

	const validManifest: PluginManifest = {
		id: "com.example.test-plugin",
		name: "Test Plugin",
		version: "1.0.0",
		description: "A test plugin",
		author: "Test Author",
		main: "src/index.ts",
		extensionPoints: {
			editor: false,
			ai: false,
			ui: true,
			dataProcessor: false,
			integration: false,
		},
	};

	const pluginCode = "export default function() { console.log('test'); }";

	beforeEach(async () => {
		const fsModule = await import("node:fs");
		mockExistsSync = vi.mocked(fsModule.existsSync);
		mockReadFileSync = vi.mocked(fsModule.readFileSync);

		infoSpy = vi.spyOn(loggerModule.default, "info") as unknown as ReturnType<
			typeof vi.spyOn
		>;
		errorSpy = vi.spyOn(loggerModule.default, "error") as unknown as ReturnType<
			typeof vi.spyOn
		>;

		// Create mock Supabase client
		mockSupabase = {
			storage: {
				from: vi.fn().mockReturnValue({
					upload: vi.fn().mockResolvedValue({
						data: { path: "plugins/com.example.test-plugin/1.0.0/index.js" },
						error: null,
					}),
					getPublicUrl: vi.fn().mockReturnValue({
						data: {
							publicUrl:
								"https://example.com/plugins/com.example.test-plugin/1.0.0/index.js",
						},
					}),
				}),
			},
			from: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: null,
							error: { code: "PGRST116", message: "No rows returned" },
						}),
					}),
				}),
				insert: vi.fn().mockResolvedValue({
					data: { id: 1 },
					error: null,
				}),
				update: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: { id: 1 },
						error: null,
					}),
				}),
			}),
		} as unknown as SupabaseClient<Database>;

		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("successful publishing", () => {
		it("should publish new plugin successfully", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("dist/index.js")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return JSON.stringify(validManifest);
				}
				if (path.includes("dist/index.js")) {
					return pluginCode;
				}
				return "";
			});

			const result = await publishPluginToMarketplace(
				"com.example.test-plugin",
				mockSupabase,
				"/path/to/plugin",
			);

			expect(result.success).toBe(true);
			expect(result.message).toBe("プラグインを公開しました");
			expect(result.pluginId).toBe("com.example.test-plugin");
			expect(result.codeUrl).toBeDefined();
			expect(mockSupabase.storage.from).toHaveBeenCalledWith("plugins");
			expect(infoSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					pluginId: "com.example.test-plugin",
					version: "1.0.0",
				}),
				"Plugin published to marketplace",
			);
		});

		it("should update existing plugin successfully", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("dist/index.js")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return JSON.stringify(validManifest);
				}
				if (path.includes("dist/index.js")) {
					return pluginCode;
				}
				return "";
			});

			// Mock existing plugin
			const mockFrom = mockSupabase.from as ReturnType<typeof vi.fn>;
			mockFrom.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 1, version: "0.9.0" },
							error: null,
						}),
					}),
				}),
				update: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: { id: 1 },
						error: null,
					}),
				}),
			});

			const result = await publishPluginToMarketplace(
				"com.example.test-plugin",
				mockSupabase,
				"/path/to/plugin",
			);

			expect(result.success).toBe(true);
			expect(result.message).toBe("プラグインを更新しました");
			expect(infoSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					pluginId: "com.example.test-plugin",
					version: "1.0.0",
				}),
				"Plugin updated in marketplace",
			);
		});

		it("should use source file if dist/index.js does not exist", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("dist/index.js")) {
					return false;
				}
				if (path.includes("src/index.ts")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return JSON.stringify(validManifest);
				}
				if (path.includes("src/index.ts")) {
					return pluginCode;
				}
				return "";
			});

			const result = await publishPluginToMarketplace(
				"com.example.test-plugin",
				mockSupabase,
				"/path/to/plugin",
			);

			expect(result.success).toBe(true);
			expect(mockReadFileSync).toHaveBeenCalledWith(
				expect.stringContaining("src/index.ts"),
				"utf-8",
			);
		});
	});

	describe("error handling", () => {
		it("should return error if manifest file not found", async () => {
			mockExistsSync.mockReturnValue(false);

			const result = await publishPluginToMarketplace(
				"com.example.test-plugin",
				mockSupabase,
				"/path/to/plugin",
			);

			expect(result.success).toBe(false);
			expect(result.message).toContain("マニフェストファイルが見つかりません");
		});

		it("should return error if plugin ID mismatch", async () => {
			mockExistsSync.mockReturnValue(true);
			const mismatchedManifest = {
				...validManifest,
				id: "com.example.different",
			};
			mockReadFileSync.mockReturnValue(JSON.stringify(mismatchedManifest));

			const result = await publishPluginToMarketplace(
				"com.example.test-plugin",
				mockSupabase,
				"/path/to/plugin",
			);

			expect(result.success).toBe(false);
			expect(result.message).toContain("プラグインIDが一致しません");
		});

		it("should return error if plugin code not found", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));

			const result = await publishPluginToMarketplace(
				"com.example.test-plugin",
				mockSupabase,
				"/path/to/plugin",
			);

			expect(result.success).toBe(false);
			expect(result.message).toContain("プラグインコードが見つかりません");
		});

		it("should return error if storage upload fails", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("dist/index.js")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return JSON.stringify(validManifest);
				}
				if (path.includes("dist/index.js")) {
					return pluginCode;
				}
				return "";
			});

			const mockStorage = mockSupabase.storage.from as ReturnType<typeof vi.fn>;
			mockStorage.mockReturnValue({
				upload: vi.fn().mockResolvedValue({
					data: null,
					error: { message: "Upload failed", statusCode: 500 },
				}),
			});

			const result = await publishPluginToMarketplace(
				"com.example.test-plugin",
				mockSupabase,
				"/path/to/plugin",
			);

			expect(result.success).toBe(false);
			expect(result.message).toContain("Storageへのアップロードに失敗しました");
			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					error: expect.any(Object),
					pluginId: "com.example.test-plugin",
				}),
				"Failed to upload plugin code to Storage",
			);
		});

		it("should return error if database insert fails", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("dist/index.js")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return JSON.stringify(validManifest);
				}
				if (path.includes("dist/index.js")) {
					return pluginCode;
				}
				return "";
			});

			const mockFrom = mockSupabase.from as ReturnType<typeof vi.fn>;
			mockFrom.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: null,
							error: { code: "PGRST116", message: "No rows returned" },
						}),
					}),
				}),
				insert: vi.fn().mockResolvedValue({
					data: null,
					error: { message: "Insert failed", code: "23505" },
				}),
			});

			const result = await publishPluginToMarketplace(
				"com.example.test-plugin",
				mockSupabase,
				"/path/to/plugin",
			);

			expect(result.success).toBe(false);
			expect(result.message).toContain("データベースへの登録に失敗しました");
			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					error: expect.any(Object),
					pluginId: "com.example.test-plugin",
				}),
				"Failed to insert plugin into database",
			);
		});

		it("should return error if database update fails", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("dist/index.js")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return JSON.stringify(validManifest);
				}
				if (path.includes("dist/index.js")) {
					return pluginCode;
				}
				return "";
			});

			const mockFrom = mockSupabase.from as ReturnType<typeof vi.fn>;
			mockFrom.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 1, version: "0.9.0" },
							error: null,
						}),
					}),
				}),
				update: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: null,
						error: { message: "Update failed", code: "23505" },
					}),
				}),
			});

			const result = await publishPluginToMarketplace(
				"com.example.test-plugin",
				mockSupabase,
				"/path/to/plugin",
			);

			expect(result.success).toBe(false);
			expect(result.message).toContain("データベースの更新に失敗しました");
			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					error: expect.any(Object),
					pluginId: "com.example.test-plugin",
				}),
				"Failed to update plugin in database",
			);
		});

		it("should handle unexpected errors", async () => {
			mockExistsSync.mockImplementation(() => {
				throw new Error("Unexpected error");
			});

			const result = await publishPluginToMarketplace(
				"com.example.test-plugin",
				mockSupabase,
				"/path/to/plugin",
			);

			expect(result.success).toBe(false);
			expect(result.message).toContain("プラグインの公開に失敗しました");
			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					error: expect.any(Error),
					pluginId: "com.example.test-plugin",
				}),
				"Failed to publish plugin",
			);
		});
	});

	describe("extension points", () => {
		it("should set extension point flags correctly", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("dist/index.js")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return JSON.stringify(validManifest);
				}
				if (path.includes("dist/index.js")) {
					return pluginCode;
				}
				return "";
			});

			const mockFrom = mockSupabase.from as ReturnType<typeof vi.fn>;
			const mockInsert = vi.fn().mockResolvedValue({
				data: { id: 1 },
				error: null,
			});
			mockFrom.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: null,
							error: { code: "PGRST116" },
						}),
					}),
				}),
				insert: mockInsert,
			});

			await publishPluginToMarketplace(
				"com.example.test-plugin",
				mockSupabase,
				"/path/to/plugin",
			);

			expect(mockInsert).toHaveBeenCalledWith(
				expect.objectContaining({
					has_ui_extension: true,
					has_editor_extension: false,
					has_ai_extension: false,
					has_data_processor_extension: false,
					has_integration_extension: false,
				}),
			);
		});
	});
});
