"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";
import { HelpCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface SyncOption {
	id: string;
	label: string;
}
export interface SyncFrequencyOption {
	id: string;
	label: string;
}

export interface ServiceIntegrationDetailsProps {
	apiKeyRequired: boolean;
	apiKey: string;
	onApiKeyChange: (value: string) => void;
	syncOptions: SyncOption[];
	syncDirection: string;
	onSyncDirectionChange: (value: string) => void;
	syncFrequencyOptions: SyncFrequencyOption[];
	syncFrequency: string;
	onSyncFrequencyChange: (value: string) => void;
	errorMessage?: string;
	hasChanges: boolean;
	isSaving: boolean;
	onSave: () => void;
	onCancel: () => void;
}

export default function ServiceIntegrationDetails({
	apiKeyRequired,
	apiKey,
	onApiKeyChange,
	syncOptions,
	syncDirection,
	onSyncDirectionChange,
	syncFrequencyOptions,
	syncFrequency,
	onSyncFrequencyChange,
	errorMessage,
	hasChanges,
	isSaving,
	onSave,
	onCancel,
}: ServiceIntegrationDetailsProps) {
	return (
		<>
			{errorMessage && (
				<div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-800 text-sm">
					<div className="flex items-start">
						<AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
						<p>{errorMessage}</p>
					</div>
				</div>
			)}

			{apiKeyRequired && (
				<div className="mb-4">
					<div className="flex items-center">
						<Label htmlFor="api-key" className="text-sm font-medium">
							APIトークン
						</Label>
						<div className="relative ml-2 group">
							<HelpCircle className="w-4 h-4 text-gray-400" />
							<div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10">
								APIトークンはこちらから取得できます
								<a
									href="/docs/api-token"
									className="text-blue-300 hover:underline ml-1"
								>
									詳細を見る
								</a>
							</div>
						</div>
					</div>
					<Input
						id="api-key"
						type="password"
						placeholder="APIトークンを入力"
						value={apiKey}
						onChange={(e) => onApiKeyChange(e.target.value)}
						className="mt-1"
					/>
				</div>
			)}

			{syncOptions.length > 0 && (
				<div className="mb-4">
					<Label className="text-sm font-medium mb-2 block">
						同期オプション
					</Label>
					<RadioGroup
						value={syncDirection}
						onValueChange={onSyncDirectionChange}
					>
						{syncOptions.map((opt) => (
							<div key={opt.id} className="flex items-center space-x-2 mt-2">
								<RadioGroupItem value={opt.id} id={`sync-${opt.id}`} />
								<Label htmlFor={`sync-${opt.id}`} className="font-normal">
									{opt.label}
								</Label>
							</div>
						))}
					</RadioGroup>
				</div>
			)}

			{syncFrequencyOptions.length > 0 && (
				<div className="mb-4">
					<Label
						htmlFor="sync-frequency"
						className="text-sm font-medium mb-2 block"
					>
						同期頻度
					</Label>
					<Select value={syncFrequency} onValueChange={onSyncFrequencyChange}>
						<SelectTrigger id="sync-frequency" className="w-full">
							<SelectValue placeholder="同期頻度を選択" />
						</SelectTrigger>
						<SelectContent>
							{syncFrequencyOptions.map((opt) => (
								<SelectItem key={opt.id} value={opt.id}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}

			<div className="flex justify-end space-x-2">
				<Button onClick={onCancel} variant="ghost" disabled={isSaving}>
					キャンセル
				</Button>
				<Button onClick={onSave} disabled={isSaving || !hasChanges}>
					{isSaving ? (
						<>
							<span className="animate-spin mr-2">⏳</span>処理中...
						</>
					) : (
						"保存する"
					)}
				</Button>
			</div>
		</>
	);
}
