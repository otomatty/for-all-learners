"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { isTauri } from "@/lib/utils/environment";
import { GoogleLoginForm } from "./GoogleLoginForm";
import { MagicLinkForm } from "./MagicLinkForm";

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
	const t = useTranslations("auth");
	const [isSubmitting, setIsSubmitting] = useState(false);
	// Tauri環境判定をクライアント側でのみ実行（ハイドレーション不一致を防ぐ）
	// サーバー側では false を返し、クライアント側で実際の値を設定
	const [tauriEnv, setTauriEnv] = useState(false);

	useEffect(() => {
		// クライアント側でのみ実行
		setTauriEnv(isTauri());
	}, []);

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
					{t("loginTitle")}
				</h1>
				<p className="text-sm text-muted-foreground mt-2">
					{t("loginSubtitle")}
				</p>
			</div>

			{/* Magic Link 送信完了メッセージ */}
			{message === "magic_link_sent" && (
				<div
					className="mb-4 p-3 rounded-md bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-sm"
					role="alert"
				>
					{t("magicLinkSent")}
				</div>
			)}
			{/* エラーメッセージ */}
			{error && (
				<div
					className="mb-4 p-3 rounded-md bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-sm"
					role="alert"
				>
					{t("errorOccurred")}: {errorDescription || error}
				</div>
			)}

			{/* Magic Link ログインフォーム */}
			<MagicLinkForm
				isTauri={tauriEnv}
				isSubmitting={isSubmitting}
				onSubmittingChange={setIsSubmitting}
			/>

			<div className="relative mb-6">
				<div className="absolute inset-0 flex items-center">
					<span className="w-full border-t" />
				</div>
				<div className="relative flex justify-center text-xs uppercase">
					<span className="bg-white dark:bg-gray-800 px-2 text-muted-foreground">
						{t("or")}
					</span>
				</div>
			</div>

			{/* Google ログインフォーム */}
			<GoogleLoginForm
				isTauri={tauriEnv}
				isSubmitting={isSubmitting}
				onSubmittingChange={setIsSubmitting}
			/>
		</div>
	);
}
