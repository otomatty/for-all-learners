/**
 * ProviderCard Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (このファイルを import している場所):
 *   └─ components/settings/APIKeySettings.tsx
 *
 * Dependencies (このファイルが import している外部ファイル):
 *   ├─ components/ui/card.tsx
 *   ├─ components/ui/button.tsx
 *   ├─ components/settings/APIKeyStatusBadge.tsx
 *   ├─ lucide-react (ExternalLink, Loader2)
 *   └─ lib/utils.ts (cn utility)
 *
 * Related Files:
 *   ├─ Spec: ./ProviderCard.spec.md
 *   ├─ Tests: ./__tests__/ProviderCard.test.tsx
 *   └─ Status Badge: ./APIKeyStatusBadge.tsx
 */

import { ExternalLink, Loader2 } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { LLMProvider } from "@/lib/llm/client";
import { APIKeyStatusBadge } from "./APIKeyStatusBadge";

export interface ProviderCardProps {
	/** プロバイダー識別子 */
	provider: LLMProvider;

	/** APIキーが設定済みかどうか */
	configured: boolean;

	/** 最終更新日時（ISO 8601形式） */
	updatedAt: string | null;

	/** 設定/編集ボタンクリック時のコールバック */
	onConfigure: () => void;

	/** 削除ボタンクリック時のコールバック */
	onDelete: () => void;

	/** ローディング状態（削除中など） */
	isLoading?: boolean;
}

interface ProviderInfo {
	name: string;
	icon: string;
	color: string;
	description: string;
	docsUrl: string;
}

export const PROVIDER_CONFIG: Record<LLMProvider, ProviderInfo> = {
	google: {
		name: "Google Gemini",
		icon: "🤖",
		color: "blue",
		description:
			"Googleの最新LLMモデル。gemini-2.0-flash-expなど高速で強力なモデルを提供。",
		docsUrl: "https://ai.google.dev/",
	},
	openai: {
		name: "OpenAI",
		icon: "🎨",
		color: "green",
		description:
			"GPT-4o等の強力なモデル。チャット、画像生成、音声認識など幅広く対応。",
		docsUrl: "https://platform.openai.com/",
	},
	anthropic: {
		name: "Anthropic Claude",
		icon: "🧠",
		color: "purple",
		description: "Claude 3.5 Sonnet等、長文理解に優れたモデルを提供。",
		docsUrl: "https://docs.anthropic.com/",
	},
};

function formatDate(isoString: string): string {
	const date = new Date(isoString);
	return new Intl.DateTimeFormat("ja-JP", {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

function LoadingOverlay() {
	return (
		<div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
			<Loader2 className="h-8 w-8 animate-spin text-primary" />
		</div>
	);
}

function ProviderCardComponent({
	provider,
	configured,
	updatedAt,
	onConfigure,
	onDelete,
	isLoading = false,
}: ProviderCardProps) {
	const providerInfo = PROVIDER_CONFIG[provider];

	return (
		<Card className="relative" data-testid={`provider-card-${provider}`}>
			{/* ローディングオーバーレイ */}
			{isLoading && <LoadingOverlay />}

			<CardHeader>
				{/* アイコン + タイトル + バッジ */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span className="text-2xl" aria-hidden="true">
							{providerInfo.icon}
						</span>
						<CardTitle>{providerInfo.name}</CardTitle>
					</div>
					<APIKeyStatusBadge
						configured={configured}
						data-testid={`badge-${provider}`}
					/>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* 説明文 */}
				<p className="text-sm text-muted-foreground">
					{providerInfo.description}
				</p>

				{/* 最終更新日時 */}
				{configured && updatedAt && (
					<p className="text-xs text-muted-foreground">
						最終更新: {formatDate(updatedAt)}
					</p>
				)}

				{/* ドキュメントリンク */}
				<a
					href={providerInfo.docsUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
				>
					ドキュメントを見る
					<ExternalLink className="h-3 w-3" />
				</a>
			</CardContent>

			<CardFooter>
				{/* アクションボタン */}
				{!configured ? (
					<Button
						onClick={onConfigure}
						className="w-full"
						disabled={isLoading}
						aria-label={`${providerInfo.name} の APIキーを設定`}
						data-testid={`configure-button-${provider}`}
					>
						設定
					</Button>
				) : (
					<div className="flex gap-2 w-full">
						<Button
							onClick={onConfigure}
							variant="outline"
							className="flex-1"
							disabled={isLoading}
							aria-label={`${providerInfo.name} の APIキーを編集`}
							data-testid={`edit-button-${provider}`}
						>
							編集
						</Button>
						<Button
							onClick={onDelete}
							variant="destructive"
							className="flex-1"
							disabled={isLoading}
							aria-label={`${providerInfo.name} の APIキーを削除`}
							data-testid={`delete-button-${provider}`}
						>
							削除
						</Button>
					</div>
				)}
			</CardFooter>
		</Card>
	);
}

// Performance optimization with React.memo
export const ProviderCard = React.memo(ProviderCardComponent);
