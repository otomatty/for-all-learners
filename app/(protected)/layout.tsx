import type React from "react";
import { AuthHeader } from "@/components/auth-header";
import { Container } from "@/components/container";

interface ProtectedLayoutProps {
	children: React.ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
	return (
		<>
			<AuthHeader />
			<Container>{children}</Container>
		</>
	);
}
