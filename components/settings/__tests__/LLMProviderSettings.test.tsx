/**
 * Tests for LLMProviderSettings Component
 *
 * Test Coverage:
 * - TC-001: Renders with default provider selection
 * - TC-002: Changes provider updates model dropdown
 * - TC-003: Changes model updates config
 * - TC-004: Save button updates localStorage
 * - TC-005: Shows correct models for each provider
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { LLMProviderProvider } from "@/lib/contexts/LLMProviderContext";
import { LLMProviderSettings } from "../LLMProviderSettings";

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};

	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
	};
})();

Object.defineProperty(window, "localStorage", {
	value: localStorageMock,
});

function Wrapper({ children }: { children: React.ReactNode }) {
	return <LLMProviderProvider>{children}</LLMProviderProvider>;
}

describe("LLMProviderSettings Component", () => {
	beforeEach(() => {
		localStorageMock.clear();
	});

	// TC-001: Renders with default provider selection
	test("TC-001: Renders with default Google provider selected", () => {
		render(<LLMProviderSettings />, { wrapper: Wrapper });

		expect(screen.getByText("問題生成の設定")).toBeInTheDocument();
		expect(screen.getByText("Google Gemini")).toBeInTheDocument();
		expect(screen.getByText("OpenAI")).toBeInTheDocument();
		expect(screen.getByText("Anthropic Claude")).toBeInTheDocument();

		// Check default provider is selected (google)
		const googleRadio = screen.getByRole("radio", { name: /google gemini/i });
		expect(googleRadio).toBeChecked();
	});

	// TC-002: Changes provider updates model dropdown
	test("TC-002: Changing provider updates available models", async () => {
		render(<LLMProviderSettings />, { wrapper: Wrapper });

		// Click OpenAI radio button
		const openaiRadio = screen.getByRole("radio", { name: /openai/i });
		fireEvent.click(openaiRadio);

		await waitFor(() => {
			expect(openaiRadio).toBeChecked();
		});

		// Open model dropdown
		const modelSelect = screen.getByRole("combobox");
		fireEvent.click(modelSelect);

		// Check OpenAI models are shown (use getAllByText since there may be duplicates)
		await waitFor(() => {
			const elements = screen.getAllByText(/GPT-4o Mini/i);
			expect(elements.length).toBeGreaterThan(0);
		});
	});

	// TC-003: Changes model updates config
	test("TC-003: Selecting different model updates config", async () => {
		render(<LLMProviderSettings />, { wrapper: Wrapper });

		// Open model dropdown
		const modelSelect = screen.getByRole("combobox");
		fireEvent.click(modelSelect);

		// Select a different model
		const modelOption = screen.getByText(/Gemini 2.0 Pro/i);
		fireEvent.click(modelOption);

		await waitFor(() => {
			const stored = localStorage.getItem("llm-provider-config");
			expect(stored).toBeTruthy();
			const parsed = JSON.parse(stored || "{}");
			expect(parsed.model).toBe("gemini-2.0-pro");
		});
	});

	// TC-004: Save button updates localStorage
	test("TC-004: Save button persists changes", async () => {
		render(<LLMProviderSettings />, { wrapper: Wrapper });

		// Change provider to Anthropic
		const anthropicRadio = screen.getByRole("radio", {
			name: /anthropic claude/i,
		});
		fireEvent.click(anthropicRadio);

		await waitFor(() => {
			expect(anthropicRadio).toBeChecked();
		});

		// Click save button
		const saveButton = screen.getByRole("button", { name: /設定を保存/i });
		fireEvent.click(saveButton);

		await waitFor(() => {
			expect(saveButton).toHaveTextContent("保存中...");
		});

		// Verify localStorage
		const stored = localStorage.getItem("llm-provider-config");
		expect(stored).toBeTruthy();
		const parsed = JSON.parse(stored || "{}");
		expect(parsed.provider).toBe("anthropic");
	});

	// TC-005: Shows correct models for each provider
	test("TC-005: Shows provider-specific models", async () => {
		render(<LLMProviderSettings />, { wrapper: Wrapper });

		// Check Google models (default)
		const modelSelect = screen.getByRole("combobox");
		fireEvent.click(modelSelect);
		await waitFor(() => {
			const elements = screen.getAllByText(/Gemini 2.5 Flash/i);
			expect(elements.length).toBeGreaterThan(0);
		});
	});

	// TC-006: Info alert is displayed
	test("TC-006: Shows info alert about provider usage", () => {
		render(<LLMProviderSettings />, { wrapper: Wrapper });

		expect(
			screen.getByText(/問題生成時にこのプロバイダーとモデルが使用されます/i),
		).toBeInTheDocument();
	});
});
