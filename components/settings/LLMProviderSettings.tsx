/**
 * LLM Provider Settings Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ [DEPRECATED] Use LLMSettingsIntegrated instead
 *
 * Dependencies (依存先):
 *   ├─ lib/contexts/LLMProviderContext.tsx (useLLMProvider)
 *   ├─ components/ui/label.tsx
 *   ├─ components/ui/radio-group.tsx
 *   ├─ components/ui/select.tsx
 *   ├─ components/ui/button.tsx
 *   └─ components/ui/alert.tsx
 *
 * Related Files:
 *   ├─ Spec: docs/03_plans/ai-integration/20251103_01_phase14-ui-spec.md
 *   ├─ Context: lib/contexts/LLMProviderContext.tsx
 *   └─ Integrated: ./LLMSettingsIntegrated.tsx (現在の推奨)
 */

"use client";

import { InfoIcon } from "lucide-react";
import { useId, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useLLMProvider } from "@/lib/contexts/LLMProviderContext";

type LLMProvider = "google" | "openai" | "anthropic";

const MODEL_OPTIONS: Record<
	LLMProvider,
	Array<{ value: string; label: string }>
> = {
	google: [
		{ value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (推奨)" },
		{ value: "gemini-2.0-pro", label: "Gemini 2.0 Pro" },
		{ value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
	],
	openai: [
		{ value: "gpt-4o-mini", label: "GPT-4o Mini (推奨)" },
		{ value: "gpt-4o", label: "GPT-4o" },
		{ value: "gpt-4-turbo", label: "GPT-4 Turbo" },
	],
	anthropic: [
		{ value: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku (推奨)" },
		{ value: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
		{ value: "claude-3-opus-latest", label: "Claude 3 Opus" },
	],
};

export function LLMProviderSettings() {
	const { config, setConfig } = useLLMProvider();
	const [isSaving, setIsSaving] = useState(false);
	const googleId = useId();
	const openaiId = useId();
	const anthropicId = useId();
	const modelSelectId = useId();

	const handleProviderChange = (provider: LLMProvider) => {
		// Set default model for selected provider
		const defaultModel = MODEL_OPTIONS[provider][0].value;
		setConfig({ provider, model: defaultModel });
	};

	const handleModelChange = (model: string) => {
		setConfig({ ...config, model });
	};

	const handleSave = () => {
		setIsSaving(true);
		// Config is already saved to localStorage via setConfig
		setTimeout(() => setIsSaving(false), 500);
	};

	return (
		<div className="space-y-6 rounded-lg border p-6">
			<div className="space-y-2">
				<h2 className="text-xl font-semibold">問題生成の設定</h2>
				<p className="text-sm text-muted-foreground">
					問題生成時に使用するAIプロバイダーとモデルを選択します
				</p>
			</div>

			<div className="space-y-4">
				{/* Provider Selection */}
				<div className="space-y-3">
					<Label>デフォルトプロバイダー</Label>
					<RadioGroup
						value={config.provider}
						onValueChange={(value) =>
							handleProviderChange(value as LLMProvider)
						}
						className="space-y-2"
					>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="google" id={googleId} />
							<Label htmlFor={googleId} className="cursor-pointer">
								Google Gemini
							</Label>
						</div>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="openai" id={openaiId} />
							<Label htmlFor={openaiId} className="cursor-pointer">
								OpenAI
							</Label>
						</div>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="anthropic" id={anthropicId} />
							<Label htmlFor={anthropicId} className="cursor-pointer">
								Anthropic Claude
							</Label>
						</div>
					</RadioGroup>
				</div>

				{/* Model Selection */}
				<div className="space-y-3">
					<Label htmlFor={modelSelectId}>モデル</Label>
					<Select value={config.model} onValueChange={handleModelChange}>
						<SelectTrigger id={modelSelectId}>
							<SelectValue placeholder="モデルを選択" />
						</SelectTrigger>
						<SelectContent>
							{MODEL_OPTIONS[config.provider].map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Info Alert */}
				<Alert>
					<InfoIcon className="h-4 w-4" />
					<AlertDescription>
						問題生成時にこのプロバイダーとモデルが使用されます
					</AlertDescription>
				</Alert>

				{/* Save Button */}
				<Button onClick={handleSave} disabled={isSaving} className="w-full">
					{isSaving ? "保存中..." : "設定を保存"}
				</Button>
			</div>
		</div>
	);
}
