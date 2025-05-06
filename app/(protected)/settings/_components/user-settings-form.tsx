"use client";

import React, { useState, useTransition, useEffect, useMemo } from "react";
import type { Database } from "@/types/database.types";
import { useRouter, usePathname } from "next/navigation";
import { updateUserSettings } from "@/app/_actions/user_settings";
import { Button } from "@/components/ui/button";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogAction,
	AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import ThemeSelector from "./theme-selector";
import ModeToggle from "./mode-toggle";
import LocaleSelector from "./locale-selector";
import TimezoneSelector from "./timezone-selector";
import NotificationSettings from "./notification-settings";
import ItemsPerPageSelector from "./items-per-page-selector";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CosenseSyncSettings, {
	type CosenseProject,
} from "./cosense-sync-settings";

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
			// 設定更新
			await updateUserSettings({
				theme: settings.theme,
				mode: settings.mode,
				locale: settings.locale,
				timezone: settings.timezone,
				notifications: settings.notifications,
				items_per_page: settings.items_per_page,
				cosense_sync_enabled: settings.cosense_sync_enabled,
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
			<Tabs defaultValue="appearance">
				<TabsList className="mb-4">
					<TabsTrigger value="appearance">外観</TabsTrigger>
					<TabsTrigger value="general">全般</TabsTrigger>
					<TabsTrigger value="notifications">通知</TabsTrigger>
					<TabsTrigger value="pagination">ページ表示</TabsTrigger>
					<TabsTrigger value="external">外部サービス</TabsTrigger>
				</TabsList>
				<div className="space-y-6 p-4">
					<TabsContent value="appearance">
						<h2 className="text-lg font-medium">外観設定 (Appearance)</h2>
						<div className="mt-2 space-y-4">
							<ThemeSelector
								value={settings.theme}
								onChange={(value) => setSettings({ ...settings, theme: value })}
							/>
							<ModeToggle
								checked={settings.mode === "dark"}
								onCheckedChange={(checked) =>
									setSettings({ ...settings, mode: checked ? "dark" : "light" })
								}
							/>
						</div>
					</TabsContent>
					<TabsContent value="general">
						<h2 className="text-lg font-medium">全般設定 (General)</h2>
						<div className="mt-2 space-y-4">
							<LocaleSelector
								value={settings.locale}
								onChange={(value) =>
									setSettings({ ...settings, locale: value })
								}
							/>
							<TimezoneSelector
								value={settings.timezone}
								onChange={(value) =>
									setSettings({ ...settings, timezone: value })
								}
							/>
						</div>
					</TabsContent>
					<TabsContent value="notifications">
						<h2 className="text-lg font-medium">通知設定 (Notifications)</h2>
						<NotificationSettings
							notifications={settings.notifications as Record<string, boolean>}
							onChange={(notifications) =>
								setSettings({ ...settings, notifications })
							}
						/>
					</TabsContent>
					<TabsContent value="pagination">
						<h2 className="text-lg font-medium">
							ページあたり件数 (Pagination)
						</h2>
						<ItemsPerPageSelector
							value={settings.items_per_page}
							onChange={(value) =>
								setSettings({ ...settings, items_per_page: value })
							}
						/>
					</TabsContent>
					<TabsContent value="external">
						<h2 className="text-lg font-medium">
							外部サービス (External Services)
						</h2>
						<div className="mt-2">
							<CosenseSyncSettings
								initialProjects={initialProjects}
								initialEnabled={settings.cosense_sync_enabled as boolean}
								onEnabledChange={(value) =>
									setSettings({ ...settings, cosense_sync_enabled: value })
								}
							/>
						</div>
					</TabsContent>
				</div>
				<div className="px-4">
					<Button onClick={handleSave} disabled={isPending}>
						保存
					</Button>
				</div>
			</Tabs>
		</>
	);
}
