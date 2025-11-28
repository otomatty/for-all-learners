"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { UnauthHeader } from "@/components/auth/UnauthHeader";
import { useAuth } from "@/lib/hooks/use-auth";
import pkg from "../../../../package.json";
import { LoginForm } from "./LoginForm";

const version = pkg.version;

/**
 * Login Page Client Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/auth/login/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/hooks/use-auth.ts
 *   ├─ components/auth/UnauthHeader.tsx
 *   └─ components/auth/login/_components/LoginForm.tsx
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20250124_01_static-export-client-side-auth-implementation-plan.md
 */
export function LoginPageClient({
	message: messageProp,
	error: errorProp,
	errorDescription: errorDescriptionProp,
}: {
	message?: string;
	error?: string;
	errorDescription?: string;
} = {}) {
	const searchParams = useSearchParams();
	const { user, loading } = useAuth();
	const router = useRouter();

	// URLパラメータから値を取得（静的エクスポート時）
	const message = messageProp ?? searchParams.get("message") ?? undefined;
	const error = errorProp ?? searchParams.get("error") ?? undefined;
	const errorDescription =
		errorDescriptionProp ?? searchParams.get("error_description") ?? undefined;

	useEffect(() => {
		if (!loading && user) {
			router.push("/dashboard");
		}
	}, [user, loading, router]);

	if (loading) {
		return (
			<div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
				<UnauthHeader version={version} />
				<div className="flex flex-1 items-center justify-center px-4">
					<div className="text-muted-foreground">読み込み中...</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
			<UnauthHeader version={version} />

			<div className="flex flex-1 items-center justify-center px-4">
				<LoginForm
					message={message}
					error={error}
					errorDescription={errorDescription}
				/>
			</div>
		</div>
	);
}
