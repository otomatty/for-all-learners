import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/app/(protected)/dashboard/_components/dashboard-header";
import { DashboardShell } from "@/app/(protected)/dashboard/_components/dashboard-shell";
import { NotesList } from "@/components/notes/notes-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function NotesPage() {
	const supabase = createClient();
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		redirect("/auth/login");
	}

	// 自分のノートを取得
	const { data: myNotes } = await supabase
		.from("notes")
		.select("*")
		.eq("user_id", session.user.id)
		.order("updated_at", { ascending: false });

	// 共有されているノートを取得
	const { data: sharedNotes } = await supabase
		.from("note_shares")
		.select("*, notes(*)")
		.eq("shared_with_user_id", session.user.id)
		.order("notes(updated_at)", { ascending: false });

	return (
		<DashboardShell>
			<DashboardHeader
				heading="ノート"
				text="専門用語の解説をノートとして作成・管理できます"
			>
				<Button asChild>
					<Link href="/notes/new">
						<Plus className="mr-2 h-4 w-4" />
						新規ノート
					</Link>
				</Button>
			</DashboardHeader>
			<Tabs defaultValue="my-notes" className="space-y-4">
				<TabsList>
					<TabsTrigger value="my-notes">マイノート</TabsTrigger>
					<TabsTrigger value="shared-notes">共有ノート</TabsTrigger>
				</TabsList>
				<TabsContent value="my-notes" className="space-y-4">
					<NotesList notes={myNotes || []} />
				</TabsContent>
				<TabsContent value="shared-notes" className="space-y-4">
					<NotesList notes={(sharedNotes || []).map((share) => share.notes)} />
				</TabsContent>
			</Tabs>
		</DashboardShell>
	);
}
