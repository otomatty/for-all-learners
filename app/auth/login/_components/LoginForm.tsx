"use client";

import { Mail } from "lucide-react";
import Image from "next/image";
import { useId, useState } from "react";
import { loginWithGoogle, loginWithMagicLink } from "@/app/_actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithGoogleTauri } from "@/lib/auth/tauri-login";
import { loginWithMagicLinkTauri } from "@/lib/auth/tauri-magic-link";

interface LoginFormProps {
	message?: string;
	error?: string;
	errorDescription?: string;
}

export function LoginForm({
	message,
	error,
	errorDescription,
}: LoginFormProps) {
	const emailId = useId();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const isTauri =
		typeof window !== "undefined" &&
		"__TAURI__" in window &&
		window.__TAURI__ !== undefined;

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-md">
			<div className="text-center mb-6">
				{/* ライトモード用ロゴ */}
				<Image
					src="/images/fal-logo-light.svg"
					alt="For All Learners"
					width={120}
					height={120}
					className="mx-auto block dark:hidden"
				/>
				{/* ダークモード用ロゴ */}
				<Image
					src="/images/fal-logo-dark.svg"
					alt="For All Learners"
					width={160}
					height={160}
					className="mx-auto hidden dark:block"
				/>

				<h1 className="text-2xl text-gray-800 dark:text-gray-200 font-semibold mt-4">
					アカウントにログイン
				</h1>
				<p className="text-sm text-muted-foreground mt-2">
					お好みの方法でログインして学習を始めましょう
				</p>
			</div>

			{/* Magic Link 送信完了メッセージ */}
			{message === "magic_link_sent" && (
				<div
					className="mb-4 p-3 rounded-md bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-sm"
					role="alert"
				>
					指定されたメールアドレスにログインリンクを送信しました。メールを確認してください。
				</div>
			)}
			{/* エラーメッセージ */}
			{error && (
				<div
					className="mb-4 p-3 rounded-md bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-sm"
					role="alert"
				>
					エラーが発生しました: {errorDescription || error}
				</div>
			)}

			{/* Magic Link ログインフォーム */}
			{isTauri ? (
				<form
					onSubmit={async (e) => {
						e.preventDefault();
						setIsSubmitting(true);
						const formData = new FormData(e.currentTarget);
						const email = formData.get("email") as string;
						if (!email) {
							alert("メールアドレスを入力してください");
							setIsSubmitting(false);
							return;
						}
						try {
							await loginWithMagicLinkTauri(email);
							window.location.href = "/auth/login?message=magic_link_sent";
						} catch (err) {
							alert(
								err instanceof Error ? err.message : "エラーが発生しました",
							);
							setIsSubmitting(false);
						}
					}}
					className="grid gap-4 mb-6"
				>
					<div>
						<Label htmlFor={emailId} className="sr-only">
							メールアドレス
						</Label>
						<Input
							type="email"
							name="email"
							id={emailId}
							placeholder="メールアドレス"
							required
							className="w-full"
							disabled={isSubmitting}
						/>
					</div>
					<Button type="submit" variant="default" disabled={isSubmitting}>
						<Mail className="mr-2 h-4 w-4" />
						メールアドレスでログイン
					</Button>
				</form>
			) : (
				<form action={loginWithMagicLink} className="grid gap-4 mb-6">
					<div>
						<Label htmlFor={emailId} className="sr-only">
							メールアドレス
						</Label>
						<Input
							type="email"
							name="email"
							id={emailId}
							placeholder="メールアドレス"
							required
							className="w-full"
						/>
					</div>
					<Button type="submit" variant="default">
						<Mail className="mr-2 h-4 w-4" />
						メールアドレスでログイン
					</Button>
				</form>
			)}

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
			{isTauri ? (
				<form
					onSubmit={async (e) => {
						e.preventDefault();
						setIsSubmitting(true);
						try {
							await loginWithGoogleTauri();
						} catch (err) {
							alert(
								err instanceof Error ? err.message : "エラーが発生しました",
							);
							setIsSubmitting(false);
						}
					}}
					className="grid gap-6"
				>
					<Button type="submit" variant="outline" disabled={isSubmitting}>
						<Image
							src="/images/google-logo.svg"
							alt="Google Logo"
							width={20}
							height={20}
							className="mr-2"
						/>
						<span>Googleでログイン</span>
					</Button>
				</form>
			) : (
				<form action={loginWithGoogle} className="grid gap-6">
					<Button type="submit" variant="outline">
						<Image
							src="/images/google-logo.svg"
							alt="Google Logo"
							width={20}
							height={20}
							className="mr-2"
						/>
						<span>Googleでログイン</span>
					</Button>
				</form>
			)}
		</div>
	);
}
