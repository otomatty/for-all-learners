import { getAccountById } from "@/app/_actions/accounts";

interface ProfileProps {
	userId: string;
}

/**
 * Profile component displays detailed user account information.
 * @param userId - UUID of the user to fetch
 */
export default async function Profile({ userId }: ProfileProps) {
	// サーバーアクションを使ってアカウント情報を取得
	const account = await getAccountById(userId);
	if (!account) {
		return <div>ユーザー情報が見つかりません。</div>;
	}
	return (
		<section className="space-y-2">
			<h2 className="text-lg font-semibold">プロフィール情報</h2>
			<div className="grid grid-cols-2 gap-4 text-sm">
				<div>ユーザーID:</div>
				<div>{account.id}</div>
				<div>メールアドレス:</div>
				<div>{account.email}</div>
				<div>氏名:</div>
				<div>{account.full_name}</div>
				<div>性別:</div>
				<div>{account.gender}</div>
				<div>生年月日:</div>
				<div>{account.birthdate?.toString()}</div>
				<div>登録日時:</div>
				<div>{account.created_at?.toString()}</div>
				<div>更新日時:</div>
				<div>{account.updated_at?.toString()}</div>
			</div>
		</section>
	);
}
