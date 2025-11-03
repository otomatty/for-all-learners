/**
 * APIKeySettings Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (このファイルを import している場所):
 *   └─ components/settings/LLMSettingsIntegrated.tsx
 *
 * Dependencies (このファイルが import している外部ファイル):
 *   ├─ components/settings/ProviderCard.tsx
 *   ├─ components/settings/APIKeyForm.tsx
 *   ├─ components/ui/alert-dialog.tsx
 *   ├─ app/_actions/ai/apiKey.ts (Server Actions)
 *   ├─ lucide-react (Loader2)
 *   └─ sonner (toast)
 *
 * Related Files:
 *   ├─ Spec: ./APIKeySettings.spec.md
 *   ├─ Tests: ./__tests__/APIKeySettings.test.tsx
 *   └─ Integrated: ./LLMSettingsIntegrated.tsx
 */

"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	type APIKeyStatus,
	deleteAPIKey,
	getAPIKeyStatus,
} from "@/app/_actions/ai/apiKey";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { LLMProvider } from "@/lib/llm/client";
import { APIKeyForm } from "./APIKeyForm";
import { PROVIDER_CONFIG, ProviderCard } from "./ProviderCard";

// ============================================================================
// Type Definitions
// ============================================================================

interface APIKeySettingsState {
	keyStatus: Record<LLMProvider, APIKeyStatus>;
	isLoading: boolean;
	selectedProvider: LLMProvider | null;
	isFormOpen: boolean;
	isDeleteDialogOpen: boolean;
	providerToDelete: LLMProvider | null;
	isDeletingProvider: LLMProvider | null;
}

// ============================================================================
// Component
// ============================================================================

export function APIKeySettings() {
	const [state, setState] = useState<APIKeySettingsState>({
		keyStatus: {
			google: { configured: false, updatedAt: null },
			openai: { configured: false, updatedAt: null },
			anthropic: { configured: false, updatedAt: null },
		},
		isLoading: true,
		selectedProvider: null,
		isFormOpen: false,
		isDeleteDialogOpen: false,
		providerToDelete: null,
		isDeletingProvider: null,
	});

	// ========================================================================
	// Data Fetching
	// ========================================================================

	const refreshStatus = useCallback(async () => {
		setState((prev) => ({ ...prev, isLoading: true }));

		try {
			const result = await getAPIKeyStatus();

			if (result.success && result.data) {
				setState((prev) => ({
					...prev,
					keyStatus: result.data,
					isLoading: false,
				}));
			} else {
				toast.error("APIキー設定の取得に失敗しました");
				setState((prev) => ({ ...prev, isLoading: false }));
			}
		} catch {
			toast.error("予期しないエラーが発生しました");
			setState((prev) => ({ ...prev, isLoading: false }));
		}
	}, []);

	useEffect(() => {
		refreshStatus();
	}, [refreshStatus]);

	// ========================================================================
	// Event Handlers
	// ========================================================================

	const handleConfigure = useCallback((provider: LLMProvider) => {
		setState((prev) => ({
			...prev,
			selectedProvider: provider,
			isFormOpen: true,
		}));
	}, []);

	const handleEdit = useCallback((provider: LLMProvider) => {
		setState((prev) => ({
			...prev,
			selectedProvider: provider,
			isFormOpen: true,
		}));
	}, []);

	const handleDeleteClick = useCallback((provider: LLMProvider) => {
		setState((prev) => ({
			...prev,
			providerToDelete: provider,
			isDeleteDialogOpen: true,
		}));
	}, []);

	const handleDeleteConfirm = useCallback(async () => {
		const { providerToDelete } = state;
		if (!providerToDelete) return;

		setState((prev) => ({
			...prev,
			isDeletingProvider: providerToDelete,
			isDeleteDialogOpen: false,
		}));

		try {
			const result = await deleteAPIKey(providerToDelete);

			if (result.success) {
				toast.success(result.message || "APIキーを削除しました");
				await refreshStatus();
			} else {
				toast.error(result.error || "削除に失敗しました");
			}
		} catch {
			toast.error("予期しないエラーが発生しました");
		} finally {
			setState((prev) => ({
				...prev,
				isDeletingProvider: null,
				providerToDelete: null,
			}));
		}
	}, [state, refreshStatus]);

	const handleSave = useCallback(async () => {
		setState((prev) => ({ ...prev, isFormOpen: false }));
		await refreshStatus();
	}, [refreshStatus]);

	const handleFormClose = useCallback(() => {
		setState((prev) => ({
			...prev,
			isFormOpen: false,
			selectedProvider: null,
		}));
	}, []);

	const handleDeleteCancel = useCallback(() => {
		setState((prev) => ({
			...prev,
			isDeleteDialogOpen: false,
			providerToDelete: null,
		}));
	}, []);

	// ========================================================================
	// Render
	// ========================================================================

	return (
		<div className="space-y-6">
			{/* ローディング状態 */}
			{state.isLoading && (
				<div className="flex justify-center py-8" data-testid="loading-spinner">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			)}

			{/* プロバイダーカード */}
			{!state.isLoading && (
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					<ProviderCard
						provider="google"
						configured={state.keyStatus.google.configured}
						updatedAt={state.keyStatus.google.updatedAt}
						onConfigure={() => handleConfigure("google")}
						onDelete={() => handleDeleteClick("google")}
						isLoading={state.isDeletingProvider === "google"}
					/>

					<ProviderCard
						provider="openai"
						configured={state.keyStatus.openai.configured}
						updatedAt={state.keyStatus.openai.updatedAt}
						onConfigure={() => handleEdit("openai")}
						onDelete={() => handleDeleteClick("openai")}
						isLoading={state.isDeletingProvider === "openai"}
					/>

					<ProviderCard
						provider="anthropic"
						configured={state.keyStatus.anthropic.configured}
						updatedAt={state.keyStatus.anthropic.updatedAt}
						onConfigure={() => handleEdit("anthropic")}
						onDelete={() => handleDeleteClick("anthropic")}
						isLoading={state.isDeletingProvider === "anthropic"}
					/>
				</div>
			)}

			{/* APIキー入力フォーム */}
			{state.selectedProvider && (
				<APIKeyForm
					provider={state.selectedProvider}
					isOpen={state.isFormOpen}
					onClose={handleFormClose}
					onSave={handleSave}
				/>
			)}

			{/* 削除確認ダイアログ */}
			<AlertDialog
				open={state.isDeleteDialogOpen}
				onOpenChange={(open) => {
					if (!open) handleDeleteCancel();
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>APIキーを削除しますか？</AlertDialogTitle>
						<AlertDialogDescription>
							{state.providerToDelete &&
								PROVIDER_CONFIG[state.providerToDelete].name}{" "}
							のAPIキーが削除されます。この操作は元に戻せません。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleDeleteCancel}>
							キャンセル
						</AlertDialogCancel>
						<AlertDialogAction onClick={handleDeleteConfirm}>
							削除
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
