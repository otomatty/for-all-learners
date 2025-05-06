"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import type { Database } from "@/types/database.types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	getUserLlmSettings,
	updateUserLlmSettings,
	deleteUserLlmSettings,
} from "@/app/_actions/llmSettings";

// LLM settings row type
type LlmSettingsRow = Database["public"]["Tables"]["user_llm_settings"]["Row"];

// システム側で提供するモデル一覧
const SYSTEM_MODELS: Record<LlmSettingsRow["provider"], string[]> = {
	gemini: ["gemini-text-bison-001", "gemini-code-gecko-001"],
	openai: ["gpt-3.5-turbo", "gpt-4"],
	claude: ["claude-v1", "claude-v1.3"],
	deepseek: ["deepseek-default"],
};

// プロバイダー一覧の型定義
const PROVIDERS: LlmSettingsRow["provider"][] = [
	"gemini",
	"openai",
	"claude",
	"deepseek",
];

export default function LlmSettings() {
	// モデル選択ステート
	const [selectedModel, setSelectedModel] = useState<string>("");
	const [customModels, setCustomModels] = useState<string[]>([]);
	const [newModel, setNewModel] = useState<string>("");
	// プロバイダー有効化ステート & 各プロバイダーのAPIキー
	const [enabledProviders, setEnabledProviders] = useState<
		LlmSettingsRow["provider"][]
	>([]);
	const [apiKeys, setApiKeys] = useState<
		Record<LlmSettingsRow["provider"], string>
	>({});
	const [isPending, startTransition] = useTransition();

	// プロバイダーに応じた利用可能モデル
	const availableModels = useMemo(() => {
		return [...(SYSTEM_MODELS[selectedModel] || []), ...customModels];
	}, [selectedModel, customModels]);

	// カスタムモデル追加
	const addCustomModel = () => {
		if (newModel && !customModels.includes(newModel)) {
			setCustomModels([...customModels, newModel]);
			setNewModel("");
			toast.success("カスタムモデルを追加しました");
		}
	};

	// 初期ロードで既存設定を取得
	useEffect(() => {
		(async () => {
			try {
				const data = await getUserLlmSettings();
				if (data) {
					setSelectedModel(data.provider);
					setEnabledProviders(data.provider ? [data.provider] : []);
					setApiKeys({ [data.provider]: data.api_key_encrypted });
				}
			} catch (err) {
				console.error(err);
			}
		})();
	}, []);

	return (
		<>
			{/* モデル選択セクション */}
			<section>
				<h2 className="text-lg font-medium">使用するモデル</h2>
				<div className="mt-2 space-y-4">
					<RadioGroup value={selectedModel} onValueChange={setSelectedModel}>
						{availableModels.map((model) => (
							<RadioGroupItem key={model} value={model} className="mr-4">
								{model}
							</RadioGroupItem>
						))}
					</RadioGroup>
					<div className="flex space-x-2">
						<Input
							placeholder="カスタムモデル名"
							value={newModel}
							onChange={(e) => setNewModel(e.target.value)}
						/>
						<Button onClick={addCustomModel}>追加</Button>
					</div>
				</div>
			</section>

			{/* プロバイダーごとの設定セクション */}
			<section className="mt-8">
				<h2 className="text-lg font-medium">プロバイダー設定</h2>
				<div className="mt-2 space-y-6">
					{PROVIDERS.map((p) => (
						<div key={p} className="p-4 border rounded">
							<div className="flex items-center justify-between">
								<span className="font-medium">{p}</span>
								<Switch
									checked={enabledProviders.includes(p)}
									onCheckedChange={(checked) => {
										if (checked) {
											setEnabledProviders([...enabledProviders, p]);
										} else {
											setEnabledProviders(
												enabledProviders.filter((x) => x !== p),
											);
											startTransition(async () => {
												await deleteUserLlmSettings();
												toast.success(`${p} 設定を解除しました`);
											});
										}
									}}
								/>
							</div>
							{enabledProviders.includes(p) && (
								<div className="mt-2 space-y-2">
									<Input
										type="password"
										placeholder="APIキーを入力"
										value={apiKeys[p] ?? ""}
										onChange={(e) =>
											setApiKeys({ ...apiKeys, [p]: e.target.value })
										}
									/>
									<Button
										onClick={() =>
											startTransition(async () => {
												await updateUserLlmSettings(p, apiKeys[p] || "");
												toast.success(`${p} 設定を保存しました`);
											})
										}
										disabled={isPending}
									>
										保存
									</Button>
								</div>
							)}
						</div>
					))}
				</div>
			</section>
		</>
	);
}
