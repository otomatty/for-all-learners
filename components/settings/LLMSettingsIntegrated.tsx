/**
 * LLM Settings Integrated Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ app/(protected)/settings/_components/llm-settings/index.tsx
 *
 * Dependencies (依存先):
 *   ├─ lib/contexts/LLMProviderContext.tsx (useLLMProvider)
 *   ├─ app/_actions/ai/apiKey.ts (saveAPIKey, deleteAPIKey, getAPIKeyStatus)
 *   ├─ components/ui/* (shadcn/ui components)
 *   ├─ lucide-react (Icons)
 *   └─ sonner (toast)
 *
 * Related Files:
 *   ├─ Plan: docs/03_plans/ai-integration/20251103_02_settings-consolidation-plan.md
 *   ├─ Design: docs/03_plans/ai-integration/20251103_03_llm-settings-integration-design.md
 *   └─ Tests: ./__tests__/LLMSettingsIntegrated.test.tsx
 */

"use client";

import { EyeIcon, EyeOffIcon, Loader2 } from "lucide-react";
import { useEffect, useId, useState, useTransition } from "react";
import { toast } from "sonner";
import {
	type APIKeyStatus,
	deleteAPIKey,
	getAPIKeyStatus,
	saveAPIKey,
} from "@/app/_actions/ai/apiKey";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLLMProvider } from "@/lib/contexts/LLMProviderContext";
import type { LLMProvider } from "@/lib/llm/client";

// ============================================================================
// Type Definitions
// ============================================================================

interface ModelOption {
	value: string;
	label: string;
	description?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MODEL_OPTIONS: Record<LLMProvider, ModelOption[]> = {
	google: [
		{
			value: "gemini-2.0-flash-exp",
			label: "Gemini 2.0 Flash (Experimental)",
			description: "最新の実験版モデル（不安定な可能性）",
		},
		{
			value: "gemini-2.5-flash",
			label: "Gemini 2.5 Flash",
			description: "推奨：高速で正確なバランス型",
		},
		{
			value: "gemini-1.5-pro",
			label: "Gemini 1.5 Pro",
			description: "高度な推論能力、複雑なタスクに最適",
		},
		{
			value: "gemini-1.5-flash",
			label: "Gemini 1.5 Flash",
			description: "旧版：バランス型",
		},
	],
	openai: [
		{
			value: "gpt-4o",
			label: "GPT-4o",
			description: "推奨：最新の高性能モデル",
		},
		{
			value: "gpt-4o-mini",
			label: "GPT-4o Mini",
			description: "軽量版、コスト効率的",
		},
		{
			value: "gpt-4-turbo",
			label: "GPT-4 Turbo",
			description: "高性能、長文対応",
		},
		{
			value: "gpt-3.5-turbo",
			label: "GPT-3.5 Turbo",
			description: "旧版：コスト効率的",
		},
	],
	anthropic: [
		{
			value: "claude-3-5-sonnet-20241022",
			label: "Claude 3.5 Sonnet",
			description: "推奨：最新版、バランス型",
		},
		{
			value: "claude-3-opus-20240229",
			label: "Claude 3 Opus",
			description: "最高性能、複雑なタスクに最適",
		},
		{
			value: "claude-3-sonnet-20240229",
			label: "Claude 3 Sonnet",
			description: "バランス型",
		},
		{
			value: "claude-3-haiku-20240307",
			label: "Claude 3 Haiku",
			description: "高速・軽量、シンプルなタスクに最適",
		},
	],
};

const PROVIDER_LABELS: Record<LLMProvider, string> = {
	google: "Google Gemini",
	openai: "OpenAI GPT",
	anthropic: "Anthropic Claude",
};

// ============================================================================
// Component
// ============================================================================

export function LLMSettingsIntegrated() {
	// Generate unique IDs for accessibility
	const apiKeyInputIdPrefix = useId();

	// Context for model selection
	const { selectedModels, setSelectedModels } = useLLMProvider();

	// Local state for API keys per provider
	const [apiKeys, setApiKeys] = useState<Record<LLMProvider, string>>({
		google: "",
		openai: "",
		anthropic: "",
	});
	const [showAPIKeys, setShowAPIKeys] = useState<Record<LLMProvider, boolean>>({
		google: false,
		openai: false,
		anthropic: false,
	});
	const [apiKeyStatus, setApiKeyStatus] = useState<
		Record<LLMProvider, APIKeyStatus>
	>({
		google: { configured: false, updatedAt: null },
		openai: { configured: false, updatedAt: null },
		anthropic: { configured: false, updatedAt: null },
	});
	const [isLoading, setIsLoading] = useState(true);
	const [savingProvider, setSavingProvider] = useState<LLMProvider | null>(
		null,
	);
	const [_isPending, startTransition] = useTransition();

	// Load API key status
	useEffect(() => {
		const loadStatus = async () => {
			try {
				setIsLoading(true);
				const result = await getAPIKeyStatus();
				if (result.success) {
					setApiKeyStatus(result.data);
				}
			} catch {
				// Error is already logged by the server action
			} finally {
				setIsLoading(false);
			}
		};

		loadStatus();
	}, []);

	// Event handlers
	const handleModelToggle = (provider: LLMProvider, modelValue: string) => {
		const currentModels = selectedModels[provider];
		const isSelected = currentModels.includes(modelValue);

		if (isSelected) {
			// Unselect: remove from array (but keep at least one)
			if (currentModels.length > 1) {
				setSelectedModels({
					...selectedModels,
					[provider]: currentModels.filter((m) => m !== modelValue),
				});
			} else {
				toast.error("少なくとも1つのモデルを選択してください");
			}
		} else {
			// Select: add to array
			setSelectedModels({
				...selectedModels,
				[provider]: [...currentModels, modelValue],
			});
		}
	};

	const handleSaveAPIKey = (provider: LLMProvider) => {
		const apiKey = apiKeys[provider];
		if (!apiKey.trim()) {
			toast.error("APIキーを入力してください");
			return;
		}

		setSavingProvider(provider);
		startTransition(async () => {
			try {
				const result = await saveAPIKey(provider, apiKey);
				if (result.success) {
					toast.success(`${PROVIDER_LABELS[provider]} のAPIキーを保存しました`);
					setApiKeys((prev) => ({ ...prev, [provider]: "" }));
					setShowAPIKeys((prev) => ({ ...prev, [provider]: false }));

					// Reload status
					const statusResult = await getAPIKeyStatus();
					if (statusResult.success) {
						setApiKeyStatus(statusResult.data);
					}
				} else {
					toast.error(result.error || "APIキーの保存に失敗しました");
				}
			} catch {
				// Error is already logged by the server action
				toast.error("APIキーの保存に失敗しました");
			} finally {
				setSavingProvider(null);
			}
		});
	};

	const handleDeleteAPIKey = (provider: LLMProvider) => {
		setSavingProvider(provider);
		startTransition(async () => {
			try {
				const result = await deleteAPIKey(provider);
				if (result.success) {
					toast.success(`${PROVIDER_LABELS[provider]} のAPIキーを削除しました`);
					setApiKeys((prev) => ({ ...prev, [provider]: "" }));

					// Reload status
					const statusResult = await getAPIKeyStatus();
					if (statusResult.success) {
						setApiKeyStatus(statusResult.data);
					}
				} else {
					toast.error(result.error || "APIキーの削除に失敗しました");
				}
			} catch {
				// Error is already logged by the server action
				toast.error("APIキーの削除に失敗しました");
			} finally {
				setSavingProvider(null);
			}
		});
	};

	// Loading state
	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				<span className="ml-2 text-sm text-muted-foreground">
					設定を読み込んでいます...
				</span>
			</div>
		);
	}

	// Render provider accordion item
	const renderProviderAccordion = (provider: LLMProvider) => {
		const status = apiKeyStatus[provider];
		const isConfigured = status.configured;
		const isSaving = savingProvider === provider;
		const apiKeyInputId = `${apiKeyInputIdPrefix}-${provider}`;

		return (
			<AccordionItem key={provider} value={provider}>
				<AccordionTrigger className="hover:no-underline">
					<div className="flex items-center justify-between w-full pr-4">
						<span className="font-medium">{PROVIDER_LABELS[provider]}</span>
						{isConfigured ? (
							<span className="text-xs text-green-600 dark:text-green-400">
								設定済み ✓
							</span>
						) : (
							<span className="text-xs text-yellow-600 dark:text-yellow-400">
								未設定
							</span>
						)}
					</div>
				</AccordionTrigger>
				<AccordionContent>
					<div className="space-y-4 pt-4">
						{/* API Key Input */}
						<div className="space-y-2">
							<Label htmlFor={apiKeyInputId}>APIキー</Label>
							<div className="flex space-x-2">
								<Input
									id={apiKeyInputId}
									type={showAPIKeys[provider] ? "text" : "password"}
									value={apiKeys[provider]}
									onChange={(e) =>
										setApiKeys((prev) => ({
											...prev,
											[provider]: e.target.value,
										}))
									}
									placeholder="APIキーを入力"
									className="flex-1"
								/>
								<Button
									variant="ghost"
									size="icon"
									onClick={() =>
										setShowAPIKeys((prev) => ({
											...prev,
											[provider]: !prev[provider],
										}))
									}
									type="button"
								>
									{showAPIKeys[provider] ? (
										<EyeOffIcon className="h-4 w-4" />
									) : (
										<EyeIcon className="h-4 w-4" />
									)}
								</Button>
							</div>
						</div>

						{/* Action Buttons */}
						<div className="flex space-x-2">
							<Button
								onClick={() => handleSaveAPIKey(provider)}
								disabled={isSaving || !apiKeys[provider].trim()}
								size="sm"
							>
								{isSaving ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										保存中...
									</>
								) : (
									"保存"
								)}
							</Button>
							{isConfigured && (
								<Button
									variant="destructive"
									onClick={() => handleDeleteAPIKey(provider)}
									disabled={isSaving}
									size="sm"
								>
									削除
								</Button>
							)}
						</div>

						{/* Model Selection */}
						<div className="space-y-3 pt-4 border-t">
							<Label className="text-sm font-medium">
								使用可能なモデル（チェックしたモデルのみAIチャットに表示）
							</Label>
							<div className="space-y-2">
								{MODEL_OPTIONS[provider].map((model) => {
									const checkboxId = `${apiKeyInputIdPrefix}-${provider}-${model.value}`;
									const isSelected = selectedModels[provider].includes(
										model.value,
									);

									return (
										<div
											key={model.value}
											className="flex items-start space-x-2"
										>
											<Checkbox
												id={checkboxId}
												checked={isSelected}
												onCheckedChange={() =>
													handleModelToggle(provider, model.value)
												}
											/>
											<div className="grid gap-1.5 leading-none">
												<Label
													htmlFor={checkboxId}
													className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
												>
													{model.label}
												</Label>
												{model.description && (
													<p className="text-xs text-muted-foreground">
														{model.description}
													</p>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>

						<p className="text-xs text-muted-foreground">
							ⓘ APIキーは暗号化されて安全に保存されます
						</p>
					</div>
				</AccordionContent>
			</AccordionItem>
		);
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="space-y-2">
				<h2 className="text-lg font-medium">LLM設定</h2>
				<p className="text-sm text-muted-foreground">
					各プロバイダーのAPIキーを設定し、AIチャットで使用するモデルを選択します。
				</p>
			</div>

			{/* Provider Accordions */}
			<Accordion type="single" collapsible className="w-full">
				{renderProviderAccordion("google")}
				{renderProviderAccordion("openai")}
				{renderProviderAccordion("anthropic")}
			</Accordion>
		</div>
	);
}
