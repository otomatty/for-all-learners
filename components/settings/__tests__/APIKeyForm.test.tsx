/**
 * APIKeyForm Component Tests
 *
 * DEPENDENCY MAP:
 * - Component Under Test: ../APIKeyForm.tsx
 * - Related Spec: ../APIKeyForm.spec.md
 * - Test Cases: TC-001 to TC-012
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, test, vi } from "vitest";
import * as actions from "@/app/_actions/ai/apiKey";
import { APIKeyForm } from "../APIKeyForm";

// Mock modules
vi.mock("@/app/_actions/ai/apiKey", () => ({
	testAPIKey: vi.fn(),
	saveAPIKey: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
		loading: vi.fn(),
	},
}));

describe("APIKeyForm Component", () => {
	const mockOnSave = vi.fn();
	const mockOnClose = vi.fn();
	const defaultProps = {
		isOpen: true,
		onClose: mockOnClose,
		provider: "google" as const,
		onSave: mockOnSave,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	// TC-001: Dialog Rendering
	test("TC-001: Should render dialog with correct title and description", () => {
		render(<APIKeyForm {...defaultProps} />);

		expect(
			screen.getByRole("heading", { name: /Google Gemini APIキー設定/i }),
		).toBeInTheDocument();
		expect(screen.getByText(/APIキーを入力してください/i)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /ドキュメント/i })).toHaveAttribute(
			"href",
			"https://ai.google.dev/",
		);
	});

	// TC-002: Input Field Interaction
	test("TC-002: Should allow user to type API key", async () => {
		const user = userEvent.setup();
		render(<APIKeyForm {...defaultProps} />);

		const input = screen.getByLabelText(/APIキー入力/i);
		await user.type(input, "sk-test-key-123");

		expect(input).toHaveValue("sk-test-key-123");
	});

	// TC-003: Password Visibility Toggle
	test("TC-003: Should toggle password visibility", async () => {
		const user = userEvent.setup();
		render(<APIKeyForm {...defaultProps} />);

		const input = screen.getByLabelText(/APIキー入力/i);
		await user.type(input, "sk-secret");

		// Initially should be password type
		expect(input).toHaveAttribute("type", "password");

		// Click visibility toggle
		const toggleButton = screen.getByRole("button", {
			name: /APIキーを表示/i,
		});
		await user.click(toggleButton);

		// Should change to text type
		expect(input).toHaveAttribute("type", "text");

		// Click again to hide
		await user.click(toggleButton);
		expect(input).toHaveAttribute("type", "password");
	});

	// TC-004: Test Button - Empty Input
	test("TC-004: Should disable test button when input is empty", async () => {
		render(<APIKeyForm {...defaultProps} />);

		const testButton = screen.getByRole("button", { name: /テスト/i });

		// Button should be disabled when input is empty
		expect(testButton).toBeDisabled();
		expect(actions.testAPIKey).not.toHaveBeenCalled();
	});

	// TC-005: Test Button - Valid Key Success
	test("TC-005: Should show success alert when test succeeds", async () => {
		const user = userEvent.setup();
		vi.mocked(actions.testAPIKey).mockResolvedValue({
			success: true,
			message: "API key is valid",
		});

		render(<APIKeyForm {...defaultProps} />);

		const input = screen.getByLabelText(/APIキー入力/i);
		await user.type(input, "sk-valid-key");

		const testButton = screen.getByRole("button", { name: /テスト/i });
		await user.click(testButton);

		await waitFor(() => {
			expect(screen.getByTestId("success-alert")).toBeInTheDocument();
			expect(screen.getByText(/APIキーは有効です/i)).toBeInTheDocument();
		});

		expect(actions.testAPIKey).toHaveBeenCalledWith("google", "sk-valid-key");
	});

	// TC-006: Test Button - Invalid Key Error
	test("TC-006: Should show error alert when test fails", async () => {
		const user = userEvent.setup();
		vi.mocked(actions.testAPIKey).mockResolvedValue({
			success: false,
			error: "Invalid API key format",
		});

		render(<APIKeyForm {...defaultProps} />);

		const input = screen.getByLabelText(/APIキー入力/i);
		await user.type(input, "invalid-key");

		const testButton = screen.getByRole("button", { name: /テスト/i });
		await user.click(testButton);

		await waitFor(() => {
			expect(screen.getByTestId("error-alert")).toBeInTheDocument();
			expect(screen.getByText(/Invalid API key format/i)).toBeInTheDocument();
		});
	});

	// TC-007: Test Button - Loading State
	test("TC-007: Should show loading state during test", async () => {
		const user = userEvent.setup();
		vi.mocked(actions.testAPIKey).mockImplementation(
			() =>
				new Promise((resolve) => {
					setTimeout(() => resolve({ success: true, message: "Valid" }), 100);
				}),
		);

		render(<APIKeyForm {...defaultProps} />);

		const input = screen.getByLabelText(/APIキー入力/i);
		await user.type(input, "sk-test-key");

		const testButton = screen.getByRole("button", { name: /テスト/i });
		await user.click(testButton);

		// Should show loading indicator
		expect(screen.getByTestId("test-button-loading")).toBeInTheDocument();
		expect(testButton).toBeDisabled();

		// Input should be disabled during test
		expect(input).toBeDisabled();

		await waitFor(() => {
			expect(
				screen.queryByTestId("test-button-loading"),
			).not.toBeInTheDocument();
		});
	});

	// TC-008: Save Button - Empty Input
	test("TC-008: Should disable save button when input is empty", async () => {
		render(<APIKeyForm {...defaultProps} />);

		const saveButton = screen.getByRole("button", { name: /保存/i });

		// Button should be disabled when input is empty
		expect(saveButton).toBeDisabled();
		expect(actions.saveAPIKey).not.toHaveBeenCalled();
	});

	// TC-009: Save Button - Success Flow
	test("TC-009: Should save API key and close dialog on success", async () => {
		const user = userEvent.setup();
		const mockOnClose = vi.fn();
		vi.mocked(actions.saveAPIKey).mockResolvedValue({
			success: true,
			message: "Saved successfully",
		});

		render(<APIKeyForm {...defaultProps} onClose={mockOnClose} />);

		const input = screen.getByLabelText(/APIキー入力/i);
		await user.type(input, "sk-new-key");

		const saveButton = screen.getByRole("button", { name: /保存/i });
		await user.click(saveButton);

		await waitFor(() => {
			expect(actions.saveAPIKey).toHaveBeenCalledWith("google", "sk-new-key");
			expect(toast.success).toHaveBeenCalledWith("APIキーを保存しました");
			expect(mockOnSave).toHaveBeenCalled();
			expect(mockOnClose).toHaveBeenCalled();
		});
	});

	// TC-010: Save Button - Error Handling
	test("TC-010: Should handle save error", async () => {
		const user = userEvent.setup();
		vi.mocked(actions.saveAPIKey).mockResolvedValue({
			success: false,
			error: "Database error",
		});

		render(<APIKeyForm {...defaultProps} />);

		const input = screen.getByLabelText(/APIキー入力/i);
		await user.type(input, "sk-test-key");

		const saveButton = screen.getByRole("button", { name: /保存/i });
		await user.click(saveButton);

		await waitFor(() => {
			expect(actions.saveAPIKey).toHaveBeenCalledWith("google", "sk-test-key");
		});

		// Dialog should remain open - onSave should not be called
		expect(mockOnSave).not.toHaveBeenCalled();
	});

	// TC-011: Keyboard Shortcut - Enter to Save
	test("TC-011: Should save API key when Enter is pressed", async () => {
		const user = userEvent.setup();
		const mockOnClose = vi.fn();
		vi.mocked(actions.saveAPIKey).mockResolvedValue({
			success: true,
			message: "Saved",
		});

		render(<APIKeyForm {...defaultProps} onClose={mockOnClose} />);

		const input = screen.getByLabelText(/APIキー入力/i);
		await user.type(input, "sk-shortcut-key{Enter}");

		await waitFor(() => {
			expect(actions.saveAPIKey).toHaveBeenCalledWith(
				"google",
				"sk-shortcut-key",
			);
			expect(mockOnClose).toHaveBeenCalled();
		});
	});

	// TC-012: Dialog Close - Form Reset
	test("TC-012: Should reset form when dialog closes", async () => {
		const user = userEvent.setup();
		const mockOnClose = vi.fn();
		vi.mocked(actions.testAPIKey).mockResolvedValue({
			success: true,
			message: "Valid",
		});

		const { rerender } = render(
			<APIKeyForm {...defaultProps} onClose={mockOnClose} />,
		);

		// Fill in form and test
		const input = screen.getByLabelText(/APIキー入力/i);
		await user.type(input, "sk-test-reset");

		const testButton = screen.getByRole("button", { name: /テスト/i });
		await user.click(testButton);

		await waitFor(() => {
			expect(screen.getByTestId("success-alert")).toBeInTheDocument();
		});

		// Close dialog
		rerender(
			<APIKeyForm {...defaultProps} isOpen={false} onClose={mockOnClose} />,
		);

		// Re-open dialog
		rerender(
			<APIKeyForm {...defaultProps} isOpen={true} onClose={mockOnClose} />,
		);

		// Form should be reset
		const newInput = screen.getByLabelText(/APIキー入力/i);
		expect(newInput).toHaveValue("");
		expect(screen.queryByTestId("success-alert")).not.toBeInTheDocument();
		expect(screen.queryByTestId("error-alert")).not.toBeInTheDocument();
	});

	// Additional Edge Case Tests

	// TC-013: Save Button - Loading State
	test("TC-013: Should show loading state during save", async () => {
		const user = userEvent.setup();
		vi.mocked(actions.saveAPIKey).mockImplementation(
			() =>
				new Promise((resolve) => {
					setTimeout(() => resolve({ success: true, message: "Saved" }), 100);
				}),
		);

		render(<APIKeyForm {...defaultProps} />);

		const input = screen.getByLabelText(/APIキー入力/i);
		await user.type(input, "sk-save-test");

		const saveButton = screen.getByRole("button", { name: /保存/i });
		await user.click(saveButton);

		// Should show loading indicator
		expect(screen.getByTestId("save-button-loading")).toBeInTheDocument();
		expect(saveButton).toBeDisabled();

		// Other buttons should be disabled
		const testButton = screen.getByRole("button", { name: /テスト/i });
		const cancelButton = screen.getByRole("button", { name: /キャンセル/i });
		expect(testButton).toBeDisabled();
		expect(cancelButton).toBeDisabled();

		await waitFor(() => {
			expect(
				screen.queryByTestId("save-button-loading"),
			).not.toBeInTheDocument();
		});
	});

	// TC-014: Different Providers
	test("TC-014: Should render correct provider info for OpenAI", () => {
		render(<APIKeyForm {...defaultProps} provider="openai" />);

		expect(
			screen.getByRole("heading", { name: /OpenAI APIキー設定/i }),
		).toBeInTheDocument();
		// Check for the link to documentation
		expect(screen.getByRole("link", { name: /ドキュメント/i })).toHaveAttribute(
			"href",
			"https://platform.openai.com/",
		);
	});

	test("TC-014b: Should render correct provider info for Anthropic", () => {
		render(<APIKeyForm {...defaultProps} provider="anthropic" />);

		expect(
			screen.getByRole("heading", { name: /Anthropic Claude APIキー設定/i }),
		).toBeInTheDocument();
		// Check for the link to documentation
		expect(screen.getByRole("link", { name: /ドキュメント/i })).toHaveAttribute(
			"href",
			"https://docs.anthropic.com/",
		);
	});

	// TC-015: Accessibility
	test("TC-015: Should have proper accessibility attributes", () => {
		render(<APIKeyForm {...defaultProps} />);

		const input = screen.getByLabelText(/APIキー入力/i);

		// Should have aria-label
		expect(input).toHaveAttribute("aria-label", "APIキー入力");

		// Initially should not have aria-invalid
		expect(input).toHaveAttribute("aria-invalid", "false");

		// Should not have aria-describedby initially
		expect(input).not.toHaveAttribute("aria-describedby");
	});

	test("TC-015b: Should update aria attributes on error", async () => {
		const user = userEvent.setup();
		vi.mocked(actions.testAPIKey).mockResolvedValue({
			success: false,
			error: "Test error",
		});

		render(<APIKeyForm {...defaultProps} />);

		const input = screen.getByLabelText(/APIキー入力/i);
		await user.type(input, "invalid-key");

		const testButton = screen.getByRole("button", { name: /テスト/i });
		await user.click(testButton);

		await waitFor(() => {
			// Should have aria-invalid
			expect(input).toHaveAttribute("aria-invalid", "true");

			// Should have aria-describedby pointing to error message
			expect(input).toHaveAttribute("aria-describedby");
		});
	});

	// TC-016: Cancel Button
	test("TC-016: Should close dialog when cancel button is clicked", async () => {
		const user = userEvent.setup();
		const mockOnClose = vi.fn();

		render(<APIKeyForm {...defaultProps} onClose={mockOnClose} />);

		const cancelButton = screen.getByRole("button", { name: /キャンセル/i });
		await user.click(cancelButton);

		expect(mockOnClose).toHaveBeenCalled();
	});
});
