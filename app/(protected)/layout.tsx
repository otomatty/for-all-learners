import type React from "react";
import { AuthHeader } from "@/components/auth-header";
import { Container } from "@/components/container";
import { version } from "../../package.json";

interface ProtectedLayoutProps {
	children: React.ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
	return (
		<>
			<AuthHeader version={version} />
			<Container>{children}</Container>
		</>
	);
}
