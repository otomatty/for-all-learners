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

export type LLMProvider = "google" | "openai" | "anthropic";

export interface LLMProviderConfig {
	provider: LLMProvider;
	model: string;
}

export interface SelectedModels {
	google: string[];
	openai: string[];
	anthropic: string[];
}

interface LLMProviderContextValue {
	config: LLMProviderConfig;
	setConfig: (config: LLMProviderConfig) => void;
	selectedModels: SelectedModels;
	setSelectedModels: (models: SelectedModels) => void;
}

const LLMProviderContext = createContext<LLMProviderContextValue | null>(null);

const DEFAULT_CONFIG: LLMProviderConfig = {
	provider: "google",
	model: "gemini-2.5-flash",
};

const DEFAULT_SELECTED_MODELS: SelectedModels = {
	google: ["gemini-2.5-flash"],
	openai: ["gpt-4o"],
	anthropic: ["claude-3-5-sonnet-20241022"],
};

const STORAGE_KEY = "llm-provider-config";
const MODELS_STORAGE_KEY = "llm-selected-models";

export function LLMProviderProvider({ children }: { children: ReactNode }) {
	const [config, setConfigState] = useState<LLMProviderConfig>(DEFAULT_CONFIG);
	const [selectedModels, setSelectedModelsState] = useState<SelectedModels>(
		DEFAULT_SELECTED_MODELS,
	);

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

		const savedModels = localStorage.getItem(MODELS_STORAGE_KEY);
		if (savedModels) {
			try {
				const parsed = JSON.parse(savedModels) as SelectedModels;
				// Validate parsed data
				if (parsed.google && parsed.openai && parsed.anthropic) {
					setSelectedModelsState(parsed);
				}
			} catch {
				// Failed to parse models, use default
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

	const setSelectedModels = (newModels: SelectedModels) => {
		setSelectedModelsState(newModels);
		if (typeof window !== "undefined") {
			localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(newModels));
		}
	};

	return (
		<LLMProviderContext.Provider
			value={{ config, setConfig, selectedModels, setSelectedModels }}
		>
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
