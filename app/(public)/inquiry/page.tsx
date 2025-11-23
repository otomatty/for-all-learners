import { createClient } from "@/lib/supabase/server";
import { InquiryClient } from "./_components/InquiryClient";

export default async function InquiryPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	const initialValues = {
		email: user?.email || "",
		name: user?.user_metadata?.full_name || user?.user_metadata?.name || "",
	};

	return (
		<div className="container mx-auto max-w-2xl py-8">
			<header className="mb-8">
				<h1 className="text-3xl font-bold">お問い合わせ</h1>
				<p className="text-muted-foreground">
					ご不明な点やご要望がございましたら、お気軽にお問い合わせください。
				</p>
			</header>
			<InquiryClient initialValues={initialValues} isAuthenticated={!!user} />
		</div>
	);
}
