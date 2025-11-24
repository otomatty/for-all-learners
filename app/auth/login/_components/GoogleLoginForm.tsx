"use client";

import Image from "next/image";
import { toast } from "sonner";
import { loginWithGoogle } from "@/app/_actions/auth";
import { Button } from "@/components/ui/button";
import { loginWithGoogleTauri } from "@/lib/auth/tauri-login";

interface GoogleLoginFormProps {
	isTauri: boolean;
	isSubmitting: boolean;
	onSubmittingChange: (submitting: boolean) => void;
}

/**
 * Google OAuth認証フォームコンポーネント
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/auth/login/_components/LoginForm.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ @/app/_actions/auth
 *   ├─ @/lib/auth/tauri-login
 *   ├─ @/components/ui/button
 *   └─ sonner
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */
export function GoogleLoginForm({
	isTauri,
	isSubmitting,
	onSubmittingChange,
}: GoogleLoginFormProps) {
	if (isTauri) {
		return (
			<form
				onSubmit={async (e) => {
					e.preventDefault();
					onSubmittingChange(true);
					try {
						await loginWithGoogleTauri();
						toast.success("認証ページを開きました");
					} catch (err) {
						const errorMessage =
							err instanceof Error
								? err.message
								: typeof err === "string"
									? err
									: "エラーが発生しました";
						toast.error(errorMessage);
						onSubmittingChange(false);
					}
				}}
				className="grid gap-6"
				suppressHydrationWarning
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
		);
	}

	return (
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
	);
}
