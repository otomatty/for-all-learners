/**
 * API Keys Settings Page
 *
 * DEPENDENCY MAP:
 *
 * Parents (このファイルを呼び出す場所):
 *   - User navigation to /settings/api-keys
 *
 * Dependencies (このファイルが使用する外部ファイル):
 *   ├─ components/settings/APIKeySettings.tsx
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ next/navigation (redirect)
 *
 * Related Files:
 *   ├─ Components: components/settings/APIKeySettings.tsx
 *   ├─ Plan: docs/03_plans/mastra-infrastructure/20251102_03_phase05-ui-plan.md
 *   └─ Log: docs/05_logs/2025_11/20251102/08_phase05-day1-complete.md
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { APIKeySettings } from "@/components/settings/APIKeySettings";
import { LLMProviderSettings } from "@/components/settings/LLMProviderSettings";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
	title: "APIキー設定 | For All Learners",
	description:
		"AI機能を使用するためのAPIキーを設定します。Google Gemini、OpenAI、Anthropic Claudeに対応。",
	openGraph: {
		title: "APIキー設定 | For All Learners",
		description:
			"AI機能を使用するためのAPIキーを設定します。Google Gemini、OpenAI、Anthropic Claudeに対応。",
	},
};

export default async function APIKeysPage() {
	// Authenticate user
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/auth/login");
	}

	return (
		<div className="container max-w-4xl py-8">
			<div className="space-y-6">
				<div className="space-y-2">
					<h1 className="text-3xl font-bold tracking-tight">APIキー設定</h1>
					<p className="text-muted-foreground">
						AI機能を使用するためのAPIキーを設定します。各プロバイダーのAPIキーを安全に管理できます。
					</p>
				</div>

				<APIKeySettings />

				<LLMProviderSettings />
			</div>
		</div>
	);
}
