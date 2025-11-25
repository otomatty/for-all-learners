"use client";

import { UnauthHeader } from "@/components/auth/UnauthHeader";
import { AppFooter } from "@/components/layouts/AppFooter";
import { useAuth } from "@/lib/hooks/use-auth";
import pkg from "../../package.json";

const version = pkg.version;

/**
 * Client Public Layout
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(public)/layout.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/hooks/use-auth.ts
 *   ├─ components/auth/UnauthHeader.tsx
 *   └─ components/layouts/AppFooter.tsx
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20250124_01_static-export-client-side-auth-implementation-plan.md
 */
export function ClientPublicLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { user } = useAuth();

	return (
		<div className="min-h-screen flex flex-col">
			<UnauthHeader version={version} isAuthenticated={!!user} />
			<main>{children}</main>
			<AppFooter version={version} appName="For All Learners" />
		</div>
	);
}
