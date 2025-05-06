import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PagesList } from "@/app/(protected)/pages/_components/pages-list";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getPagesByUser, getSharedPagesByUser } from "@/app/_actions/pages";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/container";

export default async function PagesPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/auth/login");
	}

	const [myPages, sharedPageShares] = await Promise.all([
		getPagesByUser(user.id),
		getSharedPagesByUser(user.id),
	]);
	const sharedPages = sharedPageShares.map((share) => share.pages);

	return (
		<Container className="max-w-7xl">
			<Tabs defaultValue="my-pages" className="space-y-4">
				<div className="flex justify-between mb-4">
					<TabsList>
						<TabsTrigger value="my-pages">マイページ</TabsTrigger>
						<TabsTrigger value="shared-pages">共有ページ</TabsTrigger>
					</TabsList>
					<Button asChild>
						<Link href="/pages/new">新規ページ</Link>
					</Button>
				</div>

				<TabsContent value="my-pages" className="space-y-4">
					<PagesList pages={myPages || []} />
				</TabsContent>
				<TabsContent value="shared-pages" className="space-y-4">
					<PagesList pages={sharedPages || []} />
				</TabsContent>
			</Tabs>
		</Container>
	);
}
