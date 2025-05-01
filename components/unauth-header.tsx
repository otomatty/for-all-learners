"use client";

import Link from "next/link";
import { BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function UnauthHeader() {
	return (
		<header className="sticky top-0 z-50 bg-background bg-opacity-80 backdrop-blur-md border-b">
			<div className="container mx-auto flex items-center justify-between py-4 px-6">
				<Link href="/" className="flex items-center space-x-2">
					<BrainCircuit className="w-8 h-8 text-indigo-600" />
					<span className="text-xl font-extrabold text-gray-800">F.A.L.</span>
				</Link>
				<div className="flex items-center space-x-4">
					<ThemeToggle />
					<Button asChild variant="outline">
						<Link href="/auth/login">Googleログイン</Link>
					</Button>
				</div>
			</div>
		</header>
	);
}
