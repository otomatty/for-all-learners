"use client";

import { useQuery } from "@tanstack/react-query";
import { Container } from "@/components/layouts/container";
import { BackLink } from "@/components/ui/back-link";
import { useUserSettings } from "@/hooks/user_settings/useUserSettings";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import type { CosenseProject } from "./external-sync-settings/cosense-sync-settings";
import UserSettingsForm from "./user-settings-form";

/**
 * Settings Page Client Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/settings/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ hooks/user_settings/useUserSettings.ts
 *   ├─ lib/hooks/use-auth.ts
 *   ├─ lib/supabase/client.ts
 *   └─ components/layouts/container.tsx
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20250124_01_static-export-client-side-auth-implementation-plan.md
 */
export function SettingsPageClient() {
	const { user, loading: authLoading } = useAuth();
	const { data: userSettings, isLoading: settingsLoading } = useUserSettings();

	// Cosenseプロジェクトを取得
	const { data: cosenseProjectsData, isLoading: projectsLoading } = useQuery({
		queryKey: ["cosense_projects"],
		queryFn: async (): Promise<CosenseProject[]> => {
			if (!user) return [];

			const supabase = createClient();
			const { data, error } = await supabase
				.from("user_cosense_projects")
				.select(
					"id, cosense_projects(project_name), page_count, accessible, updated_at",
				)
				.eq("user_id", user.id);

			if (error) throw error;

			return (
				data?.map((item) => ({
					id: item.id,
					project_name:
						(item.cosense_projects as { project_name: string })?.project_name ||
						"",
					lastSyncedAt: item.updated_at || new Date().toISOString(),
					page_count: item.page_count || 0,
					accessible: item.accessible ?? true,
				})) || []
			);
		},
		enabled: !!user,
	});

	const isLoading = authLoading || settingsLoading || projectsLoading;

	if (authLoading) {
		return (
			<Container>
				<div className="flex items-center justify-center min-h-screen">
					<div className="text-muted-foreground">読み込み中...</div>
				</div>
			</Container>
		);
	}

	if (!user) {
		return null; // ClientProtectedLayoutでリダイレクトされる
	}

	if (isLoading || !userSettings) {
		return (
			<>
				<div className="mb-6 max-w-5xl mx-auto py-4 lg:py-8">
					<BackLink path="/dashboard" title="ホームに戻る" />
				</div>
				<Container>
					<div className="flex items-center justify-center min-h-screen">
						<div className="text-muted-foreground">読み込み中...</div>
					</div>
				</Container>
			</>
		);
	}

	return (
		<>
			<div className="mb-6 max-w-5xl mx-auto py-4 lg:py-8">
				<BackLink path="/dashboard" title="ホームに戻る" />
			</div>
			<Container>
				<h1 className="text-2xl font-bold mb-6">ユーザー設定</h1>
				{/* 設定フォームを表示 */}
				<UserSettingsForm
					initialSettings={userSettings}
					initialProjects={cosenseProjectsData || []}
				/>
			</Container>
		</>
	);
}
