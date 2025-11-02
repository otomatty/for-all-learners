/**
 * APIKeyForm Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (このファイルを import している場所):
 *   └─ components/settings/APIKeySettings.tsx
 *
 * Dependencies (このファイルが import している外部ファイル):
 *   ├─ components/ui/dialog.tsx
 *   ├─ components/ui/input.tsx
 *   ├─ components/ui/button.tsx
 *   ├─ components/ui/label.tsx
 *   ├─ components/ui/alert.tsx
 *   ├─ app/_actions/ai/apiKey.ts (Server Actions)
 *   ├─ components/settings/ProviderCard.tsx (PROVIDER_CONFIG)
 *   ├─ lucide-react (Eye, EyeOff, Loader2, CheckCircle2, AlertCircle)
 *   └─ sonner (toast)
 *
 * Related Files:
 *   ├─ Spec: ./APIKeyForm.spec.md
 *   ├─ Tests: ./__tests__/APIKeyForm.test.tsx
 *   └─ Server Actions: ../../app/_actions/ai/apiKey.ts
 */

"use client";

import {
	AlertCircle,
	CheckCircle2,
	ExternalLink,
	Eye,
	EyeOff,
	Loader2,
} from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { saveAPIKey, testAPIKey } from "@/app/_actions/ai/apiKey";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LLMProvider } from "@/lib/llm/client";
import { PROVIDER_CONFIG } from "./ProviderCard";

export interface APIKeyFormProps {
	/** プロバイダー識別子 */
	provider: LLMProvider;

	/** ダイアログの開閉状態 */
	isOpen: boolean;

	/** ダイアログを閉じるコールバック */
	onClose: () => void;

	/** 保存成功時のコールバック */
	onSave: () => void;
}

type TestResult = "success" | "error" | null;

export function APIKeyForm({
	provider,
	isOpen,
	onClose,
	onSave,
}: APIKeyFormProps) {
	const [apiKey, setApiKey] = useState("");
	const [isVisible, setIsVisible] = useState(false);
	const [isTesting, setIsTesting] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [testResult, setTestResult] = useState<TestResult>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const providerInfo = PROVIDER_CONFIG[provider];
	const inputId = useId();
	const errorId = useId();

	// ダイアログが閉じる時にフォームをリセット
	const resetForm = useCallback(() => {
		setApiKey("");
		setIsVisible(false);
		setTestResult(null);
		setErrorMessage(null);
	}, []);

	useEffect(() => {
		if (!isOpen) {
			resetForm();
		}
	}, [isOpen, resetForm]);

	async function handleTest() {
		const trimmedKey = apiKey.trim();

		if (!trimmedKey) {
			toast.error("APIキーを入力してください");
			return;
		}

		setIsTesting(true);
		setTestResult(null);
		setErrorMessage(null);

		try {
			const result = await testAPIKey(provider, trimmedKey);

			if (result.success) {
				setTestResult("success");
				toast.success("APIキーは有効です");
			} else {
				setTestResult("error");
				setErrorMessage(result.error);
				toast.error(result.error);
			}
		} catch {
			setTestResult("error");
			const message = "テスト中にエラーが発生しました";
			setErrorMessage(message);
			toast.error(message);
		} finally {
			setIsTesting(false);
		}
	}

	async function handleSave() {
		const trimmedKey = apiKey.trim();

		if (!trimmedKey) {
			toast.error("APIキーを入力してください");
			return;
		}

		setIsSaving(true);

		try {
			const result = await saveAPIKey(provider, trimmedKey);

			if (result.success) {
				toast.success("APIキーを保存しました");
				onSave(); // 親コンポーネントに通知
				onClose(); // ダイアログを閉じる
			} else {
				toast.error(result.error);
			}
		} catch {
			toast.error("保存中にエラーが発生しました");
		} finally {
			setIsSaving(false);
		}
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		// Enterキーで保存
		if (
			e.key === "Enter" &&
			!isSaving &&
			!isTesting &&
			apiKey.trim().length > 0
		) {
			handleSave();
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>
						<span className="flex items-center gap-2">
							<span aria-hidden="true">{providerInfo.icon}</span>
							{providerInfo.name} APIキー設定
						</span>
					</DialogTitle>
					<DialogDescription>
						APIキーを入力してください。
						<a
							href={providerInfo.docsUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1 text-primary hover:underline ml-1"
						>
							ドキュメント
							<ExternalLink className="h-3 w-3" />
						</a>
						から取得できます。
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* APIキー入力 */}
					<div className="space-y-2">
						<Label htmlFor={inputId}>APIキー</Label>
						<div className="flex gap-2">
							<Input
								id={inputId}
								type={isVisible ? "text" : "password"}
								value={apiKey}
								onChange={(e) => setApiKey(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="sk-..."
								disabled={isSaving || isTesting}
								className="flex-1"
								aria-label="APIキー入力"
								aria-invalid={testResult === "error"}
								aria-describedby={testResult === "error" ? errorId : undefined}
								data-testid="api-key-input"
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={() => setIsVisible(!isVisible)}
								disabled={isSaving || isTesting}
								aria-label={isVisible ? "APIキーを非表示" : "APIキーを表示"}
								data-testid="toggle-visibility-button"
							>
								{isVisible ? (
									<EyeOff className="h-4 w-4" />
								) : (
									<Eye className="h-4 w-4" />
								)}
							</Button>
						</div>
					</div>

					{/* テスト結果表示 */}
					{testResult === "success" && (
						<Alert variant="success" data-testid="success-alert">
							<CheckCircle2 className="h-4 w-4" />
							<AlertDescription>APIキーは有効です</AlertDescription>
						</Alert>
					)}

					{testResult === "error" && (
						<Alert
							variant="destructive"
							id={errorId}
							role="alert"
							data-testid="error-alert"
						>
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>
								{errorMessage || "APIキーが無効です"}
							</AlertDescription>
						</Alert>
					)}
				</div>

				<DialogFooter className="flex-col sm:flex-row gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={handleTest}
						disabled={!apiKey.trim() || isTesting || isSaving}
						data-testid="test-button"
					>
						{isTesting ? (
							<>
								<Loader2
									className="mr-2 h-4 w-4 animate-spin"
									data-testid="test-button-loading"
								/>
								テスト中...
							</>
						) : (
							"テスト"
						)}
					</Button>

					<Button
						type="button"
						onClick={handleSave}
						disabled={!apiKey.trim() || isSaving || isTesting}
						data-testid="save-button"
					>
						{isSaving ? (
							<>
								<Loader2
									className="mr-2 h-4 w-4 animate-spin"
									data-testid="save-button-loading"
								/>
								保存中...
							</>
						) : (
							"保存"
						)}
					</Button>

					<Button
						type="button"
						variant="ghost"
						onClick={onClose}
						disabled={isSaving || isTesting}
						data-testid="cancel-button"
					>
						キャンセル
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
