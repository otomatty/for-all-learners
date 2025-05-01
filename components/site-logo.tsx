"use client";

import Link from "next/link";
import { BrainCircuit } from "lucide-react";

interface LogoProps {
	version?: string;
}

export function Logo({ version }: LogoProps) {
	return (
		<Link href="/" className="mr-6 flex items-center space-x-2">
			<BrainCircuit className="h-6 w-6" />
			<span className="font-bold">F.A.L.</span>
			{version && (
				<span className="text-xs text-gray-500 select-none">v{version}</span>
			)}
		</Link>
	);
}
