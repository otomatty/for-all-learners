/**
 * LLM Provider Context
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ app/layout.tsx (Provider wrapper)
 *   ├─ components/settings/LLMProviderSettings.tsx
 *   └─ hooks/useGenerateQuestions.ts
 *
 * Dependencies (依存先):
 *   └─ React (createContext, useContext, useEffect, useState)
 *
 * Related Files:
 *   ├─ Spec: docs/03_plans/ai-integration/20251103_01_phase14-ui-spec.md
 *   └─ Components: components/settings/LLMProviderSettings.tsx
 */

"use client";

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";

type LLMProvider = "google" | "openai" | "anthropic";

interface LLMProviderConfig {
	provider: LLMProvider;
	model: string;
}

interface LLMProviderContextValue {
	config: LLMProviderConfig;
	setConfig: (config: LLMProviderConfig) => void;
}

const LLMProviderContext = createContext<LLMProviderContextValue | null>(null);

const DEFAULT_CONFIG: LLMProviderConfig = {
	provider: "google",
	model: "gemini-2.5-flash",
};

const STORAGE_KEY = "llm-provider-config";

export function LLMProviderProvider({ children }: { children: ReactNode }) {
	const [config, setConfigState] = useState<LLMProviderConfig>(DEFAULT_CONFIG);

	// Load from localStorage on mount
	useEffect(() => {
		if (typeof window === "undefined") return;

		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			try {
				const parsed = JSON.parse(saved) as LLMProviderConfig;
				// Validate parsed data
				if (
					parsed.provider &&
					parsed.model &&
					["google", "openai", "anthropic"].includes(parsed.provider)
				) {
					setConfigState(parsed);
				}
			} catch {
				// Failed to parse config, use default
			}
		}
	}, []);

	// Save to localStorage on change
	const setConfig = (newConfig: LLMProviderConfig) => {
		setConfigState(newConfig);
		if (typeof window !== "undefined") {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
		}
	};

	return (
		<LLMProviderContext.Provider value={{ config, setConfig }}>
			{children}
		</LLMProviderContext.Provider>
	);
}

export function useLLMProvider() {
	const context = useContext(LLMProviderContext);
	if (!context) {
		throw new Error("useLLMProvider must be used within LLMProviderProvider");
	}
	return context;
}
