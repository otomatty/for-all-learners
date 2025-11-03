/**/**/**

 * LLMSettingsIntegrated Component Tests (Accordion UI)

 */ * LLMSettingsIntegrated Component Tests * LLMSettingsIntegrated Component Tests



import { fireEvent, render, screen, waitFor } from "@testing-library/react"; * *

import { beforeEach, describe, expect, test, vi } from "vitest";

import { toast } from "sonner"; * Test Strategy (Updated for Accordion UI): * Test Strategy:

import {

	type APIKeyStatus, * - Accordion expansion/collapse * - Provider selection behavior

	deleteAPIKey,

	getAPIKeyStatus, * - API key save/delete operations per provider * - Model selection behavior

	saveAPIKey,

} from "@/app/_actions/ai/apiKey"; * - Model checkbox selection * - API key save/delete operations

import { LLMSettingsIntegrated } from "../LLMSettingsIntegrated";

 * - Error handling * - localStorage persistence

vi.mock("@/app/_actions/ai/apiKey", () => ({

	getAPIKeyStatus: vi.fn(), * - UI state management * - Error handling

	saveAPIKey: vi.fn(),

	deleteAPIKey: vi.fn(), */ * - UI state management

}));

 */

vi.mock("sonner", () => ({

	toast: {import { fireEvent, render, screen, waitFor } from "@testing-library/react";

		success: vi.fn(),

		error: vi.fn(),import { beforeEach, describe, expect, test, vi } from "vitest";import { fireEvent, render, screen, waitFor } from "@testing-library/react";

	},

}));import { toast } from "sonner";import { beforeEach, describe, expect, test, vi } from "vitest";



vi.mock("@/lib/contexts/LLMProviderContext", () => ({import {import { toast } from "sonner";

	useLLMProvider: vi.fn(() => ({

		config: { provider: "google", model: "gemini-2.5-flash" },	type APIKeyStatus,import {

		setConfig: vi.fn(),

	})),	deleteAPIKey,	type APIKeyStatus,

}));

	getAPIKeyStatus,	deleteAPIKey,

const mockGetAPIKeyStatus = getAPIKeyStatus as ReturnType<typeof vi.fn>;

const mockSaveAPIKey = saveAPIKey as ReturnType<typeof vi.fn>;	saveAPIKey,	getAPIKeyStatus,

const mockDeleteAPIKey = deleteAPIKey as ReturnType<typeof vi.fn>;

const mockToast = toast as unknown as {} from "@/app/_actions/ai/apiKey";	saveAPIKey,

	success: ReturnType<typeof vi.fn>;

	error: ReturnType<typeof vi.fn>;import { LLMSettingsIntegrated } from "../LLMSettingsIntegrated";} from "@/app/_actions/ai/apiKey";

};

import { LLMSettingsIntegrated } from "../LLMSettingsIntegrated";

describe("LLMSettingsIntegrated", () => {

	const mockAPIKeyStatus: Record<string, APIKeyStatus> = {// Mock dependencies

		google: { configured: false, updatedAt: null },

		openai: { configured: false, updatedAt: null },vi.mock("@/app/_actions/ai/apiKey", () => ({// Mock dependencies

		anthropic: { configured: false, updatedAt: null },

	};	getAPIKeyStatus: vi.fn(),vi.mock("@/app/_actions/ai/apiKey");



	beforeEach(() => {	saveAPIKey: vi.fn(),vi.mock("sonner");

		vi.clearAllMocks();

		mockGetAPIKeyStatus.mockResolvedValue({	deleteAPIKey: vi.fn(),vi.mock("@/lib/contexts/LLMProviderContext", () => ({

			success: true,

			data: mockAPIKeyStatus as Record<string, APIKeyStatus>,}));	useLLMProvider: vi.fn(() => ({

		});

		mockSaveAPIKey.mockResolvedValue({ success: true });		config: { provider: "google", model: "gemini-2.5-flash" },

		mockDeleteAPIKey.mockResolvedValue({ success: true });

		mockToast.success.mockReturnValue(undefined);vi.mock("sonner", () => ({		setConfig: vi.fn(),

		mockToast.error.mockReturnValue(undefined);

	});	toast: {	})),



	test("TC-001: renders component with all provider accordions", async () => {		success: vi.fn(),}));

		render(<LLMSettingsIntegrated />);

		await waitFor(() => {		error: vi.fn(),

			expect(screen.queryByText(/設定を読み込んでいます/)).not.toBeInTheDocument();

		});	},const mockGetAPIKeyStatus = getAPIKeyStatus as ReturnType<typeof vi.fn>;

		expect(screen.getByText("LLM設定")).toBeInTheDocument();

		expect(screen.getByText("Google Gemini")).toBeInTheDocument();}));const mockSaveAPIKey = saveAPIKey as ReturnType<typeof vi.fn>;

		expect(screen.getByText("OpenAI GPT")).toBeInTheDocument();

		expect(screen.getByText("Anthropic Claude")).toBeInTheDocument();const mockDeleteAPIKey = deleteAPIKey as ReturnType<typeof vi.fn>;

	});

vi.mock("@/lib/contexts/LLMProviderContext", () => ({const mockToast = toast as unknown as {

	test("TC-002: expands accordion and shows API key input", async () => {

		render(<LLMSettingsIntegrated />);	useLLMProvider: vi.fn(() => ({	success: ReturnType<typeof vi.fn>;

		await waitFor(() => {

			expect(screen.queryByText(/設定を読み込んでいます/)).not.toBeInTheDocument();		config: { provider: "google", model: "gemini-2.5-flash" },	error: ReturnType<typeof vi.fn>;

		});

		fireEvent.click(screen.getByText("Google Gemini"));		setConfig: vi.fn(),};

		await waitFor(() => {

			expect(screen.getByPlaceholderText("APIキーを入力")).toBeInTheDocument();	})),

		});

	});}));describe("LLMSettingsIntegrated", () => {



	test("TC-003: saves API key successfully", async () => {	const mockAPIKeyStatus: Record<string, APIKeyStatus> = {

		render(<LLMSettingsIntegrated />);

		await waitFor(() => {const mockGetAPIKeyStatus = getAPIKeyStatus as ReturnType<typeof vi.fn>;		google: { configured: false, updatedAt: null },

			expect(screen.queryByText(/設定を読み込んでいます/)).not.toBeInTheDocument();

		});const mockSaveAPIKey = saveAPIKey as ReturnType<typeof vi.fn>;		openai: { configured: false, updatedAt: null },

		fireEvent.click(screen.getByText("Google Gemini"));

		await waitFor(() => {const mockDeleteAPIKey = deleteAPIKey as ReturnType<typeof vi.fn>;		anthropic: { configured: false, updatedAt: null },

			expect(screen.getByPlaceholderText("APIキーを入力")).toBeInTheDocument();

		});const mockToast = toast as unknown as {	};

		const input = screen.getByPlaceholderText("APIキーを入力");

		fireEvent.change(input, { target: { value: "test-key" } });	success: ReturnType<typeof vi.fn>;

		fireEvent.click(screen.getByText("保存"));

		await waitFor(() => {	error: ReturnType<typeof vi.fn>;	beforeEach(() => {

			expect(mockSaveAPIKey).toHaveBeenCalledWith("google", "test-key");

		});};		vi.clearAllMocks();

	});

		(mockGetAPIKeyStatus as ReturnType<typeof vi.fn>).mockResolvedValue({

	test("TC-004: deletes API key successfully", async () => {

		mockGetAPIKeyStatus.mockResolvedValue({describe("LLMSettingsIntegrated", () => {			success: true,

			success: true,

			data: {	const mockAPIKeyStatus: Record<string, APIKeyStatus> = {			data: mockAPIKeyStatus,

				...mockAPIKeyStatus,

				google: { configured: true, updatedAt: "2025-11-03T12:00:00Z" },		google: { configured: false, updatedAt: null },		});

			} as Record<string, APIKeyStatus>,

		});		openai: { configured: false, updatedAt: null },		localStorage.clear();

		render(<LLMSettingsIntegrated />);

		await waitFor(() => {		anthropic: { configured: false, updatedAt: null },	});

			expect(screen.queryByText(/設定を読み込んでいます/)).not.toBeInTheDocument();

		});	};

		fireEvent.click(screen.getByText("Google Gemini"));

		await waitFor(() => {	// ========================================================================

			expect(screen.getByText("削除")).toBeInTheDocument();

		});	beforeEach(() => {	// TC-001: Default State

		fireEvent.click(screen.getByText("削除"));

		await waitFor(() => {		vi.clearAllMocks();	// ========================================================================

			expect(mockDeleteAPIKey).toHaveBeenCalledWith("google");

		});	test("TC-001: renders with default provider (Google) selected", async () => {

	});

		// Default mock implementation		render(<LLMSettingsIntegrated />);

	test("TC-005: toggles model selection with checkboxes", async () => {

		render(<LLMSettingsIntegrated />);		mockGetAPIKeyStatus.mockResolvedValue({

		await waitFor(() => {

			expect(screen.queryByText(/設定を読み込んでいます/)).not.toBeInTheDocument();			success: true,		await waitFor(() => {

		});

		fireEvent.click(screen.getByText("Google Gemini"));			data: mockAPIKeyStatus as Record<string, APIKeyStatus>,			expect(

		await waitFor(() => {

			const checkboxes = screen.getAllByRole("checkbox");		});				screen.queryByText(/設定を読み込んでいます/),

			expect(checkboxes.length).toBeGreaterThan(0);

		});			).not.toBeInTheDocument();

		const checkboxes = screen.getAllByRole("checkbox");

		fireEvent.click(checkboxes[1]);		mockSaveAPIKey.mockResolvedValue({ success: true });		});

		await waitFor(() => {

			expect(checkboxes[1]).toBeChecked();		mockDeleteAPIKey.mockResolvedValue({ success: true });

		});

	});		const googleRadio = screen.getByLabelText("Google Gemini");



	test("TC-006: prevents unselecting the last model", async () => {		mockToast.success.mockReturnValue(undefined);		expect(googleRadio).toBeChecked();

		render(<LLMSettingsIntegrated />);

		await waitFor(() => {		mockToast.error.mockReturnValue(undefined);	});

			expect(screen.queryByText(/設定を読み込んでいます/)).not.toBeInTheDocument();

		});	});

		fireEvent.click(screen.getByText("Google Gemini"));

		await waitFor(() => {	// ========================================================================

			const checkboxes = screen.getAllByRole("checkbox");

			expect(checkboxes.length).toBeGreaterThan(0);	// ========================================================================	// TC-002: Provider Change Auto-switches Model

		});

		const checkboxes = screen.getAllByRole("checkbox");	// TC-001: Component Rendering	// ========================================================================

		fireEvent.click(checkboxes[0]);

		await waitFor(() => {	// ========================================================================	test("TC-002: changing provider auto-switches to default model", async () => {

			expect(mockToast.error).toHaveBeenCalledWith(

				"少なくとも1つのモデルを選択してください",	test("TC-001: renders component with all provider accordions", async () => {		const mockSetConfig = vi.fn();

			);

		});		render(<LLMSettingsIntegrated />);		const { useLLMProvider } = await import(

	});

			"@/lib/contexts/LLMProviderContext"

	test("TC-007: displays configured status correctly", async () => {

		mockGetAPIKeyStatus.mockResolvedValue({		await waitFor(() => {		);

			success: true,

			data: {			expect(		(useLLMProvider as ReturnType<typeof vi.fn>).mockReturnValue({

				google: { configured: true, updatedAt: "2025-11-03T12:00:00Z" },

				openai: { configured: false, updatedAt: null },				screen.queryByText(/設定を読み込んでいます/),			config: { provider: "google", model: "gemini-2.5-flash" },

				anthropic: { configured: false, updatedAt: null },

			} as Record<string, APIKeyStatus>,			).not.toBeInTheDocument();			setConfig: mockSetConfig,

		});

		render(<LLMSettingsIntegrated />);		});		});

		await waitFor(() => {

			expect(screen.queryByText(/設定を読み込んでいます/)).not.toBeInTheDocument();

		});

		const configuredBadges = screen.getAllByText(/設定済み/);		// Check header		render(<LLMSettingsIntegrated />);

		expect(configuredBadges.length).toBeGreaterThan(0);

		const unconfiguredBadges = screen.getAllByText(/未設定/);		expect(screen.getByText("LLM設定")).toBeInTheDocument();

		expect(unconfiguredBadges.length).toBe(2);

	});		expect(		await waitFor(() => {



	test("TC-008: handles save error correctly", async () => {			screen.getByText(			expect(

		mockSaveAPIKey.mockResolvedValue({

			success: false,				/各プロバイダーのAPIキーを設定し、AIチャットで使用するモデルを選択します/,				screen.queryByText(/設定を読み込んでいます/),

			error: "Invalid API key",

		});			),			).not.toBeInTheDocument();

		render(<LLMSettingsIntegrated />);

		await waitFor(() => {		).toBeInTheDocument();		});

			expect(screen.queryByText(/設定を読み込んでいます/)).not.toBeInTheDocument();

		});

		fireEvent.click(screen.getByText("Google Gemini"));

		await waitFor(() => {		// Check all provider accordions exist		// Click OpenAI radio

			expect(screen.getByPlaceholderText("APIキーを入力")).toBeInTheDocument();

		});		expect(screen.getByText("Google Gemini")).toBeInTheDocument();		const openaiRadio = screen.getByLabelText("OpenAI GPT");

		const input = screen.getByPlaceholderText("APIキーを入力");

		fireEvent.change(input, { target: { value: "invalid-key" } });		expect(screen.getByText("OpenAI GPT")).toBeInTheDocument();		fireEvent.click(openaiRadio);

		fireEvent.click(screen.getByText("保存"));

		await waitFor(() => {		expect(screen.getByText("Anthropic Claude")).toBeInTheDocument();

			expect(mockToast.error).toHaveBeenCalledWith("Invalid API key");

		});	});		// Should call setConfig with OpenAI and default model (gpt-4o)

	});

		expect(mockSetConfig).toHaveBeenCalledWith({

	test("TC-009: handles multiple provider accordions independently", async () => {

		render(<LLMSettingsIntegrated />);	// ========================================================================			provider: "openai",

		await waitFor(() => {

			expect(screen.queryByText(/設定を読み込んでいます/)).not.toBeInTheDocument();	// TC-002: Accordion Expansion			model: "gpt-4o",

		});

		fireEvent.click(screen.getByText("Google Gemini"));	// ========================================================================		});

		await waitFor(() => {

			expect(screen.getByText(/Gemini 2.5 Flash/)).toBeInTheDocument();	test("TC-002: expands accordion and shows API key input", async () => {

		});

		fireEvent.click(screen.getByText("Google Gemini"));		render(<LLMSettingsIntegrated />);		// Should show success toast

		fireEvent.click(screen.getByText("OpenAI GPT"));

		await waitFor(() => {		expect(mockToast.success).toHaveBeenCalledWith(

			expect(screen.getAllByText(/GPT-4o/).length).toBeGreaterThan(0);

		});		await waitFor(() => {			expect.stringContaining("OpenAI GPT"),

	});

			expect(		);

	test("TC-010: toggles API key visibility", async () => {

		render(<LLMSettingsIntegrated />);				screen.queryByText(/設定を読み込んでいます/),	});

		await waitFor(() => {

			expect(screen.queryByText(/設定を読み込んでいます/)).not.toBeInTheDocument();			).not.toBeInTheDocument();

		});

		fireEvent.click(screen.getByText("Google Gemini"));		});	// ========================================================================

		await waitFor(() => {

			const input = screen.getByPlaceholderText("APIキーを入力");	// TC-003: Model Selection

			expect(input).toHaveAttribute("type", "password");

		});		// Expand Google Gemini accordion	// ========================================================================

		const eyeButtons = screen.getAllByRole("button");

		const toggleButton = eyeButtons.find((btn) => btn.querySelector("svg"));		const googleAccordion = screen.getByText("Google Gemini");	test("TC-003: model selection updates config", async () => {

		if (toggleButton) {

			fireEvent.click(toggleButton);		fireEvent.click(googleAccordion);		const mockSetConfig = vi.fn();

			await waitFor(() => {

				const input = screen.getByPlaceholderText("APIキーを入力");		const { useLLMProvider } = await import(

				expect(input).toHaveAttribute("type", "text");

			});		await waitFor(() => {			"@/lib/contexts/LLMProviderContext"

		}

	});			// Check API key input is visible		);

});

			expect(screen.getByPlaceholderText("APIキーを入力")).toBeInTheDocument();		(useLLMProvider as ReturnType<typeof vi.fn>).mockReturnValue({

			expect(screen.getByText("保存")).toBeInTheDocument();			config: { provider: "google", model: "gemini-2.5-flash" },

		});			setConfig: mockSetConfig,

	});		});



	// ========================================================================		render(<LLMSettingsIntegrated />);

	// TC-003: API Key Save

	// ========================================================================		await waitFor(() => {

	test("TC-003: saves API key successfully", async () => {			expect(

		mockGetAPIKeyStatus.mockResolvedValue({				screen.queryByText(/設定を読み込んでいます/),

			success: true,			).not.toBeInTheDocument();

			data: {		});

				...mockAPIKeyStatus,

				google: { configured: true, updatedAt: "2025-11-03T12:00:00Z" },		// Open model select (find by placeholder)

			} as Record<string, APIKeyStatus>,		const modelSelect = screen.getByRole("combobox");

		});		fireEvent.click(modelSelect);



		render(<LLMSettingsIntegrated />);		// Select gemini-1.5-pro

		await waitFor(() => {

		await waitFor(() => {			const proOption = screen.getByText("Gemini 1.5 Pro");

			expect(			fireEvent.click(proOption);

				screen.queryByText(/設定を読み込んでいます/),		});

			).not.toBeInTheDocument();

		});		// Should call setConfig with new model

		expect(mockSetConfig).toHaveBeenCalledWith({

		// Expand Google accordion			provider: "google",

		fireEvent.click(screen.getByText("Google Gemini"));			model: "gemini-1.5-pro",

		});

		await waitFor(() => {

			expect(screen.getByPlaceholderText("APIキーを入力")).toBeInTheDocument();		// Should show success toast

		});		expect(mockToast.success).toHaveBeenCalledWith(

			expect.stringContaining("Gemini 1.5 Pro"),

		// Enter API key		);

		const input = screen.getByPlaceholderText("APIキーを入力");	});

		fireEvent.change(input, { target: { value: "test-api-key" } });

	// ========================================================================

		// Click save button	// TC-004: API Key Save

		const saveButton = screen.getByText("保存");	// ========================================================================

		fireEvent.click(saveButton);	test("TC-004: saves API key successfully", async () => {

		mockSaveAPIKey.mockResolvedValue({

		await waitFor(() => {			success: true,

			expect(mockSaveAPIKey).toHaveBeenCalledWith("google", "test-api-key");			message: "API key saved",

			expect(mockToast.success).toHaveBeenCalledWith(		});

				"Google Gemini のAPIキーを保存しました",

			);		render(<LLMSettingsIntegrated />);

		});

	});		await waitFor(() => {

			expect(

	// ========================================================================				screen.queryByText(/設定を読み込んでいます/),

	// TC-004: API Key Delete			).not.toBeInTheDocument();

	// ========================================================================		});

	test("TC-004: deletes API key successfully", async () => {

		mockGetAPIKeyStatus.mockResolvedValue({		// Enter API key

			success: true,		const apiKeyInput = screen.getByPlaceholderText("APIキーを入力");

			data: {		fireEvent.change(apiKeyInput, { target: { value: "test-api-key-123" } });

				...mockAPIKeyStatus,

				google: { configured: true, updatedAt: "2025-11-03T12:00:00Z" },		// Click save button

			} as Record<string, APIKeyStatus>,		const saveButton = screen.getByText("保存");

		});		fireEvent.click(saveButton);



		render(<LLMSettingsIntegrated />);		// Should call saveAPIKey

		await waitFor(() => {

		await waitFor(() => {			expect(mockSaveAPIKey).toHaveBeenCalledWith("google", "test-api-key-123");

			expect(		});

				screen.queryByText(/設定を読み込んでいます/),

			).not.toBeInTheDocument();		// Should show success toast

		});		await waitFor(() => {

			expect(mockToast.success).toHaveBeenCalledWith("APIキーを保存しました");

		// Expand Google accordion		});

		fireEvent.click(screen.getByText("Google Gemini"));	});



		await waitFor(() => {	// ========================================================================

			// Delete button should be visible when API key is configured	// TC-005: localStorage Persistence (verified via Context)

			expect(screen.getByText("削除")).toBeInTheDocument();	// ========================================================================

		});	test("TC-005: config changes are persisted via context", async () => {

		const mockSetConfig = vi.fn();

		// Click delete button		const { useLLMProvider } = await import(

		const deleteButton = screen.getByText("削除");			"@/lib/contexts/LLMProviderContext"

		fireEvent.click(deleteButton);		);

		(useLLMProvider as ReturnType<typeof vi.fn>).mockReturnValue({

		await waitFor(() => {			config: { provider: "google", model: "gemini-2.5-flash" },

			expect(mockDeleteAPIKey).toHaveBeenCalledWith("google");			setConfig: mockSetConfig,

			expect(mockToast.success).toHaveBeenCalledWith(		});

				"Google Gemini のAPIキーを削除しました",

			);		render(<LLMSettingsIntegrated />);

		});

	});		await waitFor(() => {

			expect(

	// ========================================================================				screen.queryByText(/設定を読み込んでいます/),

	// TC-005: Model Checkbox Selection			).not.toBeInTheDocument();

	// ========================================================================		});

	test("TC-005: toggles model selection with checkboxes", async () => {

		render(<LLMSettingsIntegrated />);		// Change provider

		const anthropicRadio = screen.getByLabelText("Anthropic Claude");

		await waitFor(() => {		fireEvent.click(anthropicRadio);

			expect(

				screen.queryByText(/設定を読み込んでいます/),		// setConfig should be called (Context will handle localStorage)

			).not.toBeInTheDocument();		expect(mockSetConfig).toHaveBeenCalledWith({

		});			provider: "anthropic",

			model: "claude-3-5-sonnet-20241022",

		// Expand Google accordion		});

		fireEvent.click(screen.getByText("Google Gemini"));	});



		await waitFor(() => {	// ========================================================================

			// First model should be checked by default	// TC-006: API Key Delete

			const checkboxes = screen.getAllByRole("checkbox");	// ========================================================================

			expect(checkboxes.length).toBeGreaterThan(0);	test("TC-006: deletes API key successfully", async () => {

		});		mockGetAPIKeyStatus.mockResolvedValue({

			success: true,

		// Get all checkboxes (should be 4 for Google: 2.0-flash-exp, 2.5-flash, 1.5-pro, 1.5-flash)			data: {

		const checkboxes = screen.getAllByRole("checkbox");				google: { configured: true, updatedAt: "2025-11-03T00:00:00Z" },

						openai: { configured: false, updatedAt: null },

		// Click second checkbox to select another model				anthropic: { configured: false, updatedAt: null },

		fireEvent.click(checkboxes[1]);			} as any,

		});

		// Verify checkbox is now checked

		await waitFor(() => {		mockDeleteAPIKey.mockResolvedValue({

			expect(checkboxes[1]).toBeChecked();			success: true,

		});			message: "API key deleted",

	});		});



	// ========================================================================		render(<LLMSettingsIntegrated />);

	// TC-006: Prevent Unselecting All Models

	// ========================================================================		await waitFor(() => {

	test("TC-006: prevents unselecting the last model", async () => {			expect(

		render(<LLMSettingsIntegrated />);				screen.queryByText(/設定を読み込んでいます/),

			).not.toBeInTheDocument();

		await waitFor(() => {		});

			expect(

				screen.queryByText(/設定を読み込んでいます/),		// Delete button should be visible (API key is configured)

			).not.toBeInTheDocument();		const deleteButton = screen.getByText("削除");

		});		fireEvent.click(deleteButton);



		// Expand Google accordion		// Should call deleteAPIKey

		fireEvent.click(screen.getByText("Google Gemini"));		await waitFor(() => {

			expect(mockDeleteAPIKey).toHaveBeenCalledWith("google");

		await waitFor(() => {		});

			const checkboxes = screen.getAllByRole("checkbox");

			expect(checkboxes.length).toBeGreaterThan(0);		// Should show success toast

		});		await waitFor(() => {

			expect(mockToast.success).toHaveBeenCalledWith("APIキーを削除しました");

		const checkboxes = screen.getAllByRole("checkbox");		});

			});

		// Try to uncheck the first (and only) checked checkbox

		fireEvent.click(checkboxes[0]);	// ========================================================================

	// TC-007: Error Handling - Save Failure

		// Should show error toast	// ========================================================================

		await waitFor(() => {	test("TC-007: handles save API key error", async () => {

			expect(mockToast.error).toHaveBeenCalledWith(		mockSaveAPIKey.mockResolvedValue({

				"少なくとも1つのモデルを選択してください",			success: false,

			);			error: "Invalid API key format",

		});		});

	});

		render(<LLMSettingsIntegrated />);

	// ========================================================================

	// TC-007: API Key Status Display		await waitFor(() => {

	// ========================================================================			expect(

	test("TC-007: displays configured status correctly", async () => {				screen.queryByText(/設定を読み込んでいます/),

		mockGetAPIKeyStatus.mockResolvedValue({			).not.toBeInTheDocument();

			success: true,		});

			data: {

				google: { configured: true, updatedAt: "2025-11-03T12:00:00Z" },		// Enter API key

				openai: { configured: false, updatedAt: null },		const apiKeyInput = screen.getByPlaceholderText("APIキーを入力");

				anthropic: { configured: false, updatedAt: null },		fireEvent.change(apiKeyInput, { target: { value: "invalid-key" } });

			} as Record<string, APIKeyStatus>,

		});		// Click save button

		const saveButton = screen.getByText("保存");

		render(<LLMSettingsIntegrated />);		fireEvent.click(saveButton);



		await waitFor(() => {		// Should show error toast

			expect(		await waitFor(() => {

				screen.queryByText(/設定を読み込んでいます/),			expect(mockToast.error).toHaveBeenCalledWith("Invalid API key format");

			).not.toBeInTheDocument();		});

		});	});



		// Google should show "設定済み"	// ========================================================================

		const googleAccordion = screen.getByText("Google Gemini").closest("button");	// TC-008: Error Handling - Delete Failure

		expect(googleAccordion).toBeInTheDocument();	// ========================================================================

			test("TC-008: handles delete API key error", async () => {

		// Look for status badges		mockGetAPIKeyStatus.mockResolvedValue({

		const configuredBadges = screen.getAllByText(/設定済み/);			success: true,

		expect(configuredBadges.length).toBeGreaterThan(0);			data: {

				google: { configured: true, updatedAt: "2025-11-03T00:00:00Z" },

		const unconfiguredBadges = screen.getAllByText(/未設定/);				openai: { configured: false, updatedAt: null },

		expect(unconfiguredBadges.length).toBe(2); // OpenAI and Anthropic				anthropic: { configured: false, updatedAt: null },

	});			} as any,

		});

	// ========================================================================

	// TC-008: Error Handling - Save Failure		mockDeleteAPIKey.mockResolvedValue({

	// ========================================================================			success: false,

	test("TC-008: handles save error correctly", async () => {			error: "Failed to delete",

		mockSaveAPIKey.mockResolvedValue({		});

			success: false,

			error: "Invalid API key",		render(<LLMSettingsIntegrated />);

		});

		await waitFor(() => {

		render(<LLMSettingsIntegrated />);			expect(

				screen.queryByText(/設定を読み込んでいます/),

		await waitFor(() => {			).not.toBeInTheDocument();

			expect(		});

				screen.queryByText(/設定を読み込んでいます/),

			).not.toBeInTheDocument();		// Delete button should be visible

		});		const deleteButton = screen.getByText("削除");

		fireEvent.click(deleteButton);

		// Expand Google accordion

		fireEvent.click(screen.getByText("Google Gemini"));		// Should show error toast

		await waitFor(() => {

		await waitFor(() => {			expect(mockToast.error).toHaveBeenCalledWith("Failed to delete");

			expect(screen.getByPlaceholderText("APIキーを入力")).toBeInTheDocument();		});

		});	});



		// Enter API key and save	// ========================================================================

		const input = screen.getByPlaceholderText("APIキーを入力");	// TC-009: Correct Models Displayed per Provider

		fireEvent.change(input, { target: { value: "invalid-key" } });	// ========================================================================

		fireEvent.click(screen.getByText("保存"));	test("TC-009: displays correct models for each provider", async () => {

		render(<LLMSettingsIntegrated />);

		await waitFor(() => {

			expect(mockToast.error).toHaveBeenCalledWith("Invalid API key");		await waitFor(() => {

		});			expect(

	});				screen.queryByText(/設定を読み込んでいます/),

			).not.toBeInTheDocument();

	// ========================================================================		});

	// TC-009: Multiple Providers

	// ========================================================================		// Google models should be available

	test("TC-009: handles multiple provider accordions independently", async () => {		const modelSelect = screen.getByRole("combobox");

		render(<LLMSettingsIntegrated />);		fireEvent.click(modelSelect);



		await waitFor(() => {		await waitFor(() => {

			expect(			expect(screen.getAllByText("Gemini 2.5 Flash").length).toBeGreaterThan(0);

				screen.queryByText(/設定を読み込んでいます/),			expect(screen.getAllByText("Gemini 1.5 Pro").length).toBeGreaterThan(0);

			).not.toBeInTheDocument();		});

		});	});



		// Expand Google accordion	// ========================================================================

		fireEvent.click(screen.getByText("Google Gemini"));	// TC-010: Settings Summary Display

	// ========================================================================

		await waitFor(() => {	test("TC-010: displays settings summary correctly", async () => {

			expect(screen.getByPlaceholderText("APIキーを入力")).toBeInTheDocument();		mockGetAPIKeyStatus.mockResolvedValue({

		});			success: true,

			data: {

		// Should have Google's models visible				google: { configured: true, updatedAt: "2025-11-03T12:00:00Z" },

		expect(screen.getByText(/Gemini 2.5 Flash/)).toBeInTheDocument();				openai: { configured: false, updatedAt: null },

				anthropic: { configured: false, updatedAt: null },

		// Collapse Google, expand OpenAI			} as any,

		fireEvent.click(screen.getByText("Google Gemini"));		});

		fireEvent.click(screen.getByText("OpenAI GPT"));

		render(<LLMSettingsIntegrated />);

		await waitFor(() => {

			// Should now show OpenAI's models		await waitFor(() => {

			expect(screen.getAllByText(/GPT-4o/).length).toBeGreaterThan(0);			expect(

		});				screen.queryByText(/設定を読み込んでいます/),

	});			).not.toBeInTheDocument();

		});

	// ========================================================================

	// TC-010: Password Visibility Toggle		// Check settings summary

	// ========================================================================		expect(screen.getByText(/プロバイダー:/)).toBeInTheDocument();

	test("TC-010: toggles API key visibility", async () => {		// "Google Gemini" appears in both RadioGroup label and summary, so use getAllByText

		render(<LLMSettingsIntegrated />);		expect(screen.getAllByText("Google Gemini").length).toBeGreaterThanOrEqual(

			1,

		await waitFor(() => {		);

			expect(		expect(screen.getByText(/モデル:/)).toBeInTheDocument();

				screen.queryByText(/設定を読み込んでいます/),		expect(screen.getByText(/設定済み ✓/)).toBeInTheDocument();

			).not.toBeInTheDocument();	});

		});

	// ========================================================================

		// Expand Google accordion	// TC-011: API Key Show/Hide Toggle

		fireEvent.click(screen.getByText("Google Gemini"));	// ========================================================================

	test("TC-011: toggles API key visibility", async () => {

		await waitFor(() => {		render(<LLMSettingsIntegrated />);

			const input = screen.getByPlaceholderText("APIキーを入力");

			expect(input).toHaveAttribute("type", "password");		await waitFor(() => {

		});			expect(

				screen.queryByText(/設定を読み込んでいます/),

		// Click eye icon to show password			).not.toBeInTheDocument();

		const eyeButtons = screen.getAllByRole("button");		});

		const toggleButton = eyeButtons.find((btn) =>

			btn.querySelector("svg"),		// Enter API key

		);		const apiKeyInput = screen.getByPlaceholderText(

			"APIキーを入力",

		if (toggleButton) {		) as HTMLInputElement;

			fireEvent.click(toggleButton);		fireEvent.change(apiKeyInput, { target: { value: "secret-key-123" } });



			await waitFor(() => {		// Initially, input type should be password

				const input = screen.getByPlaceholderText("APIキーを入力");		expect(apiKeyInput.type).toBe("password");

				expect(input).toHaveAttribute("type", "text");

			});		// Click eye icon to show

		}		const toggleButton = screen.getByRole("button", { name: "" }); // Eye icon button

	});		fireEvent.click(toggleButton);

});

		// Input type should change to text
		await waitFor(() => {
			expect(apiKeyInput.type).toBe("text");
		});
	});

	// ========================================================================
	// TC-012: Multiple Provider Switching
	// ========================================================================
	test("TC-012: handles multiple provider switches correctly", async () => {
		const mockSetConfig = vi.fn();
		const { useLLMProvider } = await import(
			"@/lib/contexts/LLMProviderContext"
		);
		(useLLMProvider as ReturnType<typeof vi.fn>).mockReturnValue({
			config: { provider: "google", model: "gemini-2.5-flash" },
			setConfig: mockSetConfig,
		});

		render(<LLMSettingsIntegrated />);

		await waitFor(() => {
			expect(
				screen.queryByText(/設定を読み込んでいます/),
			).not.toBeInTheDocument();
		});

		// Switch to OpenAI
		const openaiRadio = screen.getByLabelText("OpenAI GPT");
		fireEvent.click(openaiRadio);

		expect(mockSetConfig).toHaveBeenCalledWith({
			provider: "openai",
			model: "gpt-4o",
		});

		// Switch to Anthropic
		const anthropicRadio = screen.getByLabelText("Anthropic Claude");
		fireEvent.click(anthropicRadio);

		expect(mockSetConfig).toHaveBeenCalledWith({
			provider: "anthropic",
			model: "claude-3-5-sonnet-20241022",
		});

		// Should show success toasts for each switch
		expect(mockToast.success).toHaveBeenCalledTimes(2);
	});
});
