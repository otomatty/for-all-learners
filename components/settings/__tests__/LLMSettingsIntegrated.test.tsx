/**
 * LLMSettingsIntegrated Component Tests (Accordion UI)
 *
 * Test Strategy:
 * - Accordion expansion/collapse
 * - Provider selection behavior
 * - API key save/delete operations per provider
 * - Model selection behavior
 * - Model checkbox selection
 * - API key save/delete operations
 * - Error handling
 * - localStorage persistence
 * - UI state management
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
	type APIKeyStatus,
	deleteAPIKey,
	getAPIKeyStatus,
	saveAPIKey,
} from "@/app/_actions/ai/apiKey";

import { LLMSettingsIntegrated } from "../LLMSettingsIntegrated";

vi.mock("@/app/_actions/ai/apiKey", () => ({
	getAPIKeyStatus: vi.fn(),
	saveAPIKey: vi.fn(),
	deleteAPIKey: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

// Create mock state that can be updated and tracked
let mockSelectedModels = {
	google: ["gemini-2.5-flash"],
	openai: ["gpt-4o"],
	anthropic: ["claude-3-5-sonnet-20241022"],
};

const mockSetSelectedModels = vi.fn((newModels) => {
	if (typeof newModels === "function") {
		mockSelectedModels = newModels(mockSelectedModels);
	} else {
		mockSelectedModels = newModels;
	}
});

vi.mock("@/lib/contexts/LLMProviderContext", () => ({
	useLLMProvider: vi.fn(() => ({
		config: { provider: "google", model: "gemini-2.5-flash" },
		setConfig: vi.fn(),
		get selectedModels() {
			return mockSelectedModels;
		},
		setSelectedModels: mockSetSelectedModels,
	})),
}));

const mockGetAPIKeyStatus = getAPIKeyStatus as ReturnType<typeof vi.fn>;
const mockSaveAPIKey = saveAPIKey as ReturnType<typeof vi.fn>;
const mockDeleteAPIKey = deleteAPIKey as ReturnType<typeof vi.fn>;
const mockToast = toast as unknown as {
	success: ReturnType<typeof vi.fn>;
	error: ReturnType<typeof vi.fn>;
};

describe("LLMSettingsIntegrated", () => {
	const mockAPIKeyStatus: Record<string, APIKeyStatus> = {
		google: { configured: false, updatedAt: null },
		openai: { configured: false, updatedAt: null },
		anthropic: { configured: false, updatedAt: null },
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset mock state
		mockSelectedModels = {
			google: ["gemini-2.5-flash"],
			openai: ["gpt-4o"],
			anthropic: ["claude-3-5-sonnet-20241022"],
		};
		mockGetAPIKeyStatus.mockResolvedValue({
			success: true,
			data: mockAPIKeyStatus as Record<string, APIKeyStatus>,
		});
		mockSaveAPIKey.mockResolvedValue({ success: true });
		mockDeleteAPIKey.mockResolvedValue({ success: true });
		mockToast.success.mockReturnValue(undefined);
		mockToast.error.mockReturnValue(undefined);
		localStorage.clear();
	});

	// ========================================================================
	// TC-001: Component Rendering
	// ========================================================================
	test("TC-001: renders component with all provider accordions", async () => {
		render(<LLMSettingsIntegrated />);

		await waitFor(() => {
			expect(
				screen.queryByText(/設定を読み込んでいます/),
			).not.toBeInTheDocument();
		});

		// Check header
		expect(screen.getByText("LLM設定")).toBeInTheDocument();
		expect(
			screen.getByText(
				/各プロバイダーのAPIキーを設定し、AIチャットで使用するモデルを選択します/,
			),
		).toBeInTheDocument();

		// Check all provider accordions exist
		expect(screen.getByText("Google Gemini")).toBeInTheDocument();
		expect(screen.getByText("OpenAI GPT")).toBeInTheDocument();
		expect(screen.getByText("Anthropic Claude")).toBeInTheDocument();
	});

	// ========================================================================
	// TC-002: Accordion Expansion
	// ========================================================================
	test("TC-002: expands accordion and shows API key input", async () => {
		render(<LLMSettingsIntegrated />);

		await waitFor(() => {
			expect(
				screen.queryByText(/設定を読み込んでいます/),
			).not.toBeInTheDocument();
		});

		// Expand Google Gemini accordion
		const googleAccordion = screen.getByText("Google Gemini");
		fireEvent.click(googleAccordion);

		await waitFor(() => {
			// Check API key input is visible
			expect(screen.getByPlaceholderText("APIキーを入力")).toBeInTheDocument();
			expect(screen.getByText("保存")).toBeInTheDocument();
		});
	});

	// ========================================================================
	// TC-003: API Key Save
	// ========================================================================
	test("TC-003: saves API key successfully", async () => {
		mockGetAPIKeyStatus.mockResolvedValue({
			success: true,
			data: {
				...mockAPIKeyStatus,
				google: { configured: true, updatedAt: "2025-11-03T12:00:00Z" },
			} as Record<string, APIKeyStatus>,
		});

		render(<LLMSettingsIntegrated />);

		await waitFor(() => {
			expect(
				screen.queryByText(/設定を読み込んでいます/),
			).not.toBeInTheDocument();
		});

		// Expand Google accordion
		fireEvent.click(screen.getByText("Google Gemini"));

		await waitFor(() => {
			expect(screen.getByPlaceholderText("APIキーを入力")).toBeInTheDocument();
		});

		// Enter API key
		const input = screen.getByPlaceholderText("APIキーを入力");
		fireEvent.change(input, { target: { value: "test-api-key" } });

		// Click save button
		const saveButton = screen.getByText("保存");
		fireEvent.click(saveButton);

		await waitFor(() => {
			expect(mockSaveAPIKey).toHaveBeenCalledWith("google", "test-api-key");
			expect(mockToast.success).toHaveBeenCalledWith(
				"Google Gemini のAPIキーを保存しました",
			);
		});
	});

	// ========================================================================
	// TC-004: API Key Delete
	// ========================================================================
	test("TC-004: deletes API key successfully", async () => {
		mockGetAPIKeyStatus.mockResolvedValue({
			success: true,
			data: {
				...mockAPIKeyStatus,
				google: { configured: true, updatedAt: "2025-11-03T12:00:00Z" },
			} as Record<string, APIKeyStatus>,
		});

		render(<LLMSettingsIntegrated />);

		await waitFor(() => {
			expect(
				screen.queryByText(/設定を読み込んでいます/),
			).not.toBeInTheDocument();
		});

		// Expand Google accordion
		fireEvent.click(screen.getByText("Google Gemini"));

		await waitFor(() => {
			// Delete button should be visible when API key is configured
			expect(screen.getByText("削除")).toBeInTheDocument();
		});

		// Click delete button
		const deleteButton = screen.getByText("削除");
		fireEvent.click(deleteButton);

		await waitFor(() => {
			expect(mockDeleteAPIKey).toHaveBeenCalledWith("google");
			expect(mockToast.success).toHaveBeenCalledWith(
				"Google Gemini のAPIキーを削除しました",
			);
		});
	});

	// ========================================================================
	// TC-005: Model Checkbox Selection
	// ========================================================================
	test("TC-005: toggles model selection with checkboxes", async () => {
		render(<LLMSettingsIntegrated />);

		await waitFor(() => {
			expect(
				screen.queryByText(/設定を読み込んでいます/),
			).not.toBeInTheDocument();
		});

		// Expand Google accordion
		fireEvent.click(screen.getByText("Google Gemini"));

		await waitFor(() => {
			// First model should be checked by default
			const checkboxes = screen.getAllByRole("checkbox");
			expect(checkboxes.length).toBeGreaterThan(0);
		});

		// Get all checkboxes (should be 4 for Google: 2.0-flash-exp, 2.5-flash, 1.5-pro, 1.5-flash)
		const checkboxes = screen.getAllByRole("checkbox");

		// Click second checkbox to select another model
		fireEvent.click(checkboxes[1]);

		// Verify checkbox is now checked
		await waitFor(() => {
			expect(checkboxes[1]).toBeChecked();
		});
	});

	// ========================================================================
	// TC-006: Prevent Unselecting All Models
	// ========================================================================
	test("TC-006: prevents unselecting the last model", async () => {
		render(<LLMSettingsIntegrated />);

		await waitFor(() => {
			expect(
				screen.queryByText(/設定を読み込んでいます/),
			).not.toBeInTheDocument();
		});

		// Expand Google accordion
		fireEvent.click(screen.getByText("Google Gemini"));

		await waitFor(() => {
			const checkboxes = screen.getAllByRole("checkbox");
			expect(checkboxes.length).toBeGreaterThan(0);
		});

		const checkboxes = screen.getAllByRole("checkbox");

		// Find the checked checkbox (first model should be checked by default)
		// Radix UI Checkbox uses data-state="checked" attribute, not checked property
		const checkedCheckbox = checkboxes.find(
			(cb) => cb.getAttribute("data-state") === "checked",
		);
		expect(checkedCheckbox).toBeDefined();

		// Try to uncheck the checked checkbox (should be the only one)
		if (checkedCheckbox) {
			fireEvent.click(checkedCheckbox);

			// Should show error toast
			await waitFor(() => {
				expect(mockToast.error).toHaveBeenCalledWith(
					"少なくとも1つのモデルを選択してください",
				);
			});
		}
	});

	// ========================================================================
	// TC-007: API Key Status Display
	// ========================================================================
	test("TC-007: displays configured status correctly", async () => {
		mockGetAPIKeyStatus.mockResolvedValue({
			success: true,
			data: {
				google: { configured: true, updatedAt: "2025-11-03T12:00:00Z" },
				openai: { configured: false, updatedAt: null },
				anthropic: { configured: false, updatedAt: null },
			} as Record<string, APIKeyStatus>,
		});

		render(<LLMSettingsIntegrated />);

		await waitFor(() => {
			expect(
				screen.queryByText(/設定を読み込んでいます/),
			).not.toBeInTheDocument();
		});

		// Google should show "設定済み"
		const googleAccordion = screen.getByText("Google Gemini").closest("button");
		expect(googleAccordion).toBeInTheDocument();

		// Look for status badges
		const configuredBadges = screen.getAllByText(/設定済み/);
		expect(configuredBadges.length).toBeGreaterThan(0);

		const unconfiguredBadges = screen.getAllByText(/未設定/);
		expect(unconfiguredBadges.length).toBe(2); // OpenAI and Anthropic
	});

	// ========================================================================
	// TC-008: Error Handling - Save Failure
	// ========================================================================
	test("TC-008: handles save error correctly", async () => {
		mockSaveAPIKey.mockResolvedValue({
			success: false,
			error: "Invalid API key",
		});

		render(<LLMSettingsIntegrated />);

		await waitFor(() => {
			expect(
				screen.queryByText(/設定を読み込んでいます/),
			).not.toBeInTheDocument();
		});

		// Expand Google accordion
		fireEvent.click(screen.getByText("Google Gemini"));

		await waitFor(() => {
			expect(screen.getByPlaceholderText("APIキーを入力")).toBeInTheDocument();
		});

		// Enter API key and save
		const input = screen.getByPlaceholderText("APIキーを入力");
		fireEvent.change(input, { target: { value: "invalid-key" } });
		fireEvent.click(screen.getByText("保存"));

		await waitFor(() => {
			expect(mockToast.error).toHaveBeenCalledWith("Invalid API key");
		});
	});

	// ========================================================================
	// TC-009: Multiple Providers
	// ========================================================================
	test("TC-009: handles multiple provider accordions independently", async () => {
		render(<LLMSettingsIntegrated />);

		await waitFor(() => {
			expect(
				screen.queryByText(/設定を読み込んでいます/),
			).not.toBeInTheDocument();
		});

		// Expand Google accordion
		fireEvent.click(screen.getByText("Google Gemini"));

		await waitFor(() => {
			expect(screen.getByText(/Gemini 2.5 Flash/)).toBeInTheDocument();
		});

		// Collapse Google, expand OpenAI
		fireEvent.click(screen.getByText("Google Gemini"));
		fireEvent.click(screen.getByText("OpenAI GPT"));

		await waitFor(() => {
			// Should now show OpenAI's models
			expect(screen.getAllByText(/GPT-4o/).length).toBeGreaterThan(0);
		});
	});

	// ========================================================================
	// TC-010: Password Visibility Toggle
	// ========================================================================
	test("TC-010: toggles API key visibility", async () => {
		render(<LLMSettingsIntegrated />);

		await waitFor(() => {
			expect(
				screen.queryByText(/設定を読み込んでいます/),
			).not.toBeInTheDocument();
		});

		// Expand Google accordion
		fireEvent.click(screen.getByText("Google Gemini"));

		await waitFor(() => {
			expect(screen.getByPlaceholderText("APIキーを入力")).toBeInTheDocument();
		});

		const input = screen.getByPlaceholderText("APIキーを入力");
		expect(input).toHaveAttribute("type", "password");

		// Find the eye icon button (visibility toggle button)
		// It should be near the input field
		const eyeIconButton = screen
			.getByPlaceholderText("APIキーを入力")
			.parentElement?.querySelector("button[type='button']");

		expect(eyeIconButton).toBeDefined();

		if (eyeIconButton) {
			fireEvent.click(eyeIconButton);

			await waitFor(() => {
				const updatedInput = screen.getByPlaceholderText("APIキーを入力");
				expect(updatedInput).toHaveAttribute("type", "text");
			});
		}
	});
});
