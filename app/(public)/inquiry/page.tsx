import { getInquiryCategories } from "@/app/_actions/inquiries";
// /Users/sugaiakimasa/apps/for-all-learners/app/inquiry/page.tsx
import { createClient } from "@/lib/supabase/server";
import InquiryForm from "./_components/inquiry-form";

export default async function InquiryPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	// お問い合わせカテゴリのデータをサーバーアクション経由で取得
	const {
		categories,
		message: categoriesMessage,
		success: categoriesSuccess,
	} = await getInquiryCategories();

	if (!categoriesSuccess) {
		// エラーハンドリング: カテゴリなしで進めるか、エラーページを表示するかなど
		// ここでは categories が null または空配列になるので、フォーム側で適切に処理される想定
	}

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
			<InquiryForm
				initialValues={initialValues}
				isAuthenticated={!!user}
				categories={categories || []} // categories が null の場合も考慮して空配列を渡す
			/>
		</div>
	);
}
