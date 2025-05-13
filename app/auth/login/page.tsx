import { loginWithGoogle, loginWithMagicLink } from "@/app/_actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UnauthHeader } from "@/components/unauth-header";
import { createClient } from "@/lib/supabase/server";
import { Mail } from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { version } from "../../../package.json";

// ページコンポーネントの props に searchParams を追加
export default async function LoginPage({
	searchParams,
}: {
	searchParams: {
		message?: string;
		error?: string;
		error_description?: string;
	};
}) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) {
		redirect("/dashboard");
	}

	return (
		<div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
			<UnauthHeader version={version} />

			<div className="flex flex-1 items-center justify-center px-4">
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-md">
					<div className="text-center mb-6">
						{/* ライトモード用ロゴ */}
						<Image
							src="/images/fal-logo-light.svg" // ライトテーマで表示するロゴ
							alt="For All Learners"
							width={120}
							height={120}
							className="mx-auto block dark:hidden" // ライトモードで表示、ダークモードで非表示
						/>
						{/* ダークモード用ロゴ */}
						<Image
							src="/images/fal-logo-dark.svg" // ダークテーマで表示するロゴ (元々のロゴ)
							alt="For All Learners"
							width={160}
							height={160}
							className="mx-auto hidden dark:block" // ダークモードで表示、ライトモードで非表示
						/>

						<h1 className="text-2xl text-gray-800 dark:text-gray-200 font-semibold mt-4">
							アカウントにログイン
						</h1>
						<p className="text-sm text-muted-foreground mt-2">
							お好みの方法でログインして学習を始めましょう
						</p>
					</div>

					{/* Magic Link 送信完了メッセージ */}
					{searchParams.message === "magic_link_sent" && (
						<div
							className="mb-4 p-3 rounded-md bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-sm"
							role="alert"
						>
							指定されたメールアドレスにログインリンクを送信しました。メールを確認してください。
						</div>
					)}
					{/* エラーメッセージ */}
					{searchParams.error && (
						<div
							className="mb-4 p-3 rounded-md bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-sm"
							role="alert"
						>
							エラーが発生しました:{" "}
							{searchParams.error_description || searchParams.error}
						</div>
					)}

					{/* Magic Link ログインフォーム */}
					<form action={loginWithMagicLink} className="grid gap-4 mb-6">
						<div>
							<Label htmlFor="email" className="sr-only">
								メールアドレス
							</Label>
							<Input
								type="email"
								name="email"
								id="email"
								placeholder="メールアドレス"
								required
								className="w-full"
							/>
						</div>
						<Button type="submit" variant="default">
							<>
								<Mail className="mr-2 h-4 w-4" />{" "}
								{/* アイコンにマージンとサイズを追加 */}
								メールアドレスでログイン
							</>
						</Button>
					</form>

					<div className="relative mb-6">
						<div className="absolute inset-0 flex items-center">
							<span className="w-full border-t" />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-white dark:bg-gray-800 px-2 text-muted-foreground">
								または
							</span>
						</div>
					</div>

					{/* Google ログインフォーム */}
					<form action={loginWithGoogle} className="grid gap-6">
						<Button type="submit" variant="outline">
							<>
								<img
									src="/images/google-logo.svg"
									alt="Google Logo"
									className="w-5 h-5 mr-2"
								/>
								<span>Googleでログイン</span>
							</>
						</Button>
					</form>
				</div>
			</div>
		</div>
	);
}
