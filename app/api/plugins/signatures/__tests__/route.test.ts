/**
 * Tests for Plugin Signatures API Route
 *
 * Test Coverage:
 * - TC-001: 正常系 - 署名情報の取得成功（GET）
 * - TC-002: 異常系 - 管理者権限なし（GET）
 * - TC-003: 正常系 - 署名の生成成功（POST）
 * - TC-004: 異常系 - 管理者権限なし（POST）
 * - TC-005: 異常系 - プラグインが見つからない（POST）
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { createClient } from "@/lib/supabase/server";
import { GET, POST } from "../route";

// Mock dependencies
vi.mock("@/lib/supabase/server");
vi.mock("@/lib/supabase/adminClient");
vi.mock("@/lib/plugins/plugin-signature/signer");
vi.mock("@/lib/plugins/plugin-signature/key-manager");
vi.mock("@/lib/logger");

// Helper: Create mock NextRequest
function createMockRequest(
	body?: unknown,
	searchParams?: Record<string, string>,
): Request {
	const url = new URL("http://localhost/api/plugins/signatures");
	if (searchParams) {
		Object.entries(searchParams).forEach(([key, value]) => {
			url.searchParams.set(key, value);
		});
	}

	return {
		json: async () => body || {},
		url: url.toString(),
	} as Request;
}

// Helper: Create mock Supabase client
function createMockSupabaseClient(authenticated = true, isAdmin = false) {
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
		from: vi.fn().mockReturnValue({
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: isAdmin ? { id: "admin-123" } : null,
				error: isAdmin ? null : { code: "PGRST116" },
			}),
		}),
		storage: {
			from: vi.fn().mockReturnValue({
				createSignedUrl: vi.fn().mockResolvedValue({
					data: { signedUrl: "https://example.com/signed-url" },
					error: null,
				}),
			}),
		},
	};
}

// Helper: Create mock Admin client
function createMockAdminClient() {
	return {
		from: vi.fn().mockReturnValue({
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			not: vi.fn().mockReturnThis(),
			is: vi.fn().mockReturnThis(),
			or: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			range: vi.fn().mockResolvedValue({
				data: [
					{
						plugin_id: "test-plugin",
						name: "Test Plugin",
						version: "1.0.0",
						author: "Test Author",
						signature: "signature-123",
						public_key: "public-key-123",
						signature_algorithm: "ed25519",
						signed_at: "2025-01-01T00:00:00Z",
						is_official: false,
						is_reviewed: false,
					},
				],
				error: null,
				count: 1,
			}),
			update: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: {
					plugin_id: "test-plugin",
					manifest: {
						id: "test-plugin",
						version: "1.0.0",
						author: "Test Author",
					},
					code_url: "https://example.com/plugin.js",
				},
				error: null,
			}),
		}),
	};
}

describe("GET /api/plugins/signatures", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// TC-001: 正常系 - 署名情報の取得成功
	it("TC-001: Should get plugin signatures successfully", async () => {
		vi.mocked(createClient).mockResolvedValue(
			createMockSupabaseClient(true, true) as never,
		);
		vi.mocked(createAdminClient).mockReturnValue(
			createMockAdminClient() as never,
		);

		const request = createMockRequest();

		const response = await GET(request as never);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.plugins).toBeDefined();
		expect(data.totalCount).toBe(1);
	});

	// TC-002: 異常系 - 管理者権限なし
	it("TC-002: Should return 403 when user is not admin", async () => {
		vi.mocked(createClient).mockResolvedValue(
			createMockSupabaseClient(true, false) as never,
		);

		const request = createMockRequest();

		const response = await GET(request as never);
		const data = await response.json();

		expect(response.status).toBe(403);
		expect(data.error).toBe("Unauthorized");
	});
});

describe("POST /api/plugins/signatures", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// TC-003: 正常系 - 署名の生成成功
	it("TC-003: Should generate plugin signature successfully", async () => {
		const mockSupabaseClient = createMockSupabaseClient(true, true);
		mockSupabaseClient.storage = {
			from: vi.fn().mockReturnValue({
				createSignedUrl: vi.fn().mockResolvedValue({
					data: { signedUrl: "https://example.com/signed-url" },
					error: null,
				}),
			}),
		} as never;

		vi.mocked(createClient).mockResolvedValue(mockSupabaseClient as never);
		vi.mocked(createAdminClient).mockReturnValue(
			createMockAdminClient() as never,
		);

		// Mock key pair generation
		const { generateEd25519KeyPair } = await import(
			"@/lib/plugins/plugin-signature/key-manager"
		);
		vi.mocked(generateEd25519KeyPair).mockReturnValue({
			publicKey: "public-key-123",
			privateKey: "private-key-123",
		});

		// Mock fetch for plugin code
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			text: async () => "plugin code",
		});

		// Mock signPlugin
		const { signPlugin } = await import(
			"@/lib/plugins/plugin-signature/signer"
		);
		vi.mocked(signPlugin).mockReturnValue({
			signature: "signature-123",
			publicKey: "public-key-123",
			algorithm: "ed25519",
			signatureData: {
				pluginId: "test-plugin",
				version: "1.0.0",
				codeHash: "code-hash-123",
				timestamp: Date.now(),
				author: "Test Author",
			},
			signedAt: Date.now(),
		});

		const request = createMockRequest({
			pluginId: "test-plugin",
			algorithm: "ed25519",
			generateNewKeyPair: true,
		});

		const response = await POST(request as never);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.signature).toBeDefined();
	});

	// TC-004: 異常系 - 管理者権限なし
	it("TC-004: Should return 403 when user is not admin", async () => {
		vi.mocked(createClient).mockResolvedValue(
			createMockSupabaseClient(true, false) as never,
		);

		const request = createMockRequest({
			pluginId: "test-plugin",
		});

		const response = await POST(request as never);
		const data = await response.json();

		expect(response.status).toBe(403);
		expect(data.error).toBe("Unauthorized");
	});

	// TC-005: 異常系 - プラグインが見つからない
	it("TC-005: Should return 404 when plugin is not found", async () => {
		vi.mocked(createClient).mockResolvedValue(
			createMockSupabaseClient(true, true) as never,
		);

		const mockAdminClient = createMockAdminClient();
		mockAdminClient.from = vi.fn().mockReturnValue({
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			update: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: null,
				error: { code: "PGRST116" },
			}),
		});

		vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as never);

		const request = createMockRequest({
			pluginId: "non-existent-plugin",
		});

		const response = await POST(request as never);
		const data = await response.json();

		expect(response.status).toBe(404);
		expect(data.error).toBe("Not found");
	});
});
