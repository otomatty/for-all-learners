"use client";

import { updateUserSettings } from "@/app/_actions/user_settings";
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
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Database } from "@/types/database.types";
import { usePathname, useRouter } from "next/navigation";
import React, { useState, useTransition, useEffect, useMemo } from "react";
import { toast } from "sonner";
import AppearanceSettings from "./appearance";
import ExternalServices from "./external-sync-settings";
import type { CosenseProject } from "./external-sync-settings/cosense-sync-settings";
import GeneralSettings from "./general";
import LlmSettings from "./llm-settings";
import NotificationSettings from "./notifications";
import PaginationSettings from "./pagination";
import PromptTemplates from "./prompt-templates";

// ユーザー設定の型
type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];

interface UserSettingsFormProps {
	initialSettings: UserSettings;
	initialProjects: CosenseProject[];
}

export default function UserSettingsForm({
	initialSettings,
	initialProjects,
}: UserSettingsFormProps) {
	const [settings, setSettings] = useState<UserSettings>(initialSettings);
	const [isPending, startTransition] = useTransition();
	const router = useRouter();
	const pathname = usePathname();
	const [initialPathname] = useState(pathname);
	const [showDialog, setShowDialog] = useState(false);
	const [nextPath, setNextPath] = useState<string | null>(null);

	// 変更有無を判定
	const isDirty = useMemo(() => {
		return JSON.stringify(settings) !== JSON.stringify(initialSettings);
	}, [settings, initialSettings]);

	// ページ遷移検知
	useEffect(() => {
		if (pathname !== initialPathname) {
			if (isDirty) {
				setNextPath(pathname);
				router.replace(initialPathname);
				setShowDialog(true);
			}
		}
	}, [pathname, initialPathname, isDirty, router]);

	const handleSave = () => {
		startTransition(async () => {
			// 変更点を収集
			const changes: string[] = [];
			if (settings.theme !== initialSettings.theme) {
				changes.push(`テーマ: ${initialSettings.theme} → ${settings.theme}`);
			}
			if (settings.mode !== initialSettings.mode) {
				changes.push(`モード: ${initialSettings.mode} → ${settings.mode}`);
			}
			if (settings.locale !== initialSettings.locale) {
				changes.push(`言語: ${initialSettings.locale} → ${settings.locale}`);
			}
			if (settings.timezone !== initialSettings.timezone) {
				changes.push(
					`タイムゾーン: ${initialSettings.timezone} → ${settings.timezone}`,
				);
			}
			if (
				JSON.stringify(settings.notifications) !==
				JSON.stringify(initialSettings.notifications)
			) {
				changes.push("通知設定が更新されました");
			}
			if (settings.items_per_page !== initialSettings.items_per_page) {
				changes.push(
					`1ページ表示件数: ${initialSettings.items_per_page} → ${settings.items_per_page}`,
				);
			}
			if (
				settings.cosense_sync_enabled !== initialSettings.cosense_sync_enabled
			) {
				const before = initialSettings.cosense_sync_enabled ? "有効" : "無効";
				const after = settings.cosense_sync_enabled ? "有効" : "無効";
				changes.push(`Cosense 同期: ${before} → ${after}`);
			}
			if (
				settings.notion_sync_enabled !== initialSettings.notion_sync_enabled
			) {
				const before = initialSettings.notion_sync_enabled ? "有効" : "無効";
				const after = settings.notion_sync_enabled ? "有効" : "無効";
				changes.push(`Notion 同期: ${before} → ${after}`);
			}
			if (settings.gyazo_sync_enabled !== initialSettings.gyazo_sync_enabled) {
				const before = initialSettings.gyazo_sync_enabled ? "有効" : "無効";
				const after = settings.gyazo_sync_enabled ? "有効" : "無効";
				changes.push(`Gyazo 同期: ${before} → ${after}`);
			}
			if (
				settings.quizlet_sync_enabled !== initialSettings.quizlet_sync_enabled
			) {
				const before = initialSettings.quizlet_sync_enabled ? "有効" : "無効";
				const after = settings.quizlet_sync_enabled ? "有効" : "無効";
				changes.push(`Quizlet 同期: ${before} → ${after}`);
			}
			// 設定更新
			await updateUserSettings({
				theme: settings.theme,
				mode: settings.mode,
				locale: settings.locale,
				timezone: settings.timezone,
				notifications: settings.notifications,
				items_per_page: settings.items_per_page,
				cosense_sync_enabled: settings.cosense_sync_enabled,
				notion_sync_enabled: settings.notion_sync_enabled,
				gyazo_sync_enabled: settings.gyazo_sync_enabled,
				quizlet_sync_enabled: settings.quizlet_sync_enabled,
			});
			// トースト通知
			if (changes.length > 0) {
				toast.success(
					<div>
						<p>設定が保存されました:</p>
						<ul className="ml-4 list-disc">
							{changes.map((c) => (
								<li key={c}>{c}</li>
							))}
						</ul>
					</div>,
				);
			} else {
				toast("変更はありませんでした");
			}
		});
	};

	return (
		<>
			{/* 未保存確認ダイアログ */}
			<AlertDialog
				open={showDialog}
				onOpenChange={(open) => setShowDialog(open)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>保存されていない変更があります</AlertDialogTitle>
						<AlertDialogDescription>
							設定が保存されていません。このままページを移動すると、変更が失われます。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setShowDialog(false)}>
							キャンセル
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								setShowDialog(false);
								if (nextPath) router.push(nextPath);
							}}
						>
							進む
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<Tabs defaultValue="general">
				<TabsList className="mb-4">
					<TabsTrigger value="general">全般</TabsTrigger>
					<TabsTrigger value="appearance">外観</TabsTrigger>
					<TabsTrigger value="notifications">通知</TabsTrigger>
					<TabsTrigger value="pagination">ページ表示</TabsTrigger>
					<TabsTrigger value="external">外部サービス</TabsTrigger>
					<TabsTrigger value="llm">LLM</TabsTrigger>
					<TabsTrigger value="prompts">プロンプト</TabsTrigger>
				</TabsList>
				<div className="space-y-6">
					<TabsContent value="general">
						<h2 className="text-lg font-medium">全般設定 (General)</h2>
						<div className="mt-2 space-y-4">
							<GeneralSettings settings={settings} setSettings={setSettings} />
						</div>
					</TabsContent>
					<TabsContent value="appearance">
						<h2 className="text-lg font-medium">外観設定 (Appearance)</h2>
						<div className="mt-2 space-y-4">
							<AppearanceSettings
								settings={settings}
								setSettings={setSettings}
							/>
						</div>
					</TabsContent>
					<TabsContent value="notifications">
						<h2 className="text-lg font-medium">通知設定 (Notifications)</h2>
						<div className="mt-2 space-y-4">
							<NotificationSettings
								settings={settings}
								setSettings={setSettings}
							/>
						</div>
					</TabsContent>
					<TabsContent value="pagination">
						<h2 className="text-lg font-medium">
							ページあたり件数 (Pagination)
						</h2>
						<div className="mt-2 space-y-4">
							<PaginationSettings
								settings={settings}
								setSettings={setSettings}
							/>
						</div>
					</TabsContent>
					<TabsContent value="external">
						<ExternalServices
							settings={settings}
							setSettings={setSettings}
							isPending={isPending}
							initialProjects={initialProjects}
						/>
					</TabsContent>
					<TabsContent value="llm">
						<LlmSettings />
					</TabsContent>
					<TabsContent value="prompts">
						<PromptTemplates />
					</TabsContent>
				</div>
				<div className="mt-4">
					<Button onClick={handleSave} disabled={isPending}>
						保存
					</Button>
				</div>
			</Tabs>
		</>
	);
}
