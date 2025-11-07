/**
 * Plugin Debug Page
 *
 * Provides UI for viewing plugin debug information:
 * - Plugin logs
 * - Error list
 * - Performance metrics
 *
 * DEPENDENCY MAP:
 *
 * Parents: app/(protected)/settings/layout.tsx
 *
 * Dependencies:
 *   ├─ lib/plugins/debug-tools.ts
 *   └─ components/ui/* (Card, Tabs, etc.)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import { Bug } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAllPluginsDebugInfo } from "@/lib/plugins/debug-tools";
import { getPluginRegistry } from "@/lib/plugins/plugin-registry";
import { PluginDebugView } from "./_components/PluginDebugView";

/**
 * Plugin Debug Page Component
 */
export default async function PluginDebugPage() {
	const registry = getPluginRegistry();
	const loadedPlugins = registry.getAll();
	const debugInfos = getAllPluginsDebugInfo();

	return (
		<div className="container mx-auto py-8">
			<div className="mb-8">
				<div className="flex items-center gap-2 mb-2">
					<Bug className="h-6 w-6" />
					<h1 className="text-3xl font-bold">プラグインデバッグ</h1>
				</div>
				<p className="text-muted-foreground">
					読み込み済みプラグインのデバッグ情報を表示します。
				</p>
			</div>

			{loadedPlugins.length === 0 ? (
				<Card>
					<CardContent className="pt-6">
						<p className="text-center text-muted-foreground">
							読み込み済みのプラグインがありません。
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-4">
					{debugInfos.map((debugInfo) => (
						<PluginDebugView
							key={debugInfo.plugin.manifest.id}
							debugInfo={debugInfo}
						/>
					))}
				</div>
			)}
		</div>
	);
}
