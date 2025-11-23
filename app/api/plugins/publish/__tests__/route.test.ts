/**
 * Tests for Plugin Publish API Route
 *
 * Test Coverage:
 * - TC-001: 正常系 - プラグイン公開成功
 * - TC-002: 異常系 - 認証エラー（未認証ユーザー）
 * - TC-003: 異常系 - プラグインが見つからない
 * - TC-004: 異常系 - バリデーションエラー（pluginId未指定）
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { publishPluginToMarketplace } from "@/lib/plugins/plugin-publisher";
import { createClient } from "@/lib/supabase/server";
import { POST } from "../route";

// Mock dependencies - order matters: mock node modules before other mocks
// Mock path operations - include default export for compatibility
vi.mock("node:path", () => {
	const mockJoin = vi.fn((...paths: string[]) => paths.join("/"));
	const mockDirname = vi.fn((p: string) => p);
	return {
		join: mockJoin,
		dirname: mockDirname,
		default: {
			join: mockJoin,
			dirname: mockDirname,
		},
	};
});
// Mock url operations - include default export for compatibility
vi.mock("node:url", () => {
	const mockFileURLToPath = vi.fn((url: string | URL) => String(url));
	return {
		fileURLToPath: mockFileURLToPath,
		default: {
			fileURLToPath: mockFileURLToPath,
		},
	};
});
// Mock fs operations - include default export for compatibility
vi.mock("node:fs", () => {
	const mockExistsSync = vi.fn();
	const mockReaddirSync = vi.fn();
	const mockReadFileSync = vi.fn();
	return {
		existsSync: mockExistsSync,
		readdirSync: mockReaddirSync,
		readFileSync: mockReadFileSync,
		default: {
			existsSync: mockExistsSync,
			readdirSync: mockReaddirSync,
			readFileSync: mockReadFileSync,
		},
	};
});

vi.mock("@/lib/supabase/server");
vi.mock("@/lib/plugins/plugin-publisher");
vi.mock("@/lib/logger");

// Helper: Create mock NextRequest
function createMockRequest(body?: unknown): Request {
	return {
		json: async () => body || {},
	} as Request;
}

// Helper: Create mock Supabase client with authenticated user
function createMockSupabaseClient(authenticated = true) {
	return {
		auth: {
			getUser: () =>
				Promise.resolve({
					data: {
						user: authenticated ? { id: "user-123" } : null,
					},
					error: authenticated ? null : new Error("Not authenticated"),
				}),
		},
		storage: {
			from: vi.fn().mockReturnValue({
				upload: vi.fn().mockResolvedValue({ error: null }),
				getPublicUrl: vi.fn().mockReturnValue({
					data: { publicUrl: "https://example.com/plugin.js" },
				}),
			}),
		},
		from: vi.fn().mockReturnValue({
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { code: "PGRST116" },
			}),
			insert: vi.fn().mockResolvedValue({ error: null }),
		}),
	};
}

describe("POST /api/plugins/publish", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset path mocks
		vi.mocked(path.join).mockImplementation((...paths: string[]) =>
			paths.join("/"),
		);
		vi.mocked(path.dirname).mockImplementation((p: string) => p);
		// Reset url mocks
		vi.mocked(fileURLToPath).mockImplementation((url: string | URL) =>
			String(url),
		);
	});

	// TC-001: 正常系 - プラグイン公開成功
	it("TC-001: Should publish plugin successfully", async () => {
		vi.mocked(createClient).mockResolvedValue(
			createMockSupabaseClient() as never,
		);

		// Mock file system operations - plugin directory found
		vi.mocked(fs.existsSync).mockImplementation((p) => {
			const pathStr = String(p);
			// Mock plugins/examples directory exists
			if (
				pathStr.includes("plugins/examples") &&
				!pathStr.includes("test-plugin")
			) {
				return true;
			}
			// Mock plugin directory exists (kebab-case: test-plugin)
			if (pathStr.includes("test-plugin") && !pathStr.includes("plugin.json")) {
				return true;
			}
			// Mock plugin.json exists
			if (pathStr.includes("plugin.json")) {
				return true;
			}
			return false;
		});
		vi.mocked(fs.readdirSync).mockReturnValue([] as never);
		vi.mocked(fs.readFileSync).mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.includes("plugin.json")) {
				return JSON.stringify({
					id: "test-plugin",
					name: "Test Plugin",
					version: "1.0.0",
					main: "index.js",
				});
			}
			return "plugin code";
		});

		vi.mocked(publishPluginToMarketplace).mockResolvedValue({
			success: true,
			message: "プラグインを公開しました",
			pluginId: "test-plugin",
			codeUrl: "https://example.com/plugin.js",
		});

		const request = createMockRequest({
			pluginId: "test-plugin",
		});

		const response = await POST(request as never);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.pluginId).toBe("test-plugin");
		expect(publishPluginToMarketplace).toHaveBeenCalled();
	});

	// TC-002: 異常系 - 認証エラー（未認証ユーザー）
	it("TC-002: Should return 401 when user is not authenticated", async () => {
		vi.mocked(createClient).mockResolvedValue(
			createMockSupabaseClient(false) as never,
		);

		const request = createMockRequest({
			pluginId: "test-plugin",
		});

		const response = await POST(request as never);
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data.error).toBe("Unauthorized");
		expect(publishPluginToMarketplace).not.toHaveBeenCalled();
	});

	// TC-003: 異常系 - プラグインが見つからない
	it("TC-003: Should return 404 when plugin is not found", async () => {
		vi.mocked(createClient).mockResolvedValue(
			createMockSupabaseClient() as never,
		);

		// Mock file system operations - plugin directory not found
		vi.mocked(fs.existsSync).mockReturnValue(false);
		vi.mocked(fs.readdirSync).mockReturnValue([] as never);

		const request = createMockRequest({
			pluginId: "test-plugin",
		});

		const response = await POST(request as never);
		const data = await response.json();

		expect(response.status).toBe(404);
		expect(data.error).toBe("Not found");
		expect(publishPluginToMarketplace).not.toHaveBeenCalled();
	});

	// TC-004: 異常系 - バリデーションエラー（pluginId未指定）
	it("TC-004: Should return 400 when pluginId is missing", async () => {
		vi.mocked(createClient).mockResolvedValue(
			createMockSupabaseClient() as never,
		);

		const request = createMockRequest({});

		const response = await POST(request as never);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toBe("Bad request");
		expect(publishPluginToMarketplace).not.toHaveBeenCalled();
	});
});
