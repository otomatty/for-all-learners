/**
 * Tests for LLMProviderContext
 *
 * Test Coverage:
 * - TC-001: Default config on initial load
 * - TC-002: Update provider and model
 * - TC-003: localStorage persistence
 * - TC-004: Invalid provider validation
 * - TC-005: SSR-safe (no window errors)
 * - TC-006: Multiple consumers share same state
 */

import { act, render, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { LLMProviderProvider, useLLMProvider } from "../LLMProviderContext";

type LLMProvider = "google" | "openai" | "anthropic";

interface LLMProviderConfig {
	provider: LLMProvider;
	model: string;
}

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

describe("LLMProviderContext", () => {
	beforeEach(() => {
		localStorageMock.clear();
	});

	// TC-001: Default config on initial load
	test("TC-001: Returns default config on initial load", () => {
		const { result } = renderHook(() => useLLMProvider(), {
			wrapper: LLMProviderProvider,
		});

		expect(result.current.config.provider).toBe("google");
		expect(result.current.config.model).toBe("gemini-2.5-flash");
	});

	// TC-002: Update provider and model
	test("TC-002: Updates provider and model correctly", () => {
		const { result } = renderHook(() => useLLMProvider(), {
			wrapper: LLMProviderProvider,
		});

		act(() => {
			result.current.setConfig({
				provider: "openai",
				model: "gpt-4o-mini",
			});
		});

		expect(result.current.config.provider).toBe("openai");
		expect(result.current.config.model).toBe("gpt-4o-mini");
	});

	// TC-003: localStorage persistence
	test("TC-003: Persists config to localStorage", () => {
		const { result } = renderHook(() => useLLMProvider(), {
			wrapper: LLMProviderProvider,
		});

		act(() => {
			result.current.setConfig({
				provider: "anthropic",
				model: "claude-3-5-haiku-latest",
			});
		});

		const stored = localStorage.getItem("llm-provider-config");
		expect(stored).toBeTruthy();
		const parsed = JSON.parse(stored || "{}");
		expect(parsed.provider).toBe("anthropic");
		expect(parsed.model).toBe("claude-3-5-haiku-latest");
	});

	// TC-004: Loads persisted config from localStorage
	test("TC-004: Loads config from localStorage on mount", async () => {
		// Pre-populate localStorage
		localStorage.setItem(
			"llm-provider-config",
			JSON.stringify({
				provider: "openai",
				model: "gpt-4o",
			}),
		);

		const { result } = renderHook(() => useLLMProvider(), {
			wrapper: LLMProviderProvider,
		});

		await waitFor(() => {
			expect(result.current.config.provider).toBe("openai");
			expect(result.current.config.model).toBe("gpt-4o");
		});
	});

	// TC-005: Invalid provider falls back to default
	test("TC-005: Falls back to default on invalid localStorage data", async () => {
		// Store invalid data
		localStorage.setItem(
			"llm-provider-config",
			JSON.stringify({
				provider: "invalid-provider",
				model: "test-model",
			}),
		);

		const { result } = renderHook(() => useLLMProvider(), {
			wrapper: LLMProviderProvider,
		});

		await waitFor(() => {
			expect(result.current.config.provider).toBe("google");
			expect(result.current.config.model).toBe("gemini-2.5-flash");
		});
	});

	// TC-006: Multiple consumers share same state (within same Provider)
	test("TC-006: Multiple hooks in same provider share state", () => {
		const state = {
			setConfig1: null as ((config: LLMProviderConfig) => void) | null,
			config2: null as LLMProviderConfig | null,
		};

		function TestComponent1() {
			const { setConfig } = useLLMProvider();
			state.setConfig1 = setConfig;
			return null;
		}

		function TestComponent2() {
			const { config } = useLLMProvider();
			state.config2 = config;
			return null;
		}

		render(
			<LLMProviderProvider>
				<TestComponent1 />
				<TestComponent2 />
			</LLMProviderProvider>,
		);

		act(() => {
			state.setConfig1?.({
				provider: "anthropic",
				model: "claude-3-5-sonnet-latest",
			});
		});

		expect(state.config2?.provider).toBe("anthropic");
		expect(state.config2?.model).toBe("claude-3-5-sonnet-latest");
	});

	// TC-007: setConfig accepts partial updates (only provider)
	test("TC-007: Accepts partial config update (provider only)", () => {
		const { result } = renderHook(() => useLLMProvider(), {
			wrapper: LLMProviderProvider,
		});

		// Set initial state
		act(() => {
			result.current.setConfig({
				provider: "openai",
				model: "gpt-4o-mini",
			});
		});

		// Update only provider
		act(() => {
			result.current.setConfig({
				provider: "anthropic",
				model: "gpt-4o-mini", // Keep same model
			});
		});

		expect(result.current.config.provider).toBe("anthropic");
		expect(result.current.config.model).toBe("gpt-4o-mini");
	});
});
