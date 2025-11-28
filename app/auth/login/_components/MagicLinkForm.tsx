"use client";

import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithMagicLinkTauri } from "@/lib/auth/tauri-magic-link";
import { createClient } from "@/lib/supabase/client";

interface MagicLinkFormProps {
	isTauri: boolean;
	isSubmitting: boolean;
	onSubmittingChange: (submitting: boolean) => void;
}

/**
 * Magic Link認証フォームコンポーネント
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/auth/login/_components/LoginForm.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ @/lib/auth/tauri-magic-link
 *   ├─ @/lib/supabase/client
 *   ├─ @/components/ui/button
 *   ├─ @/components/ui/input
 *   ├─ @/components/ui/label
 *   └─ sonner
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */
export function MagicLinkForm({
	isTauri,
	isSubmitting,
	onSubmittingChange,
}: MagicLinkFormProps) {
	const t = useTranslations("auth");
	const emailId = useId();

	if (isTauri) {
		return (
			<form
				onSubmit={async (e) => {
					e.preventDefault();
					onSubmittingChange(true);
					const formData = new FormData(e.currentTarget);
					const email = formData.get("email") as string;
					// HTML5のrequired属性で検証されるため、JS検証は不要
					try {
						await loginWithMagicLinkTauri(email);
						toast.success(t("authEmailSent"));
						// フォームをリセット
						e.currentTarget.reset();
						onSubmittingChange(false);
						window.location.href = "/auth/login?message=magic_link_sent";
					} catch (err) {
						toast.error(
							err instanceof Error ? err.message : t("errorOccurred"),
						);
						onSubmittingChange(false);
					}
				}}
				className="grid gap-4 mb-6"
				suppressHydrationWarning
			>
				<div>
					<Label htmlFor={emailId} className="sr-only">
						{t("emailLabel")}
					</Label>
					<Input
						type="email"
						name="email"
						id={emailId}
						placeholder={t("emailPlaceholder")}
						required
						className="w-full"
						disabled={isSubmitting}
					/>
				</div>
				<Button type="submit" variant="default" disabled={isSubmitting}>
					<Mail className="mr-2 h-4 w-4" />
					{t("loginWithEmail")}
				</Button>
			</form>
		);
	}

	return (
		<form
			onSubmit={async (e) => {
				e.preventDefault();
				const formData = new FormData(e.currentTarget);
				const email = formData.get("email") as string;
				try {
					const supabase = createClient();
					const { error } = await supabase.auth.signInWithOtp({
						email,
						options: {
							emailRedirectTo: `${window.location.origin}/auth/callback`,
						},
					});
					if (error) {
						toast.error(`${t("emailAuthFailed")}: ${error.message}`);
					} else {
						toast.success(t("authEmailSent"));
						e.currentTarget.reset();
					}
				} catch (err) {
					toast.error(err instanceof Error ? err.message : t("errorOccurred"));
				}
			}}
			className="grid gap-4 mb-6"
		>
			<div>
				<Label htmlFor={emailId} className="sr-only">
					{t("emailLabel")}
				</Label>
				<Input
					type="email"
					name="email"
					id={emailId}
					placeholder={t("emailPlaceholder")}
					required
					className="w-full"
				/>
			</div>
			<Button type="submit" variant="default">
				<Mail className="mr-2 h-4 w-4" />
				{t("loginWithEmail")}
			</Button>
		</form>
	);
}
