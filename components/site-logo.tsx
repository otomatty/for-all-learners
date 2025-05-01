"use client";

import Link from "next/link";
import { BrainCircuit } from "lucide-react";

export function Logo() {
	return (
		<Link href="/" className="mr-6 flex items-center space-x-2">
			<BrainCircuit className="h-6 w-6" />
			<span className="font-bold">F.A.L.</span>
		</Link>
	);
}
