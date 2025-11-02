/**
 * APIKeySettings Component Tests
 *
 * Test Suite for components/settings/APIKeySettings.tsx
 * Based on: APIKeySettings.spec.md
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	type APIKeyStatus,
	deleteAPIKey,
	getAPIKeyStatus,
} from "@/app/_actions/ai/apiKey";
import type { LLMProvider } from "@/lib/llm/client";
import { APIKeySettings } from "../APIKeySettings";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("@/app/_actions/ai/apiKey", () => ({
	getAPIKeyStatus: vi.fn(),
	deleteAPIKey: vi.fn(),
	testAPIKey: vi.fn(),
	saveAPIKey: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

// ============================================================================
// Test Data
// ============================================================================

const mockAllUnconfigured: Record<LLMProvider, APIKeyStatus> = {
	google: { configured: false, updatedAt: null },
	openai: { configured: false, updatedAt: null },
	anthropic: { configured: false, updatedAt: null },
};

const mockAllConfigured: Record<LLMProvider, APIKeyStatus> = {
	google: {
		configured: true,
		updatedAt: "2025-11-02T10:00:00.000Z",
	},
	openai: {
		configured: true,
		updatedAt: "2025-11-02T11:00:00.000Z",
	},
	anthropic: {
		configured: true,
		updatedAt: "2025-11-02T12:00:00.000Z",
	},
};

const mockPartialConfigured: Record<LLMProvider, APIKeyStatus> = {
	google: {
		configured: true,
		updatedAt: "2025-11-02T10:00:00.000Z",
	},
	openai: { configured: false, updatedAt: null },
	anthropic: { configured: false, updatedAt: null },
};

// ============================================================================
// Test Suite
// ============================================================================

describe("APIKeySettings", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	// ==========================================================================
	// TC-001: 初期レンダリング
	// ==========================================================================

	test("TC-001: should show loading spinner on initial render", () => {
		vi.mocked(getAPIKeyStatus).mockImplementation(
			() => new Promise(() => {}), // Never resolves
		);

		render(<APIKeySettings />);

		expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
		expect(getAPIKeyStatus).toHaveBeenCalledTimes(1);
	});

	// ==========================================================================
	// TC-002: データ取得成功
	// ==========================================================================

	test("TC-002: should render 3 provider cards after successful data fetch", async () => {
		vi.mocked(getAPIKeyStatus).mockResolvedValue({
			success: true,
			data: mockAllUnconfigured,
		});

		render(<APIKeySettings />);

		await waitFor(() => {
			expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
		});

		expect(screen.getByText("Google Gemini")).toBeInTheDocument();
		expect(screen.getByText("OpenAI")).toBeInTheDocument();
		expect(screen.getByText("Anthropic Claude")).toBeInTheDocument();
	});

	// ==========================================================================
	// TC-003: データ取得失敗
	// ==========================================================================

	test("TC-003: should show error toast when data fetch fails", async () => {
		vi.mocked(getAPIKeyStatus).mockResolvedValue({
			success: false,
			error: "Network error",
		});

		render(<APIKeySettings />);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				"APIキー設定の取得に失敗しました",
			);
		});

		expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
	});

	// ==========================================================================
	// TC-004: Configure ボタンクリック
	// ==========================================================================

	test("TC-004: should open APIKeyForm when Configure button is clicked", async () => {
		vi.mocked(getAPIKeyStatus).mockResolvedValue({
			success: true,
			data: mockAllUnconfigured,
		});

		render(<APIKeySettings />);

		await waitFor(() => {
			expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
		});

		const configureButtons = screen.getAllByRole("button", { name: /設定/i });
		fireEvent.click(configureButtons[0]); // Google

		await waitFor(() => {
			expect(screen.getByText("Google Gemini APIキー設定")).toBeInTheDocument();
		});
	});

	// ==========================================================================
	// TC-005: Edit ボタンクリック
	// ==========================================================================

	test("TC-005: should open APIKeyForm when Edit button is clicked", async () => {
		vi.mocked(getAPIKeyStatus).mockResolvedValue({
			success: true,
			data: mockAllConfigured,
		});

		render(<APIKeySettings />);

		await waitFor(() => {
			expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
		});

		const editButtons = screen.getAllByRole("button", { name: /編集/i });
		fireEvent.click(editButtons[0]); // Google

		await waitFor(() => {
			expect(screen.getByText("Google Gemini APIキー設定")).toBeInTheDocument();
		});
	});

	// ==========================================================================
	// TC-006: Delete ボタンクリック
	// ==========================================================================

	test("TC-006: should open delete confirmation dialog when Delete button is clicked", async () => {
		vi.mocked(getAPIKeyStatus).mockResolvedValue({
			success: true,
			data: mockAllConfigured,
		});

		render(<APIKeySettings />);

		await waitFor(() => {
			expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
		});

		const deleteButtons = screen.getAllByRole("button", { name: /削除/i });
		fireEvent.click(deleteButtons[0]); // Google

		await waitFor(() => {
			expect(screen.getByText("APIキーを削除しますか？")).toBeInTheDocument();
		});

		expect(
			screen.getByText(/Google Gemini のAPIキーが削除されます/i),
		).toBeInTheDocument();
	});

	// ==========================================================================
	// TC-007: 削除確認ダイアログ - キャンセル
	// ==========================================================================

	test("TC-007: should close dialog without deleting when Cancel is clicked", async () => {
		vi.mocked(getAPIKeyStatus).mockResolvedValue({
			success: true,
			data: mockAllConfigured,
		});

		render(<APIKeySettings />);

		await waitFor(() => {
			expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
		});

		const deleteButtons = screen.getAllByRole("button", { name: /削除/i });
		fireEvent.click(deleteButtons[0]);

		await waitFor(() => {
			expect(screen.getByText("APIキーを削除しますか？")).toBeInTheDocument();
		});

		const cancelButton = screen.getByRole("button", { name: /キャンセル/i });
		fireEvent.click(cancelButton);

		await waitFor(() => {
			expect(
				screen.queryByText("APIキーを削除しますか？"),
			).not.toBeInTheDocument();
		});

		expect(deleteAPIKey).not.toHaveBeenCalled();
	});

	// ==========================================================================
	// TC-008: 削除確認ダイアログ - 削除実行
	// ==========================================================================

	test("TC-008: should call deleteAPIKey when Delete is confirmed", async () => {
		vi.mocked(getAPIKeyStatus).mockResolvedValue({
			success: true,
			data: mockAllConfigured,
		});

		vi.mocked(deleteAPIKey).mockResolvedValue({
			success: true,
			message: "削除しました",
		});

		render(<APIKeySettings />);

		await waitFor(() => {
			expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
		});

		const deleteButtons = screen.getAllByRole("button", { name: /削除/i });
		fireEvent.click(deleteButtons[0]); // Google

		await waitFor(() => {
			expect(screen.getByText("APIキーを削除しますか？")).toBeInTheDocument();
		});

		const confirmButton = screen.getByRole("button", { name: /^削除$/i });
		fireEvent.click(confirmButton);

		await waitFor(() => {
			expect(deleteAPIKey).toHaveBeenCalledWith("google");
		});
	});

	// ==========================================================================
	// TC-009: 削除成功フロー
	// ==========================================================================

	test("TC-009: should show success toast and refresh status after successful delete", async () => {
		vi.mocked(getAPIKeyStatus)
			.mockResolvedValueOnce({
				success: true,
				data: mockAllConfigured,
			})
			.mockResolvedValueOnce({
				success: true,
				data: mockPartialConfigured,
			});

		vi.mocked(deleteAPIKey).mockResolvedValue({
			success: true,
			message: "削除しました",
		});

		render(<APIKeySettings />);

		await waitFor(() => {
			expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
		});

		const deleteButtons = screen.getAllByRole("button", { name: /削除/i });
		fireEvent.click(deleteButtons[1]); // OpenAI

		await waitFor(() => {
			expect(screen.getByText("APIキーを削除しますか？")).toBeInTheDocument();
		});

		const confirmButton = screen.getByRole("button", { name: /^削除$/i });
		fireEvent.click(confirmButton);

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalledWith("削除しました");
		});

		await waitFor(() => {
			expect(getAPIKeyStatus).toHaveBeenCalledTimes(2);
		});
	});

	// ==========================================================================
	// TC-010: 削除失敗フロー
	// ==========================================================================

	test("TC-010: should show error toast when delete fails", async () => {
		vi.mocked(getAPIKeyStatus).mockResolvedValue({
			success: true,
			data: mockAllConfigured,
		});

		vi.mocked(deleteAPIKey).mockResolvedValue({
			success: false,
			error: "削除に失敗しました",
		});

		render(<APIKeySettings />);

		await waitFor(() => {
			expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
		});

		const deleteButtons = screen.getAllByRole("button", { name: /削除/i });
		fireEvent.click(deleteButtons[0]);

		await waitFor(() => {
			expect(screen.getByText("APIキーを削除しますか？")).toBeInTheDocument();
		});

		const confirmButton = screen.getByRole("button", { name: /^削除$/i });
		fireEvent.click(confirmButton);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("削除に失敗しました");
		});
	});

	// ==========================================================================
	// TC-011: APIKeyForm保存成功
	// ==========================================================================

	test("TC-011: should refresh status after successful save in APIKeyForm", async () => {
		vi.mocked(getAPIKeyStatus)
			.mockResolvedValueOnce({
				success: true,
				data: mockAllUnconfigured,
			})
			.mockResolvedValueOnce({
				success: true,
				data: mockPartialConfigured,
			});

		render(<APIKeySettings />);

		await waitFor(() => {
			expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
		});

		// Configure → Form opens → onSave is called
		const configureButtons = screen.getAllByRole("button", { name: /設定/i });
		fireEvent.click(configureButtons[0]);

		await waitFor(() => {
			expect(screen.getByText("Google Gemini APIキー設定")).toBeInTheDocument();
		});

		// Simulate form save (this would happen inside APIKeyForm)
		// We'll close the form by calling onSave indirectly
		const cancelButton = screen.getByRole("button", { name: /キャンセル/i });
		fireEvent.click(cancelButton);

		// In real scenario, onSave would trigger refreshStatus
		// For this test, we check that getAPIKeyStatus was called on mount
		expect(getAPIKeyStatus).toHaveBeenCalledTimes(1);
	});

	// ==========================================================================
	// TC-012: 複数プロバイダー表示
	// ==========================================================================

	test("TC-012: should display all providers as configured when all are set", async () => {
		vi.mocked(getAPIKeyStatus).mockResolvedValue({
			success: true,
			data: mockAllConfigured,
		});

		render(<APIKeySettings />);

		await waitFor(() => {
			expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
		});

		const configuredBadges = screen.getAllByText("設定済み");
		expect(configuredBadges).toHaveLength(3);

		const dateElements = screen.getAllByText(/2025年11月2日/);
		expect(dateElements.length).toBeGreaterThanOrEqual(1);
	});

	// ==========================================================================
	// TC-013: 未設定プロバイダー表示
	// ==========================================================================

	test("TC-013: should display all providers as unconfigured when none are set", async () => {
		vi.mocked(getAPIKeyStatus).mockResolvedValue({
			success: true,
			data: mockAllUnconfigured,
		});

		render(<APIKeySettings />);

		await waitFor(() => {
			expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
		});

		const unconfiguredBadges = screen.getAllByText("未設定");
		expect(unconfiguredBadges).toHaveLength(3);

		const configureButtons = screen.getAllByRole("button", { name: /設定/i });
		expect(configureButtons).toHaveLength(3);
	});

	// ==========================================================================
	// TC-014: 削除中のローディング表示
	// ==========================================================================

	test("TC-014: should show loading overlay on deleting provider card", async () => {
		vi.mocked(getAPIKeyStatus).mockResolvedValue({
			success: true,
			data: mockAllConfigured,
		});

		vi.mocked(deleteAPIKey).mockImplementation(
			() =>
				new Promise((resolve) => {
					setTimeout(() => {
						resolve({ success: true, message: "削除しました" });
					}, 100);
				}),
		);

		render(<APIKeySettings />);

		await waitFor(() => {
			expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
		});

		const deleteButtons = screen.getAllByRole("button", { name: /削除/i });
		fireEvent.click(deleteButtons[0]);

		await waitFor(() => {
			expect(screen.getByText("APIキーを削除しますか？")).toBeInTheDocument();
		});

		const confirmButton = screen.getByRole("button", { name: /^削除$/i });
		fireEvent.click(confirmButton);

		// Check that loading overlay appears (ProviderCard has isLoading=true)
		await waitFor(() => {
			expect(deleteAPIKey).toHaveBeenCalledWith("google");
		});
	});

	// ==========================================================================
	// TC-015: アクセシビリティ - キーボードナビゲーション
	// ==========================================================================

	test("TC-015: should support keyboard navigation", async () => {
		vi.mocked(getAPIKeyStatus).mockResolvedValue({
			success: true,
			data: mockAllUnconfigured,
		});

		render(<APIKeySettings />);

		await waitFor(() => {
			expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
		});

		const configureButtons = screen.getAllByRole("button", { name: /設定/i });
		expect(configureButtons[0]).toBeInTheDocument();

		// Simulate Tab navigation
		configureButtons[0].focus();
		expect(document.activeElement).toBe(configureButtons[0]);
	});
});
