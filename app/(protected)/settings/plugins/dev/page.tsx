/**
 * Plugin Development Page
 *
 * Provides UI for managing local plugins during development:
 * - List local plugins from plugins/examples directory
 * - Load/unload local plugins
 * - Reload plugins (hot reload)
 * - View plugin status
 *
 * DEPENDENCY MAP:
 *
 * Parents: app/(protected)/settings/layout.tsx
 *
 * Dependencies:
 *   ├─ app/_actions/plugins-dev.ts
 *   ├─ components/ui/* (Button, Card, etc.)
 *   └─ ./_components/LocalPluginCard.tsx
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import { Code2 } from "lucide-react";
import { getLocalPlugins } from "@/app/_actions/plugins-dev";
import { Card, CardContent } from "@/components/ui/card";
import { LocalPluginCard } from "./_components/LocalPluginCard";

/**
 * Plugin Development Page Component
 */
export default async function PluginDevPage() {
	const localPlugins = await getLocalPlugins();

	return (
		<div className="container mx-auto py-8">
			<div className="mb-8">
				<div className="flex items-center gap-2 mb-2">
					<Code2 className="h-6 w-6" />
					<h1 className="text-3xl font-bold">プラグイン開発</h1>
				</div>
				<p className="text-muted-foreground">
					ローカルプラグインの開発とテストを行います。
					<br />
					<code className="text-sm bg-muted px-1 py-0.5 rounded">
						plugins/examples/
					</code>
					ディレクトリからプラグインを読み込みます。
				</p>
			</div>

			{localPlugins.length === 0 ? (
				<Card>
					<CardContent className="pt-6">
						<p className="text-center text-muted-foreground">
							ローカルプラグインが見つかりませんでした。
							<br />
							<code className="text-sm bg-muted px-1 py-0.5 rounded">
								plugins/examples/
							</code>
							ディレクトリにプラグインを作成してください。
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{localPlugins.map((plugin) => (
						<LocalPluginCard key={plugin.id} plugin={plugin} />
					))}
				</div>
			)}
		</div>
	);
}
