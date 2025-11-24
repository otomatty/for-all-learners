/**
 * Tests for Plugin Security Audit Logs API Route
 *
 * Test Coverage:
 * - TC-001: 正常系 - 監査ログの取得成功
 * - TC-002: 異常系 - 管理者権限なし
 * - TC-003: 正常系 - フィルター付き取得
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { GET } from "../route";

// Mock dependencies
vi.mock("@/lib/supabase/server");
vi.mock("@/lib/logger");

// Helper: Create mock NextRequest
function createMockRequest(searchParams?: Record<string, string>): Request {
	const url = new URL("http://localhost/api/plugins/security/audit-logs");
	if (searchParams) {
		Object.entries(searchParams).forEach(([key, value]) => {
			url.searchParams.set(key, value);
		});
	}

	return {
		url: url.toString(),
	} as Request;
}

// Helper: Create mock Supabase client
function createMockSupabaseClient() {
	return {
		auth: {
			getUser: vi.fn().mockResolvedValue({
				data: { user: { id: "test-user-id" } },
				error: null,
			}),
		},
		from: vi.fn().mockReturnValue({
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			or: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			range: vi.fn().mockResolvedValue({
				data: [
					{
						id: "log-1",
						plugin_id: "test-plugin",
						user_id: "user-123",
						event_type: "install",
						severity: "low",
						event_data: {},
						context: {},
						created_at: "2025-01-01T00:00:00Z",
					},
				],
				error: null,
				count: 1,
			}),
			maybeSingle: vi.fn().mockResolvedValue({
				data: {
					role: "admin",
					is_active: true,
				},
				error: null,
			}),
		}),
	};
}

describe("GET /api/plugins/security/audit-logs", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// TC-001: 正常系 - 監査ログの取得成功
	it("TC-001: Should get audit logs successfully", async () => {
		vi.mocked(createClient).mockResolvedValue(
			createMockSupabaseClient() as never,
		);

		const request = createMockRequest();

		const response = await GET(request as never);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.logs).toBeDefined();
		expect(data.totalCount).toBe(1);
	});

	// TC-002: 異常系 - 管理者権限なし
	it("TC-002: Should return 403 when user is not admin", async () => {
		const mockSupabase = createMockSupabaseClient();
		mockSupabase.from = vi.fn().mockReturnValue({
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			maybeSingle: vi.fn().mockResolvedValue({
				data: null,
				error: null,
			}),
			or: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			range: vi.fn().mockResolvedValue({
				data: [],
				error: null,
				count: 0,
			}),
		});
		vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

		const request = createMockRequest();

		const response = await GET(request as never);
		const data = await response.json();

		expect(response.status).toBe(403);
		expect(data.error).toBe("Unauthorized");
		expect(data.success).toBe(false);
	});

	// TC-003: 正常系 - フィルター付き取得
	it("TC-003: Should get audit logs with filters", async () => {
		vi.mocked(createClient).mockResolvedValue(
			createMockSupabaseClient() as never,
		);

		const request = createMockRequest({
			pluginId: "test-plugin",
			severity: "high",
			page: "1",
			limit: "10",
		});

		const response = await GET(request as never);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.logs).toBeDefined();
	});
});
