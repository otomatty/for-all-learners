import { Container } from "@/components/layouts/container";
import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
import { ProfilePageClient } from "./_components/ProfilePageClient";
import ProfileForm from "./_components/profile-form";

export default async function ProfilePage() {
	// 静的エクスポート時はクライアントコンポーネントを使用
	const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);
	if (isStaticExport) {
		return <ProfilePageClient />;
	}

	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		throw new Error(authError?.message ?? "Not authenticated");
	}

	// アカウント情報を取得
	let { data: account } = await supabase
		.from("accounts")
		.select("*")
		.eq("id", user.id)
		.single();

	// アカウントが存在しない場合は作成
	if (!account) {
		const { data: newAccount, error: createError } = await supabase
			.from("accounts")
			.insert({
				id: user.id,
				email: user.email ?? undefined,
				user_slug: user.id,
			})
			.select("*")
			.single();

		if (createError) {
			throw new Error(createError.message ?? "アカウントの作成に失敗しました");
		}

		account = newAccount;
	}

	return (
		<>
			<div className="mb-6 max-w-5xl mx-auto py-4 lg:py-8">
				<BackLink path="/dashboard" title="ホームに戻る" />
			</div>
			<Container className="max-w-3xl">
				<h1 className="text-2xl font-bold mb-6">プロフィール</h1>
				{account ? (
					<ProfileForm initialAccount={account} />
				) : (
					<p>アカウントが見つかりませんでした。</p>
				)}
			</Container>
		</>
	);
}
