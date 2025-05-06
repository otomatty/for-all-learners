import React from "react";
import { createClient } from "@/lib/supabase/server";
import { getAccountById, createAccount } from "@/app/_actions/accounts";
import ProfileForm from "./_components/profile-form";
import { Container } from "@/components/container";
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
		});
	}

	return (
		<Container className="max-w-3xl">
			<h1 className="text-2xl font-bold mb-6">プロフィール</h1>
			{account ? (
				<ProfileForm initialAccount={account} />
			) : (
				<p>アカウントが見つかりませんでした。</p>
			)}
		</Container>
	);
}
