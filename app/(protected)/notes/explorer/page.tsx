import { Container } from "@/components/layouts/container";
import { getNotesServer } from "@/lib/services/notesService";
import { createClient } from "@/lib/supabase/server";
import NotesExplorer from "./_components/NotesExplorer";
import { NotesExplorerPageClient } from "./_components/NotesExplorerPageClient";

export default async function NotesExplorerPage() {
	// 静的エクスポート時はクライアントコンポーネントを使用
	const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);
	if (isStaticExport) {
		return <NotesExplorerPageClient />;
	}

	const supabase = await createClient();

	// 認証チェック
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user) {
		throw new Error("Not authenticated");
	}

	// ノート一覧を取得（既存フックのロジックを再利用）
	const notes = await getNotesServer(user.id);

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
