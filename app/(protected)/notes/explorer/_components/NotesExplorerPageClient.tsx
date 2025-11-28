"use client";

import { Container } from "@/components/layouts/container";
import { useNotes } from "@/hooks/notes/useNotes";
import NotesExplorer from "./NotesExplorer";

/**
 * Notes Explorer Page Client Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/notes/explorer/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ hooks/notes/useNotes.ts
 *   └─ components/layouts/container.tsx
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20250124_01_static-export-client-side-auth-implementation-plan.md
 */
export function NotesExplorerPageClient() {
	const { data: notes = [], isLoading } = useNotes();

	if (isLoading) {
		return (
			<Container className="h-full">
				<div className="flex items-center justify-center min-h-screen">
					<div className="text-muted-foreground">読み込み中...</div>
				</div>
			</Container>
		);
	}

	return (
		<Container className="h-full">
			<div className="mb-4">
				<h1 className="text-2xl font-bold">ノート・ページ管理</h1>
				<p className="text-muted-foreground">
					ドラッグ&ドロップでページを整理できます
				</p>
			</div>
			<NotesExplorer notes={notes} />
		</Container>
	);
}
