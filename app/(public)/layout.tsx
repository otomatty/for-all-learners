import type React from "react";
import { version } from "../../package.json";
import { UnauthHeader } from "@/components/unauth-header";

export default function PublicLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen flex flex-col">
			<UnauthHeader version={version} />

			<main>{children}</main>
			<footer className="bg-white py-6 border-t">
				<div className="container mx-auto text-center text-gray-500">
					&copy; {new Date().getFullYear()} 資格学習支援アプリ ForAllLearners
				</div>
			</footer>
		</div>
	);
}
