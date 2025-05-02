import type React from "react";
import { AuthHeader } from "@/components/auth-header";
import { Container } from "@/components/container";
import { version } from "../../package.json";
import { isAdmin } from "@/app/_actions/admin";
import { navItems } from "./navItems";

interface ProtectedLayoutProps {
	children: React.ReactNode;
}

export default async function ProtectedLayout({
	children,
}: ProtectedLayoutProps) {
	const admin = await isAdmin();

	return (
		<>
			<AuthHeader version={version} isAdmin={admin} appNavItems={navItems} />
			<Container>{children}</Container>
		</>
	);
}
