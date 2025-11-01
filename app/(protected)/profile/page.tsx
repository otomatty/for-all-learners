import { createAccount, getAccountById } from "@/app/_actions/accounts";
import { Container } from "@/components/layouts/container";
import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./_components/profile-form";

export default async function ProfilePage() {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		throw new Error(authError?.message ?? "Not authenticated");
	}

	let account = await getAccountById(user.id);
	if (!account) {
		account = await createAccount({
			id: user.id,
			email: user.email ?? undefined,
			user_slug: user.id,
		});
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
